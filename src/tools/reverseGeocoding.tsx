import { tool } from "ai";
import z from "zod";
import axios from "axios";

export const reverseGeocoding = tool({
  description: "Get the geocode for a location",
  inputSchema: z.object({
    lat: z
      .number()
      .describe("The latitude of the place to get the reverse geocode for "),
    lon: z
      .number()
      .describe("The longitude of the place to get the reverse geocode for "),
  }),
  execute: async ({ lat, lon }) => {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&namedetails=1`,
      {
        headers: {
          "User-Agent": "NeuraAgent/1.0 (mathiasndarryl7@gmail.com)",
        },
      }
    );
    console.log("Reverse geocoding tool called");
    return res.data;
  },
});
