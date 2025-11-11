import { tool } from "ai";
import z from "zod";
import axios from "axios";
import "dotenv/config";

export const nearbyPlaces = tool({
  description:
    "Find the nearest Places of Interest near a coordinate for a particular query",
  inputSchema: z.object({
    radius: z
      .number()
      .min(1000)
      .max(1000000)
      .default(10000)
      .describe("The radius within which the POI has to be searched in meters"),
    coord: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe("The coordinates near which POI has to be found"),
    query: z
      .string()
      .describe(
        "The three or less words short query on which the fuzzy search is to be performed (Eg. 'coffee%20shops') "
      ),
  }),
  execute: async ({ radius, coord, query }) => {
    const result = await axios.get(
      `https://api.tomtom.com/search/2/search/${query.replace(
        / /g,
        "%20"
      )}.json?key=${process.env.TOM_TOM_API_KEY}&typeahead=true&lat=${
        coord.lat
      }&lon=${coord.lng}&radius=${radius}`
    );
    const data = result.data;
    console.log('Nearby Places tool called');
    return data;
  },
});
