import {
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
  // generateObject,
} from "ai";
import { orchestrator } from "@/agents/Orchestrator";
import { contextAgent } from "@/agents/ContextAgent";
import { createInteractionAgent } from "@/agents/InteractionAgent";
import { MyUIMessage } from "@/types/types";
import { dataAgent } from "@/agents/DataAgent";
import { jsonAgent } from "@/agents/JSONAgent";
import { dataAgentSchema } from "@/agents/schemas/dataAgentSchema";
import { ReasoningAgent } from "@/agents/ReasoningAgent";

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

  interface AgentState {
    orchestrator?: any;
    context?: any;
    data?: any;
    reasoning?: any;
    action?: any;
    summary?: string;
  }

  const modalMsgs = convertToModelMessages(messages);
  const lastMessage = modalMsgs[modalMsgs.length - 1]?.content?.[0]?.text || "";
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
        try {
          // Orchestrator
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
          console.log(agents);

          if (state.orchestrator)
            writer.write({
              type: "data-Orchestrator",
              data: {
                agentData: state.orchestrator,
                input: {
                  query: lastMessage,
                },
              },
            });

          // Context Agent
          if (agents.agentsToUse.includes("ContextAgent")) {
            const { experimental_output: context } =
              await contextAgent.generate({
                prompt: `
                  User request: ${lastMessage}
                  Full Conversation History:
                  ${formattedHistory}
                  Location : ${JSON.stringify(location)}

                  Parse the user's message into a structured intent object.
                  Identify their goal, extract parameters, and list any required data.
                `,
              });
            state.context = context;
            console.log(context);

            if (state.context)
              writer.write({
                type: "data-Context",
                data: {
                  agentData: state.context,
                  input: state.orchestrator,
                },
              });
          }

          // Data Agent
          if (agents.agentsToUse.includes("DataAgent")) {
          }
          const result = await dataAgent.generate({
            prompt: `
              Context object  : ${JSON.stringify(state)}
              Extract all the relevant user data as per the intent object provided
            `,
          });

          const dataObjectAgent = await jsonAgent(dataAgentSchema);
          const { experimental_output: data } = await dataObjectAgent.generate({
            prompt: `
              Take the following raw data summary and parse it into the
              required JSON schema. Be extremely accurate.

              Raw Data:
              ${
                result.content
                  ? typeof result.content === "string"
                    ? result.content
                    : JSON.stringify(result.content)
                  : "No data available"
              }
            `,
          });
          state.data = data;
          console.log(data);

          if (state.data)
            writer.write({
              type: "data-Data",
              data: {
                agentData: state.data,
                input: state.context,
              },
            });

          // Reasoning Agent
          if (agents.agentsToUse.includes("ReasoningAgent")) {
            const { experimental_output: reasoning } =
              await ReasoningAgent.generate({
                prompt: `
                  Context object  : ${JSON.stringify(state)}

                  Reason on what options to select from the intent of the user and what seems to be the best choice for the user
                `,
              });
            state.reasoning = reasoning;
            console.log(reasoning);
          }

          if (state.reasoning)
            writer.write({
              type: "data-Reasoning",
              data: {
                agentData: state.reasoning,
                input: state.context,
              },
            });

          // Action agent
          if (agents.agentsToUse.includes("ActionAgent")) {
          }
          if (state.action)
            writer.write({
              type: "data-Action",
              data: {
                agentData: state.action,
                input: state.context,
              },
            });
        } catch (error) {
          console.log(error);
        }

        const intAgent = await createInteractionAgent(model, state, location);
        const result = intAgent.stream({ messages: modalMsgs });
        writer.merge(result.toUIMessageStream());
      },
    });
    return createUIMessageStreamResponse({ stream });
  } catch (err) {
    console.error("/api/chat error:", err);
    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
        const text = err instanceof Error ? err.message : String(err);
        writer.write({ type: "data-Error", data: `Error: ${text}` });
      },
    });
    return createUIMessageStreamResponse({ stream });
  }
}
