import { Experimental_Agent as Agent, stepCountIs } from "ai";
import { weather } from "@/tools/weather";
import { googlesearch } from "@/tools/googlesearch";
import { supermemoryTools } from "@supermemory/tools/ai-sdk";

interface AgentState {
  context?: any;
  data?: any;
  reasoning?: any;
  action?: any;
  summary?: string;
  errors?: string;
}

export async function createInteractionAgent(
  modelWithMemory: any,
  state: AgentState,
  location: { latitude: number; longitude: number },
  mode: "plan" | "summary" = "summary"
) {
  return new Agent({
    model: modelWithMemory,
    system: `
      You are Neura’s InteractionAgent — responsible for communicating intelligently with the user.

      Mode: ${mode.toUpperCase()}

      If mode = PLAN:
        • Explain what steps you'll take next based on the orchestrator’s intent.
        • Be clear and confident (“I’ll first fetch…, then analyze…, and finally summarize…”).
        • Do NOT execute tools yet — just describe the plan.

      If mode = SUMMARY:
        • Integrate insights from all agents:
          - ContextAgent → intent and user goals
          - DataAgent → factual information
          - ReasoningAgent → logical outcomes
          - ActionAgent → final actions or suggestions
        • Give a concise, natural answer summarizing what was done.
        • Mention data freshness, if relevant.
        • Avoid technical or JSON-style text.

      You can use Supermemory tools (searchMemories, addMemory) to recall or save conversational context and insights.
      Before summarizing, call 'searchMemories' with the current user intent to see if similar data or results already exist.
      If new insights are generated, call 'addMemory' to persist them.


      Current Agent State:
      ${JSON.stringify(state, null, 2)}

      Current Location: ${JSON.stringify(location, null, 2)}
    `,
    tools: {
      weather,
      googlesearch,
      ...supermemoryTools(process.env.SUPERMEMORY_API_KEY!),
    },
    stopWhen: stepCountIs(10),
  });
}
