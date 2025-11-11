import { tool } from "ai";
import { z } from "zod";

export const setMapView = tool({
  description: "Sets the map's center and zoom level.",
  inputSchema: z.object({
    center: z
      .object({ lat: z.number(), lng: z.number() })
      .describe("lat, lng coordinates"),
    zoom: z.number().min(1).max(20).describe("Zoom level, e.g., 13"),
    animate: z.boolean().default(true).describe("Use leaflet's 'flyTo' animation"),
  }),
  execute: async ({ center, zoom, animate }) => {
    // Pass the view data to the client
    return {
      tool: "setMapView",
      status: "success",
      data: { center, zoom, animate },
    };
  },
});
