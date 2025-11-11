import { tool } from "ai";
import { z } from "zod";

export const updateMarkers = tool({
  description: "Display or update a set of markers on the map.",
  inputSchema: z.object({
    markers: z.array(
      z.object({
        id: z.string().describe("Unique ID for this marker"),
        position: z
          .object({ lat: z.number(), lng: z.number() })
          .describe("lat, lng coordinates"),
        label: z.string().optional().describe("Short text for the marker"),
        popup: z
          .string()
          .optional()
          .describe("Longer HTML content for a click-popup"),
      })
    ),
  }),
  execute: async ({ markers }) => {
    return {
      tool: "updateMarkers",
      status: "success",
      data: markers,
    };
  },
});
