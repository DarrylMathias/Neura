import { tool } from "ai";
import axios from "axios";
import { z } from "zod";

export const updateRoutes = tool({
  description:
    "Updates the state of all routes on the map. Use this to highlight one route and fade others.",
  inputSchema: z.object({
    modeOfTransportation: z.enum(["car", "bike", "foot"]),
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
    overview: z
      .enum(["full", "simplified"])
      .optional()
      .default("full")
      .describe(
        "Type of overview geometry, Keep full for shorter distances and simplified for longer distances"
      ),
  }),
  execute: async ({ modeOfTransportation, coord1, coord2, overview }) => {
    const result = await axios.get(
      `http://router.project-osrm.org/route/v1/${modeOfTransportation}/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?geometries=geojson&overview=${overview}&alternatives=3`
    );
    const data = result.data;
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      console.error("OSRM could not find a route:", data.code);
      return;
    }
    const allRoutes = data.routes.map((route: any, id: number) => {
      const coords = route.geometry.coordinates;
      const distance = route.distance;
      const duration = route.duration;

      const path = coords.map((coord: number[]) => [coord[1], coord[0]]);
      console.log("TOOL : updateRoutes");

      return {
        id: id,
        polyline: path,
        state: id === 0 ? "highlighted" : "faded",
        label: `Distance: ${(distance / 1000).toFixed(2)} km, Duration: ${(
          duration / 60
        ).toFixed(2)} mins`,
      };
    });
    return allRoutes;
  },
});
