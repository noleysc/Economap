"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css";
import "leaflet-defaulticon-compatibility";
import { Stop } from "@/types/Routes";

interface MapProps {
  stops: Stop[];
}

const Map = ({ stops }: MapProps) => {
  return (
    <MapContainer center={[51.505, -0.09]} zoom={13} style={{ height: "400px", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {stops.map((stop) => (
        <Marker key={stop.id} position={stop.position}>
          <Popup>{stop.name}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
};

export default Map;
