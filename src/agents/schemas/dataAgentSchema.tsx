import z from "zod";

const routeObject = z.object({
  id: z.string().describe("Provide an id for the reasoning agent to select from"),
  startPlace: z.string().describe("The friendly name of the starting place"),
  startCoord: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
  endPlace: z.string().describe("The friendly name of the destination place"),
  endCoord: z.object({
    lat: z.number(),
    lon: z.number(),
  }),
  distance: z.string().describe("The distance the route takes"),
  duration: z.string().describe("The duration of travel the route will take"),
  trafficData: z.object({
    roadsBlocked: z.array(
      z.object({
        from: z.string(),
        to: z.string(),
        reason: z.string(),
      })
    ),
    currentSpeed: z.number(),
    currentTravelTime: z.number(),
    misc: z.unknown(),
  }),
});

const placeObject = z.object({
  id: z.string().describe("Provide an id for the reasoning agent to select from"),
  name: z.string(),
  location: z.string(),
  address: z.string(),
  rating: z.number(),
  category: z.string(),
  timeToReach: z.string(),
  distance: z.string(),
});

const infoObject = z.object({
  title: z.string(),
  description: z.string(),
  source: z.string(),
}).describe("External informations that may be necessary");

const otherObject = z.object({
  content: z.string().describe("A string containing any other relevant information"),
});

const baseSchema = z.object({
  conditions: z.object({
    temperature: z.number().optional(),
    alerts: z.array(z.string()).optional(),
    weather: z.string().optional(),
  }),
  meta: z.object({
    sources: z.array(z.string()),
    timestamp: z.string(),
    confidence: z.number().optional(),
  }),
  reasoning: z.string(),
});

const dataAgentSchema = z.discriminatedUnion("type", [
  baseSchema.extend({
    type: z.literal("route"),
    data: z.array(routeObject),
  }),
  baseSchema.extend({
    type: z.literal("place"),
    data: z.array(placeObject),
  }),
  baseSchema.extend({
    type: z.literal("info"),
    data: z.array(infoObject),
  }),
  baseSchema.extend({
    type: z.literal("other"),
    data: z.array(otherObject),
  }),
]);

export {dataAgentSchema};