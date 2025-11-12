// new tool: findNearbyUser.ts
import { tool } from "ai";
import z from "zod";
import axios from "axios";
import "dotenv/config";

export const findNearbyUser = tool({
  description:
    "Finds places of interest (like 'coffee' or 'ATM') near the USER'S CURRENT LOCATION. The user's location is found automatically.",
  inputSchema: z.object({
    query: z
      .string()
      .describe(
        "The three or less words short query, e.g., 'coffee shops' or 'restaurant'"
      ),
    radius: z
      .number()
      .min(1000)
      .max(50000) 
      .default(5000)
      .describe("The radius to search in meters. Default is 5000m."),
  }),
  execute: async ({ query, radius }) => {
    let userCoords;
    let userLocationInfo;

    // User's Current Location
    try {
      const res = await axios.get("https://ipapi.co/json/");
      const data = res.data;
      userLocationInfo = { city: data.city, region: data.region, country: data.country_name };
      userCoords = { lat: data.latitude, lng: data.longitude };
      
      if (!userCoords.lat || !userCoords.lng) {
         throw new Error("Could not determine latitude/longitude from IP.");
      }
      
    } catch (error) {
      console.error("Failed to get user's IP-based location:", error.message);
      return { error: "Could not determine user's current location." };
    }

    // Nearby Places
    try {
      const result = await axios.get(
        `https://api.tomtom.com/search/2/search/${query.replace(
          / /g,
          "%20"
        )}.json?key=${process.env.TOM_TOM_API_KEY}&typeahead=true&lat=${
          userCoords.lat
        }&lon=${userCoords.lng}&radius=${radius}`
      );
      const data = result.data;
      
      return {
        searchedLocation: userLocationInfo,
        searchQuery: query,
        radiusInMeters: radius,
        foundPlaces: data.results,
      };

    } catch (error) {
      console.error("Failed to get nearby places:", error.message);
      return { error: `Failed to find '${query}' near you.` };
    }
  },
});