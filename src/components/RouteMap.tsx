"use client";
import { useEffect, useRef, useState } from "react";

const RouteMap = () => {
  const mapRef = useRef<any>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://apis.mappls.com/advancedmaps/api/${process.env.NEXT_PUBLIC_MAPPLS_API_KEY}/map_sdk?v=3.0&layer=vector`;
    script.async = true;
    script.onload = () => {
      if (window.mappls) {
        const mapObject = new window.mappls.Map(mapRef.current, {
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
    if (!isMapLoaded || !map) return;

    const path = [
      { lat: 28.55108, lng: 77.26913 },
      { lat: 28.55106, lng: 77.26906 },
      { lat: 28.55105, lng: 77.26897 },
      { lat: 28.55101, lng: 77.26872 },
      { lat: 28.55099, lng: 77.26849 },
      { lat: 28.55097, lng: 77.26831 },
      { lat: 28.55093, lng: 77.26794 },
      { lat: 28.55089, lng: 77.2676 },
      { lat: 28.55123, lng: 77.26756 },
      { lat: 28.55145, lng: 77.26758 },
      { lat: 28.55168, lng: 77.26758 },
      { lat: 28.55175, lng: 77.26759 },
      { lat: 28.55177, lng: 77.26755 },
      { lat: 28.55179, lng: 77.26753 },
    ];

    // Draw the polyline
    const polyline = new window.mappls.Polyline({
      map,
      path,
      strokeColor: "#FF5733",
      strokeOpacity: 1.0,
      strokeWeight: 6,
      fitbounds: true,
      animate: {
        path: true,
        speed: 5,
      },
    });

    // Add the person marker
    new window.mappls.Marker({
      map,
      position: path[path.length - 1],
      icon: "https://cdn-icons-png.flaticon.com/512/64/64572.png",
      width: 40,
      height: 40,
      popupHtml: "<b style='color:black;'>Manish Raja, Mumbai</b>",
    });
  }, [isMapLoaded, map]);

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
