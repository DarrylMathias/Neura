import { GoogleCustomSearchClient } from "@deepagent/google-custom-search";
import { WeatherClient } from "@deepagent/weather";
import axios from "axios";
import { NextResponse } from "next/server";
import "dotenv/config"

export async function GET() {
  const googleCustomSearch = new GoogleCustomSearchClient();
  const weather = new WeatherClient();

  const location = "Boisar";
  const googleQuery = "Weather in boisar";
  const coord = { lat: 18.9582, lng: 72.8321 };
  const radius = 30000;
  const zoom = 8
  const query = "coffee shops";
  const lat = 18.9582;
  const lon = 72.8321;
  const modeOfTransportation = "car";
  const coord1 = { lat: 19.7969, lng: 72.7452 };
  const coord2 = { lat: 19.4564, lng: 72.7925 };


  const geocoding = axios.get(
    `https://nominatim.openstreetmap.org/search?q=${location}&format=jsonv2&addressdetails=1`
  );
  const googleSearch = googleCustomSearch.search(googleQuery);
  const nearbyPlaces = axios.get(
    `https://api.tomtom.com/search/2/search/${query.replace(
      / /g,
      "%20"
    )}.json?key=${process.env.TOM_TOM_API_KEY}&typeahead=true&lat=${
      coord.lat
    }&lon=${coord.lng}&radius=${radius}`
  );
  const reverseGeocoding = axios.get(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=jsonv2&addressdetails=1&namedetails=1`
  );
  const routing = axios.get(
    `http://router.project-osrm.org/route/v1/${modeOfTransportation}/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?geometries=geojson&overview=full&alternatives=3`
  );
  const trafficFlow = axios.get(
    `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/${zoom}/json?key=${process.env.TOM_TOM_API_KEY}&point=${coord.lat},${coord.lng}`
  );
  const trafficIncidentDetails = axios.get(
    `https://api.tomtom.com/traffic/services/5/incidentDetails?fields={incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,iconCategory},startTime,endTime,from,to,length,delay,roadNumbers,timeValidity,probabilityOfOccurrence,numberOfReports,lastReportTime}}}&key=${process.env.TOM_TOM_API_KEY}&bbox=${coord1.lat},${coord1.lng},${coord2.lat},${coord2.lng}&language=en-GB&t=1111&timeValidityFilter=present,future`
  );
  const weatherAPI = weather.getCurrentWeather(location);
  const results = await Promise.allSettled([geocoding,googleSearch,nearbyPlaces,reverseGeocoding,routing,trafficFlow,trafficIncidentDetails,weatherAPI]);
  results.map((result) => {
    if(result.status === "rejected")
        console.log(result.reason);
    else
        console.log("Tool is healthy")
  } )
  return NextResponse.json({
    results: results.map((r) =>
      r.status === "rejected" ? `${r.reason.message} | ${r.reason.config.url} | ${r.reason.code}` : "Tool is healthy"
    ),
  });
}
