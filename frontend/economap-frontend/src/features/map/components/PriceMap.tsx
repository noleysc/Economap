'use client';

import { Store, GasStation, RouteSummary } from '@/types';
import { useLocationStore } from '@/store/useLocationStore';
import { useMemo, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet'; // Import Leaflet for custom icon
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import RoutingMachine from './routing-machine';
import userLocationIcon from './user-location-marker';

interface PriceMapProps {
  stores: Store[];
  onStoreClick: (id: string) => void;
  waypoints?: { lat: number; lng: number }[];
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

export const PriceMap = ({ stores, onStoreClick, waypoints, gasStations }: PriceMapProps) => {
  const { latitude, longitude } = useLocationStore();

  useEffect(() => {
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
      iconUrl: '/images/leaflet/marker-icon.png',
      shadowUrl: '/images/leaflet/marker-shadow.png',
    });
  }, []);

  // Default center if no stores are provided, or calculate from stores
  const defaultCenter: [number, number] = [34.052235, -118.243683]; // Los Angeles coordinates
  const mapCenter = latitude && longitude
    ? [latitude, longitude]
    : stores.length > 0
    ? [stores[0].coordinates.lat, stores[0].coordinates.lng]
    : defaultCenter;

  if (!latitude || !longitude) {
    return (
      <div className="h-[500px] w-full rounded-lg relative z-0 border border-border shadow-lg overflow-hidden flex items-center justify-center">
        <p>Loading map...</p>
      </div>
    );
  }

  const [itineraryCollapsed, setItineraryCollapsed] = useState(false);

  return (
    <div className={`h-[500px] w-full rounded-lg relative z-0 border border-border shadow-lg overflow-hidden ${itineraryCollapsed ? 'itinerary-collapsed' : ''}`}>
      <button 
        className="absolute top-2 right-2 z-10 bg-white p-1 rounded-full shadow-md"
        onClick={() => setItineraryCollapsed(!itineraryCollapsed)}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transition-transform duration-300 ${itineraryCollapsed ? 'transform rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
      <MapContainer center={mapCenter as [number, number]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={userLocationIcon}>
          <Popup>You are here</Popup>
        </Marker>
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
          <RoutingMachine key={waypoints.map(p => p.lat).join('_')} waypoints={waypoints.map(p => L.latLng(p.lat, p.lng))} />
        )}
      </MapContainer>
    </div>
  );
};