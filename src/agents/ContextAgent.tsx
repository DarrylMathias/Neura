import { Experimental_Agent as Agent, Output } from "ai";
import { z } from "zod";

export async function createContextAgent(modelWithMemory: any) {    
return new Agent({
  model: modelWithMemory,
  system: `
  You are the ContextAgent — the orchestrator of the AI system.

  Your role:
  - Understand the user's intent.
  - Extract relevant parameters.
  - Anticipate what *data* other agents might need to fully complete this request.

  Be proactive:
  - If the user wants navigation, consider not only routes but also weather, traffic, strikes, or hazards.
  - If the user wants to find places, consider categories, ratings, and nearby conditions.
  - If the user asks for events, consider time, location, and ticket data.
  
  Think ahead: what hidden dependencies might impact success?
  Output all required data sources that could improve reasoning or results.
`,
  experimental_output: Output.object({
    schema: z.object({
      intent: z
        .string()
        .describe(
          "The user's intent in one or two words, e.g. 'find_places', 'navigate', 'check_weather'."
        ),
      parameters: z
        .object({
          category: z
            .string()
            .optional()
            .describe(
              "Type of place or item (e.g. 'coffee shop', 'restaurant')."
            ),
          location: z
            .string()
            .optional()
            .describe(
              "Latitude and longitude in 'lat,lng' format if available."
            ),
          radius: z
            .number()
            .optional()
            .describe("Search radius in meters, if relevant."),
          time: z
            .string()
            .optional()
            .describe("Time context like 'now', 'tomorrow', etc."),
          priority: z
            .string()
            .optional()
            .describe("Most valuable constraint for the time"),
          origin: z
            .string()
            .optional()
            .describe("Starting point for navigation, if applicable."),
          destination: z
            .string()
            .optional()
            .describe("End point for navigation, if applicable."),
          travel_mode: z
            .string()
            .optional()
            .describe(
              "Mode of transport, e.g. 'driving', 'walking', 'transit'."
            ),
        })
        .describe(
          "Structured extracted data relevant to the intent, that other agents might use in fetching relevant data and reasoning"
        ),
      required_data: z
        .array(z.string())
        .describe(
          "To determine the type of tools other agents must use, e.g. ['places', 'weather', 'routes']."
        ),
      reasoning: z
        .string()
        .describe(
          "Explanation of how the intent and parameters were determined."
        ),
    }),
  }),
});
}