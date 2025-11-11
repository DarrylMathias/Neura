import { tool } from "ai";
import z from "zod";
import axios from "axios";

export const routing = tool({
  description: "Returns an object containing, 1) An array of geopoints, 2) The distance of the route in meters 3) The duration of travel in seconds for a route from source to destination",
  inputSchema: z.object({
    modeOfTransportation : z.enum(["car", "bike", "foot"]),
    coord1: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe("The coordinates of the source"),
    coord2: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe("The coordinates of the destination"),
      // overview : z.enum(["full", "simplified", "false"]).optional().default("full").describe("Level of detail in the returned route geometry, WARNING : 'full' may return large payloads, if errors occur try 'simplified' or 'false'"),
  }),
  execute: async ({ modeOfTransportation, coord1, coord2}) => {
    const result = await axios.get(
      `http://router.project-osrm.org/route/v1/${modeOfTransportation}/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?geometries=geojson&overview=simplified&alternatives=3`
    );
    const data = result.data;
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("OSRM could not find a route:", data.code);
      return;
    }
    const coords = data.routes[0].geometry.coordinates;
    const distance = data.routes[0].distance
    const duration = data.routes[0].duration
    const path = coords.map((coord: number[]) => ({
      lat: coord[1],
      lng: coord[0],
    }));
    return {path, distance, duration};
  },
});
