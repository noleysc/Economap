'use client';

import { Store, GasStation } from '@/types';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet'; // Import Leaflet for custom icon

// Import the RoutingMachine component dynamically
const RoutingMachine = dynamic(
  () => import('./RoutingMachine').then((mod) => mod.default),
  { ssr: false }
);

interface PriceMapProps {
  stores: Store[];
  onStoreClick: (id: string) => void;
  waypoints?: [number, number][];
  gasStations?: GasStation[]; // Add gasStations prop
}

// Custom icon for gas stations
const gasStationIcon = new L.Icon({
  iconUrl: '/images/leaflet/gas-pump.png', // You'll need to add a gas-pump.png to public/images/leaflet
  iconRetinaUrl: '/images/leaflet/gas-pump.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: '/images/leaflet/marker-shadow.png',
  shadowSize: [41, 41]
});

const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => {
    const L = require('leaflet');
    // Fix for default icon not showing
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
      iconUrl: '/images/leaflet/marker-icon.png',
      shadowUrl: '/images/leaflet/marker-shadow.png',
    });
    return mod.MapContainer;
  }),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

export const PriceMap = ({ stores, onStoreClick, waypoints, gasStations }: PriceMapProps) => {
  console.log("PriceMap received gasStations:", gasStations); // Debug log
  // Default center if no stores are provided, or calculate from stores
  const defaultCenter: [number, number] = [34.052235, -118.243683]; // Los Angeles coordinates
  const mapCenter = stores.length > 0 
    ? [stores[0].coordinates.lat, stores[0].coordinates.lng] 
    : defaultCenter;

  return (
    <div className="h-[500px] w-full rounded-lg relative z-0 border border-border shadow-lg overflow-hidden">
      <MapContainer center={mapCenter as [number, number]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stores.map((store) => (
          <Marker 
            key={store.id} 
            position={[store.coordinates.lat, store.coordinates.lng]} 
            eventHandlers={{
              click: () => {
                onStoreClick(store.id);
              },
            }}
          >
            <Popup>
              <div className="font-sans text-foreground">
                <h3 className="text-lg font-semibold">{store.name}</h3>
                <p>{store.address}</p>
                <button 
                  onClick={() => onStoreClick(store.id)}
                  className="mt-2 bg-primary text-primary-foreground py-1 px-3 rounded-md text-sm hover:bg-primary-dark transition-colors duration-200"
                >
                  View Details
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

        {gasStations && gasStations.map((station) => (
          <Marker 
            key={station.id} 
            position={[station.coordinates.lat, station.coordinates.lng]} 
            icon={gasStationIcon}
          >
            <Popup>
              <div className="font-sans text-foreground">
                <h3 className="text-lg font-semibold">{station.name}</h3>
                <p>{station.address}</p>
                <p>Price: ${station.pricePerGallon.toFixed(2)}/gal</p>
              </div>
            </Popup>
          </Marker>
        ))}

        {waypoints && waypoints.length >= 2 && (
          <RoutingMachine waypoints={waypoints} />
        )}
      </MapContainer>
    </div>
  );
};