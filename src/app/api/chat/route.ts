import {
  UIMessage,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { orchestrator } from "@/agents/Orchestrator";
import { contextAgent } from "@/agents/ContextAgent";
import { createInteractionAgent } from "@/agents/InteractionAgent";
import { MyUIMessage } from "@/types/types";

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

  const state: AgentState = {};

  try {
    // Orchestrator
    const { experimental_output: agents } = await orchestrator.generate({
      prompt: `
    User Request: ${lastMessage}

    Based on the user's intent, respond with:
    1. agentsToUse — which core agents should handle this request
    2. reasoning — short explanation of your selections
  `,
    });
    state.orchestrator = agents;
    console.log(agents);

    if (agents.agentsToUse.includes("ContextAgent")) {
      const { experimental_output: context } = await contextAgent.generate({
        prompt: `
    User request: ${lastMessage}
    Location : ${JSON.stringify(location)}

    Parse the user's message into a structured intent object.
    Identify their goal, extract parameters, and list any required data.
  `,
      });
      state.context = context;
      console.log(context);
    }

    if (agents.agentsToUse.includes("DataAgent")) {
    }

    if (agents.agentsToUse.includes("ReasoningAgent")) {
    }

    if (agents.agentsToUse.includes("ActionAgent")) {
    }

    const stream = createUIMessageStream<MyUIMessage>({
      execute: async ({ writer }) => {
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
        if (state.context)
          writer.write({
            type: "data-Context",
            data: {
              agentData: state.context,
              input: state.orchestrator,
            },
          });
        if (state.data)
          writer.write({
            type: "data-Data",
            data: {
              agentData: state.data,
            },
          });
        if (state.reasoning)
          writer.write({
            type: "data-Reasoning",
            data: {
              agentData: state.reasoning,
            },
          });
        if (state.action)
          writer.write({
            type: "data-Action",
            data: {
              agentData: state.action,
            },
          });

        const intAgent = await createInteractionAgent(model, state);
        const result = intAgent.stream({ messages: modalMsgs });
        console.log(result);
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
