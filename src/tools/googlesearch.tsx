import { GoogleCustomSearchClient } from "@deepagent/google-custom-search";
import { tool } from "ai";
import z from "zod";

export const googlesearch = tool({
  description:
    "Search the web using Google Custom Search to get real time data",
  inputSchema: z.object({
    query: z.string().describe("The query to search for in the search engine"),
  }),
  execute: async ({ query }) => {
    const googleCustomSearch = new GoogleCustomSearchClient();
    console.log('Google search tool called');
    const results = await googleCustomSearch.search(query);
    console.log("TOOL : googlesearch");

    return results;
  },
});
