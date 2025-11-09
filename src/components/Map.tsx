"use client";
import { useEffect, useRef } from "react";

const Map = () => {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = `https://apis.mappls.com/advancedmaps/api/${process.env.NEXT_PUBLIC_MAPPLS_API_KEY}/map_sdk?v=3.0&layer=vector`;
    script.async = true;

    script.onload = () => {
      if (window.mappls) {
        const mapObject = new window.mappls.Map(mapRef.current, {
          center: [19.08, 72.88],
          zoom: 12,
        });

        new window.mappls.Marker({
          map: mapObject,
          position: { lat: 19.08, lng: 72.88 },
          popupHtml: "<b style='color:black;'>Marker added successfully!</b>",
          fitbounds: true,
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

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
