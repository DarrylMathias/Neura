import { tool } from "ai";
import z from "zod";
import axios from "axios";
import "dotenv/config";

async function getLocationCoords(location) {
  try {
    const res = await axios.get(
      `https://nominatim.openstreetmap.org/search?q=${location}&format=jsonv2&addressdetails=1`,
      {
        headers: {
          "User-Agent": "NeuraAgent/1.0 (mathiasndarryl7@gmail.com)",
        },
      }
    );
    if (!res.data || res.data.length === 0) {
      throw new Error(`No geocoding results for ${location}`);
    }
    const data = res.data[0];
    return {
      lat: parseFloat(data.lat),
      lng: parseFloat(data.lon),
    };
  } catch (error) {
    console.error(`Geocoding failed for ${location}:`, error.message);
    return null;
  }
}

export const getRouteWithTraffic = tool({
  description:
    "Gets routes and traffic incidents between two named locations (origin and destination).",
  inputSchema: z.object({
    origin: z.string().describe("The starting location name, e.g., 'Pune'"),
    destination: z
      .string()
      .describe("The destination location name, e.g., 'Mumbai'"),
    modeOfTransportation: z.enum(["car", "bike", "foot"]).default("car"),
  }),
  execute: async ({ origin, destination, modeOfTransportation }) => {
    // Geocode for origin and destination
    const [coord1, coord2] = await Promise.all([
      getLocationCoords(origin),
      getLocationCoords(destination),
    ]);

    if (!coord1)
      return { error: `Could not find coordinates for origin: ${origin}` };
    if (!coord2)
      return {
        error: `Could not find coordinates for destination: ${destination}`,
      };

    // Routing
    const routingPromise = (async () => {
      try {
        const result = await axios.get(
          `http://router.project-osrm.org/route/v1/${modeOfTransportation}/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?geometries=geojson&overview=simplified&alternatives=3`
        );
        const data = result.data;
        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          return { error: `OSRM could not find any routes: ${data.code}` };
        }
        return data.routes.map((route: any) => {
          const coords = route.geometry.coordinates;
          return {
            path: coords.map((coord: number[]) => ({
              lat: coord[1],
              lng: coord[0],
            })),
            distance: route.distance,
            duration: route.duration,
          };
        });
      } catch (e) {
        return { error: "Failed to fetch routes from OSRM." };
      }
    })();

    // Traffic incidents
    const trafficPromise = (async () => {
      try {
        const result = await axios.get(
          `https://api.tomtom.com/traffic/services/5/incidentDetails?fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}&key=${process.env.TOM_TOM_API_KEY}&bbox=${coord1.lat},${coord1.lng},${coord2.lat},${coord2.lng}&language=en-GB&t=1111&timeValidityFilter=present,future`
        );
        return result.data;
      } catch (e) {
        return { error: "Failed to fetch traffic incidents from TomTom." };
      }
    })();

    const [routes, trafficIncidents] = await Promise.all([
      routingPromise,
      trafficPromise,
    ]);
    console.log("TOOL : getRouteWithTraffic");

    return {
      origin: { name: origin, ...coord1 },
      destination: { name: destination, ...coord2 },
      routes,
      trafficIncidents,
    };
  },
});
