import { tool } from "ai";
import z from "zod";
import axios from "axios";
import "dotenv/config";

export const trafficIncidentDetails = tool({
  description:
    "Find the traffic incidents that have occured within a geographical boundary (box)",
  inputSchema: z.object({
    modeOfTransportation: z.enum(["car", "bike", "foot"]),
    coord1: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe("The coordinates of the lower-left corner of the boundary box"),
    coord2: z
      .object({
        lat: z.number(),
        lng: z.number(),
      })
      .describe(
        "The coordinates of the upper-right corner of the boundary box"
      ),
  }),
  execute: async ({ coord1, coord2 }) => {
    const result = await axios.get(
      `https://api.tomtom.com/traffic/services/5/incidentDetails?fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}&key=${process.env.TOM_TOM_API_KEY}&bbox=${coord1.lat},${coord1.lng},${coord2.lat},${coord2.lng}&language=en-GB&t=1111&timeValidityFilter=present,future`
    );
    const data = result.data;
    console.log('Traffic Incident tool called');
    return data;
  },
});
