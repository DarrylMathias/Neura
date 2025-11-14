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
import { createActionAgent } from "@/agents/ActionAgent";
import { AgentState } from "@/types/AgentState";
import { bounceKey } from "@/helpers/keyBounce";

export const maxDuration = 30;

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
  const lastMsg = modalMsgs.at(-1);
  let lastMessage = "";
  if (lastMsg) {
    const c = lastMsg.content;
    if (Array.isArray(c)) {
      const firstTextPart = c.find(
        (p) => typeof p !== "string" && (p as any).type === "text"
      );
      if (
        firstTextPart &&
        typeof firstTextPart !== "string" &&
        "text" in firstTextPart
      ) {
        lastMessage = (firstTextPart as any).text;
      } else {
        const firstStringPart = c.find((p) => typeof p === "string") as
          | string
          | undefined;
        lastMessage = firstStringPart ?? "";
      }
    } else if (typeof c === "string") {
      lastMessage = c;
    } else if (c && typeof c === "object" && "text" in c) {
      lastMessage = (c as any).text;
    }
  }
  const formattedHistory = modalMsgs
    .map((msg) => {
      const content = Array.isArray(msg.content)
        ? msg.content.map((c) => (c.type === "text" ? c.text : "")).join(" ")
        : msg.content;
      return `${msg.role}: ${content}`;
    })
    .join("\n");

  try {
    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        const state: AgentState = {};

        const { isAuthenticated, redirectToSignIn, userId } = await auth();
        if (!isAuthenticated) {
          redirectToSignIn();
          return;
        }

        const { safeRun, streamingModel } = await bounceKey(
          userId!,
          writer,
          state
        );

        // 1: Orchestrator
        await safeRun("Orchestrator", "generate", async (modelWithMemory) => {
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

        await safeRun("InteractionAgent", "stream", async () => {
          const intAgent = await createInteractionAgent(
            streamingModel,
            state,
            location,
            "plan"
          );
          const result = intAgent.stream({ messages: modalMsgs });
          writer.merge(result.toUIMessageStream());
        });

        // 2: Context Agent
        if (agents?.agentsToUse?.includes("ContextAgent")) {
          await safeRun("ContextAgent", "generate", async (modelWithMemory) => {
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
          await safeRun("DataAgent", "generate", async (modelWithMemory) => {
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
          await safeRun(
            "ReasoningAgent",
            "generate",
            async (modelWithMemory) => {
              const reasoningAgent = await createReasoningAgent(
                modelWithMemory
              );
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
            }
          );
        }

        // Action Agent
        if (agents?.agentsToUse?.includes("ActionAgent")) {
          await safeRun("ActionAgent", "stream", async () => {
            const actionAgent = await createActionAgent(streamingModel);
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

        await safeRun("InteractionAgent", "stream", async () => {
          const intAgent = await createInteractionAgent(
            streamingModel,
            state,
            location
          );
          const result = intAgent.stream({ messages: modalMsgs });
          writer.merge(result.toUIMessageStream());
        });
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
