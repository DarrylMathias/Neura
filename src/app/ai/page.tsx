"use client";

import { useRef, useState, useEffect } from "react";
import ChatBotDemo from "@/components/Chatbot";
import dynamic from "next/dynamic";
const Map = dynamic(() => import("@/components/Map"), {
  ssr: false,
  loading: () => <div>Loading map...</div>,
});
import axios from "axios";
import { MapMarker, MapRoute, MapView } from "@/types/map";

const Page = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dividerX, setDividerX] = useState(70);
  const [isMobile, setIsMobile] = useState(false);
  const [location, setLocation] = useState({
    latitude: 18.9582,
    longitude: 72.8321,
  });

  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [routes, setRoutes] = useState<MapRoute[]>([]);
  const [mapView, setMapView] = useState<MapView | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      return await axios.get("/api/get-ip").catch((err) => {
        console.log(`Error in fetching : ${err}`);
      });
    };
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        fetchData();
      }
    );
  }, []);

  useEffect(() => {
    const checkScreen = () => setIsMobile(window.innerWidth < 1024);
    checkScreen();
    window.addEventListener("resize", checkScreen);
    return () => window.removeEventListener("resize", checkScreen);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isMobile) return;
    const startX = e.clientX;
    const startDividerX = dividerX;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const delta = ((moveEvent.clientX - startX) / containerWidth) * 100;
      const newDivider = Math.min(90, Math.max(10, startDividerX + delta));
      setDividerX(newDivider);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col lg:flex-row h-[85vh] sm:h-[90vh] w-full overflow-hidden bg-zinc-950"
    >
      <div
        className={`relative ${
          isMobile ? "w-full h-[35vh]" : "h-full"
        } transition-all duration-300 ease-in-out`}
        style={!isMobile ? { width: `${dividerX}%` } : {}}
      >
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-950">
          {location.latitude && location.longitude ? (
            <Map
              location={location}
              markers={markers}
              routes={routes}
              mapView={mapView}
            />
          ) : (
            <div className="text-white">Loading map...</div>
          )}
        </div>
      </div>

      {!isMobile && (
        <div
          className="w-[3px] cursor-col-resize bg-zinc-800 hover:bg-zinc-600 transition-colors"
          onMouseDown={handleMouseDown}
        />
      )}

      <div
        className={`relative ${
          isMobile ? "w-full h-[50vh]" : "h-full"
        } border-t md:border-t-0 md:border-l border-zinc-800 transition-all duration-300 ease-in-out`}
        style={!isMobile ? { width: `${100 - dividerX}%` } : {}}
      >
        <div className="absolute inset-0 overflow-y-auto">
          <ChatBotDemo
            location={location}
            onUpdateMarkers={setMarkers}
            onUpdateRoutes={setRoutes}
            onSetMapView={setMapView}
          />
        </div>
      </div>
    </div>
  );
};

export default Page;