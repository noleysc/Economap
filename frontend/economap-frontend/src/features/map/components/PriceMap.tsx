'use client';

import { Store, GasStation } from '@/types';
import { useLocationStore } from '@/store/useLocationStore';
import { useEffect } from 'react';
import 'leaflet/dist/leaflet.css';
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';
import L from 'leaflet'; // Import Leaflet for custom icon
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import RoutingMachine from "./routing-machine";
import userLocationIcon from './user-location-marker';

interface PriceMapProps {
  stores: Store[];
  onStoreClick: (id: string) => void;
  waypoints?: { lat: number; lng: number }[];
  gasStations?: GasStation[]; // Add gasStations prop
}

// Custom icon for gas stations
const gasStationIconSvg = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42">
    <path fill="#d62828" stroke="#7f1d1d" stroke-width="2" d="M15 1C7.82 1 2 6.82 2 14c0 9.58 13 27 13 27s13-17.42 13-27C28 6.82 22.18 1 15 1z"/>
    <circle cx="15" cy="14" r="5.5" fill="#fff2f2"/>
  </svg>
`);

const gasStationIcon = new L.Icon({
  iconUrl: `data:image/svg+xml;charset=UTF-8,${gasStationIconSvg}`,
  iconRetinaUrl: `data:image/svg+xml;charset=UTF-8,${gasStationIconSvg}`,
  iconSize: [30, 42],
  iconAnchor: [15, 42],
  popupAnchor: [1, -34],
  shadowUrl: '/images/leaflet/marker-shadow.png',
  shadowSize: [41, 41],
  shadowAnchor: [13, 41],
});

export const PriceMap = ({ stores, onStoreClick, waypoints, gasStations }: PriceMapProps) => {
  const { latitude, longitude } = useLocationStore();


  useEffect(() => {
    // This is a known workaround for a leaflet issue where the default icon path is not resolved correctly.
    delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: string })._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: '/images/leaflet/marker-icon-2x.png',
      iconUrl: '/images/leaflet/marker-icon.png',
      shadowUrl: '/images/leaflet/marker-shadow.png',
    });
  }, []);

  if (latitude === null || longitude === null) {
    return (
      <div className="flex h-[500px] w-full items-center justify-center rounded-2xl border border-border bg-white/90 px-6 text-center shadow-lg backdrop-blur">
        <div>
          <p className="text-lg font-semibold text-slate-900">Locating your current position</p>
          <p className="mt-2 text-sm text-slate-500">Allow location access so the map can start at where you are now.</p>
        </div>
      </div>
    );
  }

  const mapCenter: [number, number] = [latitude, longitude];



  return (
    <div className="relative z-0 h-[500px] w-full overflow-hidden rounded-lg border border-border shadow-lg">
      <MapContainer center={mapCenter as [number, number]} zoom={13} scrollWheelZoom={false} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {latitude && longitude && (
          <Marker position={[latitude, longitude]} icon={userLocationIcon}>
            <Popup>You are here</Popup>
          </Marker>
        )}
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
                  className="mt-3 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_10px_24px_-12px_rgba(13,148,136,0.85)] ring-1 ring-emerald-200/70 transition-colors duration-200 hover:bg-emerald-700"
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
          <RoutingMachine key={waypoints.map(p => `${p.lat}-${p.lng}`).join('_')} waypoints={waypoints.map(p => L.latLng(p.lat, p.lng))} />
        )}
      </MapContainer>
    </div>
  );
};
