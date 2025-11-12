"use client";
import axios from "axios";
import { useEffect, useRef, useState } from "react";

type Coord = {
  lat: number;
  lng: number;
};

const RouteMap = () => {
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);
  const [route, setRoute] = useState<Coord[] | null>(null);

  // Script
  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://apis.mappls.com/advancedmaps/api/${process.env.NEXT_PUBLIC_MAPPLS_API_KEY}/map_sdk?v=3.0&layer=vector`;
    script.async = true;
    script.onload = () => {
      if ((window as any).mappls) {
        const mapObject = new (window as any).mappls.Map(mapRef.current, {
          center: [19.08, 72.88],
          zoom: 12,
          traffic: false,
        });

        mapObject.on("load", () => {
          setIsMapLoaded(true);
          setMap(mapObject);
        });
      }
    };
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    const fetchRoute = async (coord1: Coord, coord2: Coord) => {
      try {
        const result = await axios.get(
          `http://router.project-osrm.org/route/v1/car/${coord1.lng},${coord1.lat};${coord2.lng},${coord2.lat}?geometries=geojson&overview=full&alternatives=3`
        );
        const data = result.data;
        if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
          console.error("OSRM could not find a route:", data.code);
          return;
        }
        const coords = data.routes[0].geometry.coordinates;
        setRoute(
          coords.map((coord: number[]) => ({
            lat: coord[1],
            lng: coord[0],
          }))
        );
      } catch (error) {
        console.error("Error fetching route:", error);
      }
    };

    fetchRoute({ lat: 51.5072, lng: 0.1276 }, { lat: 19.6967, lng: 72.7699 });
  }, []);

  useEffect(() => {
    if (!isMapLoaded || !map || !route) return;
    console.log(route);

    // Draw the polyline
    const polyline = new (window as any).mappls.Polyline({
      map,
      path: route,
      strokeColor: "#FF5733",
      strokeOpacity: 1.0,
      strokeWeight: 6,
      fitbounds: true,
      // animate: {
      //   path: true,
      //   speed: 5
      // },
    });

    // Add the person marker
    new (window as any).mappls.Marker({
      map,
      position: route[route.length - 1],
      icon: "https://cdn-icons-png.flaticon.com/512/64/64572.png",
      width: 40,
      height: 40,
      popupHtml: "<b style='color:black;'>Manish Raja, Mumbai</b>",
    });
  }, [isMapLoaded, map, route]);

  return (
    <div
      id="map"
      ref={mapRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "60vh",
        borderRadius: "12px",
        overflow: "hidden",
      }}
    />
  );
};

export default RouteMap;
