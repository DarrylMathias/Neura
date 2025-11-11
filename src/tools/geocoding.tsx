import { tool } from "ai";
import z from "zod";
import axios from "axios";

export const geocoding = tool({
  description: "Get the geocode for a location",
  inputSchema: z.object({
    location: z
      .string()
      .describe("The name of the place to get the geocode for "),
  }),
  execute: async ({ location }) => {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${location}&format=jsonv2&addressdetails=1`
    );
    console.log('Geocoding tool called');
    return res.data;
  },
});
