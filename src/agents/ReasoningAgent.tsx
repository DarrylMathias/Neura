import { z } from "zod";
import { Experimental_Agent as Agent, Output } from "ai";
import { google } from "@ai-sdk/google";

const placeObject = z.object({
  decision: z.object({
    action: z.string(),
    selected_items: z.array(
      z.object({
        name: z.string(),
        reason: z.string(),
        address: z.object({ lat: z.number(), lng: z.number() }),
      })
    ),
  }),
  explanation: z.string(),
});

const routeObject = z.object({
  decision: z.object({
    selected_route: z.string(),
    sourceCoords: z.object({ lat: z.number(), lng: z.number() }),
    destinationCoords: z.object({ lat: z.number(), lng: z.number() }),
  }),
  explanation: z.string(),
});

export const ReasoningAgent = new Agent({
  model: google("gemini-2.5-flash"),
  experimental_output: Output.object({
    schema: z.discriminatedUnion("type", [
      z.object({
        type: z.literal("route"),
        data: routeObject,
      }),
      z.object({
        type: z.literal("place"),
        data: placeObject,
      }),
    ]),
  }),
  system: `
        You are the "ReasoningAgent" — the decision maker in a multi-agent system.

        Your job:
        - Take structured data from the DataAgent (intent, collected data, and user context)
        - Analyze it carefully and decide what action should be taken next.
        - Pick or rank items logically.
        - Return a short human-readable explanation.

        Rules:
        - Always return valid JSON.
        - Be concise and logical.
        - Do not invent new data.
`,
});
