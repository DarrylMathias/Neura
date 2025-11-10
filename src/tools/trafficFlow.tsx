import { tool } from "ai";
import z from "zod";
import axios from "axios";
import "dotenv/config";

export const trafficFlow = tool({
  description:
    "Find the nature of the flow of traffic near a coordinate with data like the speed of traffic, whether there are road closures",
  inputSchema: z.object({
    zoom: z
      .number()
      .min(0)
      .max(22)
      .default(12)
      .describe("Zoom factor, default is 12"),
    coord: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe("The coordinates near which traffic data has to be found"),
  }),
  execute: async ({ zoom, coord }) => {
    const result = await axios.get(
      `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json?key=${process.env.TOM_TOM_API_KEY}&point=${coord.lat},${coord.lng}`
    );
    const data = result.data;
    return data;
  },
});
