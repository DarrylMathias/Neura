import {
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { createOrchestrator } from "@/agents/Orchestrator";
import { createContextAgent } from "@/agents/ContextAgent";
import { createInteractionAgent } from "@/agents/InteractionAgent";
import { MyUIMessage } from "@/types/types";
import { createDataAgent } from "@/agents/DataAgent";
import { jsonAgent } from "@/agents/JSONAgent";
import { dataAgentSchema } from "@/agents/schemas/dataAgentSchema";
import { createReasoningAgent } from "@/agents/ReasoningAgent";
import { auth } from "@clerk/nextjs/server";
import { google } from "@ai-sdk/google";
import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { createActionAgent } from "@/agents/ActionAgent";

export const maxDuration = 30;

interface AgentState {
  id?: number;
  orchestrator?: any;
  context?: any;
  data?: any;
  reasoning?: any;
  action?: any;
  summary?: string;
  errors?: string;
}

const knowledgeBase: AgentState[] = [];

export async function POST(req: Request) {
  const {
    messages,
    model,
    location,
  }: {
    messages: UIMessage[];
    model: string;
    location: { latitude: number; longitude: number };
  } = await req.json();

  const modalMsgs = convertToModelMessages(messages);
  const lastMessage = modalMsgs.at(-1)?.content?.[0]?.text || "";
  const formattedHistory = modalMsgs
    .map((msg) => {
      const content = Array.isArray(msg.content)
        ? msg.content.map((c) => (c.type === "text" ? c.text : "")).join(" ")
        : msg.content;
      return `${msg.role}: ${content}`;
    })
    .join("\n");

  try {
    const { isAuthenticated, redirectToSignIn, userId } = await auth();
    let modelWithMemory = google("gemini-2.5-flash");
    if (!isAuthenticated) {
      redirectToSignIn();
    } else {
      modelWithMemory = withSupermemory(google("gemini-2.5-flash"), userId);
    }

    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        const state: AgentState = {};

        const safeRun = async (name: string, fn: () => Promise<void>) => {
          try {
            await fn();
          } catch (err) {
            if (name === "Orchestrator") throw err;
            console.error(`[${name}] Error:`, err);
            const msg =
              err instanceof Error ? err.message : JSON.stringify(err);
            writer.write({
              type: "data-Error",
              data: { agentData: `[${name}] failed:\n\n ${msg}` },
            });
            state.errors = `[${name}] failed:\n\n ${msg}`;
          }
        };

        // 1: Orchestrator
        await safeRun("Orchestrator", async () => {
          const orchestrator = await createOrchestrator(modelWithMemory);
          const { experimental_output: agents } = await orchestrator.generate({
            prompt: `
              User Request: ${lastMessage}
              Full Conversation History:
              ${formattedHistory}

              Based on the user's intent, respond with:
              1. agentsToUse — which core agents should handle this request
              2. reasoning — short explanation of your selections
            `,
          });
          state.orchestrator = agents;
          writer.write({
            type: "data-Orchestrator",
            data: {
              agentData: state.orchestrator,
              input: { query: lastMessage },
            },
          });
        });

        const agents = state.orchestrator;

        // Plan : Interaction Agent
        if (agents?.agentsToUse.length > 0) {
          await safeRun("InteractionAgent", async () => {
            const intAgent = await createInteractionAgent(
              modelWithMemory,
              state,
              location,
              "plan"
            );
            const result = intAgent.stream({ messages: modalMsgs });
            writer.merge(result.toUIMessageStream());
          });
        }

        // 2: Context Agent
        if (agents?.agentsToUse?.includes("ContextAgent")) {
          await safeRun("ContextAgent", async () => {
            const contextAgent = await createContextAgent(modelWithMemory);
            const { experimental_output: context } =
              await contextAgent.generate({
                prompt: `
                  User request: ${lastMessage}
                  Full Conversation History:
                  ${formattedHistory}
                  Location: ${JSON.stringify(location)}

                  Parse the user's message into a structured intent object.
                  Identify their goal, extract parameters, and list any required data.
                `,
              });

            state.context = context;
            writer.write({
              type: "data-Context",
              data: { agentData: state.context, input: state.orchestrator },
            });
          });
        }

        // \3: Data Agent
        if (agents?.agentsToUse?.includes("DataAgent")) {
          await safeRun("DataAgent", async () => {
            const dataAgent = await createDataAgent(modelWithMemory);
            const result = await dataAgent.generate({
              prompt: `
                User request: ${lastMessage}
                Full Conversation History:
                ${formattedHistory}
                Context object: ${JSON.stringify(state)}
                Extract all relevant user data as per the intent object.
              `,
            });

            const dataObjectAgent = await jsonAgent(dataAgentSchema);
            const { experimental_output: data } =
              await dataObjectAgent.generate({
                prompt: `
                  Take the following raw data summary and parse it into the
                  required JSON schema accurately.

                  Raw Data:
                  ${
                    typeof result.content === "string"
                      ? result.content
                      : JSON.stringify(result.content)
                  }
                `,
              });

            state.data = data;
            writer.write({
              type: "data-Data",
              data: { agentData: state.data, input: state.context },
            });
          });
        }

        // 4: Reasoning Agent
        if (agents?.agentsToUse?.includes("ReasoningAgent")) {
          const reasoningAgent = await createReasoningAgent(modelWithMemory);
          await safeRun("ReasoningAgent", async () => {
            const { experimental_output: reasoning } =
              await reasoningAgent.generate({
                prompt: `
                  User request: ${lastMessage}
                  Full Conversation History:
                  ${formattedHistory}
                  Context object: ${JSON.stringify(state)}

                  Reason on what options to select from the intent of the user and what seems best for the user.
                `,
              });

            state.reasoning = reasoning;
            writer.write({
              type: "data-Reasoning",
              data: { agentData: state.reasoning, input: state.context },
            });
          });
        }

        // Action Agent
        if (agents?.agentsToUse?.includes("ActionAgent")) {
          const actionAgent = await createActionAgent(modelWithMemory);
          await safeRun("ActionAgent", async () => {
            const result = actionAgent.stream({
              prompt: `
                  User request: ${lastMessage}
                  Full Conversation History:
                  ${formattedHistory}
                  Context object: ${JSON.stringify(state)}

                  Select and execute the necessary UI tool calls to update the map and chat for the user.
                `,
            });
            writer.merge(result.toUIMessageStream());
          });
        }

        await safeRun("InteractionAgent", async () => {
          const intAgent = await createInteractionAgent(
            modelWithMemory,
            state,
            location
          );
          const result = intAgent.stream({ messages: modalMsgs });
          writer.merge(result.toUIMessageStream());
        });
        knowledgeBase.push({ ...state, id: knowledgeBase.length + 1});
      },
    });

    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error("/api/chat FATAL error:", err);
    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        writer.write({
          type: "data-Error",
          data: {
            agentData:
              "A fatal server error occurred while processing your request.",
            input: err instanceof Error ? err.message : String(err),
          },
        });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
