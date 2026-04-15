'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { generateFakeGasStations, generateFakeProductPrices, generateFakeStores } from '@/lib/fakeData';
import { useCartStore } from '@/store/useCartStore';
import { useLocationStore } from '@/store/useLocationStore';
import { GasStation, Store, TripPlan } from '@/types';

const PriceMap = dynamic(() => import('@/features/map/components/PriceMap').then(mod => mod.PriceMap), { ssr: false });
const RoutingEngine = dynamic(() => import('@/features/map/components/routing-engine').then(mod => mod.RoutingEngine), { ssr: false });

interface StoreWithCartBalance extends Store {
  cartBalance: number | null;
}

export default function Home() {
  const { items: selectedProducts, getGas } = useCartStore();
  const { latitude, longitude, setLocation } = useLocationStore();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [fakeStores, setFakeStores] = useState<Store[]>([]);
  const [fakeGasStations, setFakeGasStations] = useState<GasStation[]>([]);
  const [tripPlan, setTripPlan] = useState<TripPlan | null>(null);
  const [productPrices, setProductPrices] = useState<{ [storeId: string]: { [productId: string]: number } }>({});
  const [getRouteDistance, setGetRouteDistance] = useState<((waypoints: { lat: number; lng: number }[]) => Promise<number>) | null>(null);

  const storesWithBalances: StoreWithCartBalance[] = useMemo(() => {
    if (selectedProducts.length === 0) {
      return fakeStores.map(store => ({ ...store, cartBalance: null }));
    }

    return fakeStores
      .map(store => {
        let totalBalance = 0;
        let allProductsAvailable = true;

        selectedProducts.forEach(product => {
          const price = productPrices[store.id]?.[product.id];
          if (price !== undefined) {
            totalBalance += price;
          } else {
            allProductsAvailable = false;
          }
        });

        return {
          ...store,
          cartBalance: allProductsAvailable ? parseFloat(totalBalance.toFixed(2)) : null,
        };
      })
      .filter(store => store.cartBalance !== null)
      .sort((a, b) => (a.cartBalance || Infinity) - (b.cartBalance || Infinity));
  }, [fakeStores, productPrices, selectedProducts]);

  const storesToDisplay = useMemo(
    () => storesWithBalances.filter(store => store.cartBalance !== null),
    [storesWithBalances]
  );

  const mapStores = useMemo(() => {
    return selectedStoreId
      ? storesToDisplay.filter(store => store.id === selectedStoreId)
      : storesToDisplay;
  }, [selectedStoreId, storesToDisplay]);

  const filteredGasStations = useMemo(() => {
    return getGas ? fakeGasStations : [];
  }, [fakeGasStations, getGas]);

  const selectedStore = useMemo(
    () => storesToDisplay.find(store => store.id === selectedStoreId) ?? null,
    [selectedStoreId, storesToDisplay]
  );

  const userLocation = useMemo(
    () => (latitude && longitude ? { lat: latitude, lng: longitude } : null),
    [latitude, longitude]
  );

  const dynamicWaypoints = useMemo(
    () => {
      if (tripPlan?.orderedStops.length) {
        return tripPlan.orderedStops.map(stop => stop.coordinates);
      }

      if (userLocation && selectedStore) {
        return [userLocation, selectedStore.coordinates];
      }

      return [];
    },
    [selectedStore, tripPlan, userLocation]
  );

  const gasStationsToDisplay = useMemo(() => {
    if (!getGas) {
      return [];
    }

    if (!tripPlan?.selectedGasStationId) {
      return filteredGasStations;
    }

    return filteredGasStations.filter(station => station.id === tripPlan.selectedGasStationId);
  }, [filteredGasStations, getGas, tripPlan]);

  useEffect(() => {
    import('@/lib/routingUtils').then(mod => {
      setGetRouteDistance(() => mod.getRouteDistance);
    });
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        setLocation(position.coords.latitude, position.coords.longitude);
      },
      error => {
        console.error('Geolocation error:', error);
        setLocation(34.052235, -118.243683);
      }
    );
  }, [setLocation]);

  const generateAndSetFakeData = useCallback(() => {
    if (!latitude || !longitude) {
      return;
    }

    const stores = generateFakeStores(10, latitude, longitude, 10000);
    const stations = generateFakeGasStations(5, latitude, longitude, 8000);

    setFakeStores(stores);
    setFakeGasStations(stations);

    if (selectedProducts.length > 0) {
      setProductPrices(generateFakeProductPrices(stores, selectedProducts));
      return;
    }

    setProductPrices({});
  }, [latitude, longitude, selectedProducts]);

  useEffect(() => {
    setTripPlan(null);
  }, [selectedStoreId, getGas, filteredGasStations, selectedProducts]);

  useEffect(() => {
    generateAndSetFakeData();
  }, [generateAndSetFakeData]);

  const handleStoreClick = (id: string) => {
    setSelectedStoreId(id);
    const mapElement = document.getElementById('price-map');

    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-start bg-background p-8 font-sans text-foreground">
      <h1 className="mb-8 flex items-center justify-center text-4xl font-bold text-primary">
        <Image src="/AppIcon.png" alt="Economap icon" width={48} height={48} className="mr-4 h-12 w-12 rounded-lg" />
        <span>EconoMap - Your Trip</span>
      </h1>

      <div className="flex w-full max-w-5xl flex-col gap-8 md:flex-row">
        <div className="flex w-full flex-col items-center">
          <div id="price-map" className="mb-8 h-[500px] w-full overflow-hidden rounded-lg border-2 border-primary-dark shadow-lg">
            <PriceMap
              stores={mapStores}
              onStoreClick={handleStoreClick}
              waypoints={dynamicWaypoints}
              gasStations={gasStationsToDisplay}
            />
          </div>

          <RoutingEngine
            userLocation={userLocation}
            selectedStore={selectedStore}
            gasStations={filteredGasStations}
            shouldGetGas={getGas}
            getRouteDistance={getRouteDistance}
            onRouteCalculated={setTripPlan}
          />

          {selectedProducts.length === 0 && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg animate-fade-in">
              <p className="text-center text-lg text-gray-700">Add products to your cart to plan a trip!</p>
            </div>
          )}

          <Link href="/products" className="w-full max-w-sm">
            <button className="mt-8 w-full rounded-lg bg-blue-500 px-6 py-3 text-white shadow-md transition-all duration-300 ease-in-out hover:scale-105 hover:bg-blue-700">
              Select Products for Trip
            </button>
          </Link>

          {selectedProducts.length > 0 && storesToDisplay.length > 0 && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg animate-fade-in">
              <h2 className="mb-4 text-2xl font-semibold text-accent">Best Stores for your Cart:</h2>
              <ul className="space-y-4">
                {storesToDisplay.map(store => (
                  <li key={store.id} className="flex items-center justify-between border-b border-border py-3 last:border-b-0">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{store.name}</h3>
                      <p className="text-sm text-gray-500">{store.address}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-primary">${store.cartBalance?.toFixed(2)}</span>
                      <button
                        onClick={() => handleStoreClick(store.id)}
                        className={`transform rounded-lg px-4 py-2 shadow-sm transition-all duration-300 ease-in-out hover:scale-105 ${selectedStoreId === store.id ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary-dark'}`}
                      >
                        {selectedStoreId === store.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {tripPlan && selectedStore && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg animate-fade-in">
              <h2 className="mb-4 text-2xl font-semibold text-secondary">Planned Route</h2>
              <ul className="space-y-3">
                {tripPlan.orderedStops.map((stop, index) => (
                  <li key={`${stop.type}-${stop.id}-${index}`} className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-b-0">
                    <div>
                      <p className="text-sm uppercase tracking-wide text-gray-500">
                        Stop {index + 1} | {stop.type === 'user' ? 'Start' : stop.type === 'gas' ? 'Gas Station' : 'Grocery Store'}
                      </p>
                      <h3 className="text-lg font-medium text-foreground">{stop.name}</h3>
                      <p className="text-sm text-gray-500">{stop.address}</p>
                    </div>

                    {stop.type === 'gas' && stop.pricePerGallon !== undefined && (
                      <span className="text-base font-semibold text-primary">${stop.pricePerGallon.toFixed(2)}/gal</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedProducts.length > 0 && storesToDisplay.length === 0 && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg animate-fade-in">
              <p className="text-center text-lg text-gray-700">No stores found with all selected products.</p>
            </div>
          )}

          {selectedProducts.length > 0 && (
            <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-white p-6 shadow-lg animate-fade-in">
              <h2 className="mb-4 text-2xl font-semibold text-secondary">Selected Products:</h2>
              <ul className="list-disc space-y-2 pl-5">
                {selectedProducts.map(product => (
                  <li key={product.id} className="text-lg text-foreground">
                    <span className="font-medium">{product.name}</span> from {product.brand}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
