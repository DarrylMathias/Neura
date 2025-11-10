"use client";
import { useEffect, useRef, useState } from "react";

const Map = ({
  location,
}: {
  location: { latitude: number; longitude: number };
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerInstanceRef = useRef<any>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    if (window.mappls || document.getElementById("mappls-script")) {
      return;
    }

    const script = document.createElement("script");
    script.id = "mappls-script"; 
    script.src = `https://apis.mappls.com/advancedmaps/api/${process.env.NEXT_PUBLIC_MAPPLS_API_KEY}/map_sdk?v=3.0&layer=vector`;
    script.async = true;

    script.onload = () => {
      setIsScriptLoaded(true);
    };

    document.body.appendChild(script);

  }, []);

  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current) {
      return;
    }

    const { latitude, longitude } = location;

    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new window.mappls.Map(mapRef.current, {
        center: [latitude, longitude],
        zoom: 8,
      });

      markerInstanceRef.current = new window.mappls.Marker({
        map: mapInstanceRef.current,
        position: { lat: latitude, lng: longitude },
        popupHtml: "<b style='color:black;'>You are here!</b>",
        fitbounds: true,
      });
    } else {
      mapInstanceRef.current.setCenter([latitude, longitude]);
      markerInstanceRef.current.setPosition({ lat: latitude, lng: longitude });
    }

  }, [location, isScriptLoaded]);

  return (
    <div
      id="map"
      ref={mapRef}
      style={{
        width: "95%",
        height: "95%",
        borderRadius: "12px",
      }}
    />
  );
};

export default Map;