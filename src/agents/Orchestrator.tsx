import { google } from "@ai-sdk/google";
import { Experimental_Agent as Agent, Output } from "ai";
import { z } from "zod";

const allowedAgents = [
  "ContextAgent",
  "DataAgent",
  "ReasoningAgent",
  "ActionAgent",
] as const;

export const orchestrator = new Agent({
  model: google("gemini-2.5-flash"),
  system: `
      You are the Orchestrator — the orchestrator of the system.
      Your role is to interpret the user's intent and determine which of the following agents are needed:
      - ContextAgent: understands what the user wants.
      - DataAgent: gathers relevant real-time data.
      - ReasoningAgent: analyzes all data and decides the best route.
      - ActionAgent: executes the plan (renders map).

      Only choose from these agents. Do not invent new ones.
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
