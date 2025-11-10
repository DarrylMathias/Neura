import { google } from "@ai-sdk/google";
import { Experimental_Agent as Agent, Output } from "ai";

export function jsonAgent(
  schema : any
) {
return new Agent({
  model: google("gemini-2.5-flash"),
  experimental_output: Output.object({
    schema: schema,
  }),
})
}
