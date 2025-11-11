import { tool } from "ai";
import { z } from "zod";

export const updateRoutes = tool({
  description:
    "Updates the state of all routes on the map. Use this to highlight one route and fade others.",
  inputSchema: z.object({
    routes: z.array(
      z.object({
        id: z.string().describe("Unique ID for the route (e.g., 'A', 'B')"),
        polyline: z
          .array(
            z
              .object({ lat: z.number(), lng: z.number() })
              .describe("lat, lng coordinates")
          )
          .describe("Array of lat, lng points forming the line"),
        state: z
          .enum(["highlighted", "faded", "normal"])
          .describe("'highlighted' for the recommended, 'faded' for others"),
        label: z.string().optional().describe("e.g., 'Route A: 15 min'"),
      })
    ),
  }),
  execute: async ({ routes }) => {
    return {
      tool: "updateRoutes",
      status: "success",
      data: routes,
    };
  },
});
