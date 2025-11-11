import { tool } from "ai";
import { WeatherClient } from "@deepagent/weather";
import z from "zod";

export const weather = tool({
  description: "Get the weather in a location",
  inputSchema: z.object({
    location: z.string().describe("The location to get the weather for"),
  }),
  execute: async ({ location }) => {
    const weather = new WeatherClient();
    const res = await weather.getCurrentWeather(location);
    console.log("Weather tool called");
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
  },
});
