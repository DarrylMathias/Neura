import { Experimental_Agent as Agent, Output } from "ai";
import { z } from "zod";

const allowedAgents = [
  "ContextAgent",
  "DataAgent",
  "ReasoningAgent",
  "ActionAgent",
] as const;

export async function createOrchestrator(modelWithMemory: any) {
return new Agent({
  model : modelWithMemory,
  system: `
      You are the Orchestrator — the orchestrator of the application which is an agentic map.
      Your role is to interpret the user's intent and determine which of the following agents are needed:
      - ContextAgent: understands what the user wants.
      - DataAgent: gathers relevant real-time data.
      - ReasoningAgent: analyzes all data and decides the best route.
      - ActionAgent: executes the plan (renders map). 

      Only choose from these agents. Do not invent new ones.
      Choose agents only if required. For any non navigation purposes, don't use them.
      NOTE : The Data Agent is a resource heavy agent, dont call it unless the purpose of the prompt changes substantially.
      Also call the context agent to understand contexts regarding only the main purpose of the application only.
    `,
  experimental_output: Output.object({
    schema: z.object({
      agentsToUse: z
        .array(z.enum(allowedAgents))
        .describe(
          "List of agents to engage from the core set, in proper order"
        ),
      reasoning: z
        .string()
        .describe("Explanation of why these agents are needed."),
    }),
  }),
});
}