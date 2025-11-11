import { geocoding } from "@/tools/geocoding";
import { currentLocation } from "@/tools/location";
import { reverseGeocoding } from "@/tools/reverseGeocoding";
import { routing } from "@/tools/routing";
import { setMapView } from "@/tools/setMapView";
import { updateMarkers } from "@/tools/updateMarkers";
import { updateRoutes } from "@/tools/updateRoutes";
import { Experimental_Agent as Agent, stepCountIs } from "ai";

export const createActionAgent = async (modelWithMemory: any) => {
  return new Agent({
    model: modelWithMemory,
    system: `
    You are the ActionAgent. Your job is to get data and update the UI.

    !! IMPORTANT: You have a strict and limited set of tools. You MUST only call the tools you are given. !!

    --- YOUR AVAILABLE TOOLS ---
    'geocoding': Get coordinates for a place name.
    'reverseGeocoding': Get a place name for coordinates.
    'routing': Get a full route (polyline, duration, distance).
    'updateMarkers': Send markers to the map.
    'updateRoutes': Send a route polyline to the map.
    'setMapView': Set the map's center and zoom.
    DO NOT call any other tools, and also start navigation usually means display the route.
    Your only job is to use the 6 tools listed above based on the data you have.

    ALWAYS WITHOUT FAIL CALL THE ROUTING TOOL TO GET ROUTE DATA BEFORE UPDATING THE UI WITH 'updateRoutes'.

    This is often a two-step process:

    Step 1: DATA FETCHING.
    - Look at the user's request and the current state.
    - If you need new data (like a route polyline, or coordinates for a name), you MUST call a data-fetching tool first (like 'routing', 'geocoding', 'reverseGeocoding').
    - When you call a data-fetching tool, DO NOT call a UI tool (like 'updateRoutes') or send a chat message yet. Just call the data tool and wait for the result.

    Step 2: UI UPDATE & RESPONSE.
    - After a data-fetching tool (like 'routing') returns, you will be run again.
    - **CRITICAL:** Take the data from the previous tool (e.g., the array from 'routing') and pass it *directly* to the corresponding UI tool (e.g., 'updateRoutes').
    - You MUST also generate the final, user-facing chat message explaining what you have done.

    If the 'Context object' already contains all the data you need (e.g., polylines, markers), you can skip Step 1 and go directly to Step 2.
`,
    tools: {
      geocoding,
      reverseGeocoding,
      routing,
      updateMarkers,
      updateRoutes,
      setMapView,
      currentLocation,
    },
    stopWhen: stepCountIs(5),
  });
};
