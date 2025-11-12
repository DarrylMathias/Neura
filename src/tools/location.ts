import { tool } from "ai";
import z from "zod";
import axios from "axios";

export const currentLocation = tool({
  description: "Get the user's current city, region, and country based on IP",
  inputSchema: z.object({}),
  execute: async () => {
    try {
      const res = await axios.get("https://ipapi.co/json/");
      const data = await res.data;
      console.log("Location tool called");
      const { city, region, country_name } = data;
      return { city, region, country: country_name };
    } catch (error) {
      return { city: "Unknown", region: "Unknown", country: "Unknown" };
    }
  },
});