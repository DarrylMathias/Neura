import { google } from "@ai-sdk/google";
import { Experimental_Agent as Agent, stepCountIs } from "ai";

interface AgentState {
  context?: any;
  data?: any;
  reasoning?: any;
  action?: any;
  summary?: string;
}

export function createInteractionAgent(model: string, state: AgentState) {
  return new Agent({
    model: google(model),
    system: `
      You are the InteractionAgent — the final layer of a multi-agent system.

      You receive user messages plus optional outputs from:
      • ContextAgent (intent & goal)
      • DataAgent (fetched info)
      • ReasoningAgent (logic & insights)
      • ActionAgent (final steps)

      Agent State: ${JSON.stringify(state, null, 2)}

      If the user's message relates to the same topic:
        → Summarize what each agent contributed and give a clear, natural answer.
      If it's unrelated:
        → Respond normally as a smart, conversational assistant.

      Be concise, friendly, and avoid technical jargon or JSON in replies.
    `,
    stopWhen: stepCountIs(10),
  });
}
