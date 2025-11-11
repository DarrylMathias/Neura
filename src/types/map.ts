export type MapView = {
  center: { lat: number; lng: number };
  zoom: number;
  animate: boolean;
};
export type MapMarker = {
  id: string;
  position: { lat: number; lng: number };
  label?: string;
  popup?: string;
};
export type MapRoute = {
  id: string;
  polyline: [number, number][];
  state: "highlighted" | "faded" | "normal";
  label?: string;
};
