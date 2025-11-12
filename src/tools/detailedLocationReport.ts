// new tool: detailedLocationReport.ts
import { tool } from "ai";
import z from "zod";
import axios from "axios";
import { WeatherClient } from "@deepagent/weather";
import "dotenv/config";

export const getDetailedLocationReport = tool({
  description:
    "Get a comprehensive report for a location, including its coordinates and geocode, weather, and traffic flow, which encompasses nature of the flow of traffic near a coordinate with data like the speed of traffic, whether there are road closures",
  inputSchema: z.object({
    location: z
      .string()
      .describe("The name of the place, e.g., 'Pune' or 'Eiffel Tower'"),
    zoom: z
          .number()
          .min(0)
          .max(22)
          .default(12)
          .describe("Zoom factor, default is 12"),
  }),
  execute: async ({ location, zoom }) => {
    try {
      // Geocoding
      const geoRes = await axios.get(
        `https://nominatim.openstreetmap.org/search?q=${location}&format=jsonv2&addressdetails=1&limit=1`
      );
      if (!geoRes.data || geoRes.data.length === 0) {
        return { error: `Could not find geocoding for ${location}` };
      }
      const geoData = geoRes.data[0];
      const coords = {
        lat: parseFloat(geoData.lat),
        lng: parseFloat(geoData.lon),
      };

      // Weather
      const weatherPromise = (async () => {
        try {
          const weatherClient = new WeatherClient();
          const res = await weatherClient.getCurrentWeather(location);
          return {
            location: res.location,
            temperature: res.current.temp_c,
            conditions: res.current.condition,
            humidity: res.current.humidity,
            windSpeed: res.current.wind_kph,
            lastUpdated: res.current.last_updated,
            precip_mm: res.current.precip_mm,
            pressure_mb: res.current.pressure_mb,
            uv: res.current.uv,
            vis_km: res.current.vis_km,
          };
        } catch (weatherError) {
          console.error("Weather sub-call failed:", weatherError);
          return { error: "Failed to get weather." };
        }
      })();

      // Traffic Flow
      const trafficPromise = (async () => {
        try {
          const trafficRes = await axios.get(
            `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json?key=${process.env.TOM_TOM_API_KEY}&point=${coords.lat},${coords.lng}`
          );
          const data = trafficRes.data;
          console.log("Traffic flow tool called");
          return data;
        } catch (trafficError) {
          console.error("Traffic sub-call failed:", trafficError);
          return { error: "Failed to get traffic." };
        }
      })();

      const [weatherResult, trafficResult] = await Promise.all([
        weatherPromise,
        trafficPromise,
      ]);

      return {
        locationName: location,
        coordinates: coords,
        address: geoData.address,
        weather: weatherResult,
        traffic: trafficResult,
      };
    } catch (error) {
      console.error("Detailed report failed:", error);
      return { error: "Failed to generate detailed report." };
    }
  },
});
