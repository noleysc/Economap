'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { buildTripPlan } from '@/features/map/components/routing-engine';
import { generateFakeGasStations, generateFakeProductPrices, generateFakeStores } from '@/lib/fakeData';
import { useCartStore } from '@/store/useCartStore';
import { useLocationStore } from '@/store/useLocationStore';
import { GasStation, Store } from '@/types';

const PriceMap = dynamic(() => import('@/features/map/components/PriceMap').then(mod => mod.PriceMap), { ssr: false });

interface StoreWithCartBalance extends Store {
  cartBalance: number | null;
}

export default function Home() {
  const { items: selectedProducts, getGas } = useCartStore();
  const { latitude, longitude, setLocation } = useLocationStore();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const fakeStores = useMemo<Store[]>(
    () => (latitude && longitude ? generateFakeStores(10, latitude, longitude, 10000) : []),
    [latitude, longitude]
  );
  const fakeGasStations = useMemo<GasStation[]>(
    () => (latitude && longitude ? generateFakeGasStations(5, latitude, longitude, 8000) : []),
    [latitude, longitude]
  );
  const productPrices = useMemo(
    () => (selectedProducts.length > 0 ? generateFakeProductPrices(fakeStores, selectedProducts) : {}),
    [fakeStores, selectedProducts]
  );

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
  const tripPlan = useMemo(
    () => buildTripPlan({
      userLocation,
      selectedStore,
      gasStations: filteredGasStations,
      shouldGetGas: getGas,
    }),
    [filteredGasStations, getGas, selectedStore, userLocation]
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

    return filteredGasStations;
  }, [filteredGasStations, getGas]);

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
      }
    );
  }, [setLocation]);

  const handleStoreClick = (id: string) => {
    setSelectedStoreId(id);
    const mapElement = document.getElementById('price-map');

    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-start overflow-hidden bg-background px-4 py-6 font-sans text-foreground md:px-8 md:py-10">
      <div className="relative z-10 flex w-full flex-col items-center">
        <h1 className="mb-6 flex items-center justify-center gap-3 text-center text-3xl font-semibold tracking-tight text-primary md:mb-8 md:text-5xl">
          <Image src="/AppIcon.png" alt="Economap icon" width={48} height={48} className="h-11 w-11 rounded-xl md:h-12 md:w-12" />
          <span>EconoMap Trip Planner</span>
        </h1>

        <div className="flex w-full max-w-6xl flex-col gap-6 md:flex-row md:gap-8">
          <div className="flex w-full flex-col items-center">
            <div id="price-map" className="mb-6 h-[420px] w-full overflow-hidden rounded-2xl border border-white/70 bg-white/80 shadow-[0_20px_60px_-20px_rgba(15,23,42,0.35)] backdrop-blur md:mb-8 md:h-[560px]">
              <PriceMap
                stores={mapStores}
                onStoreClick={handleStoreClick}
                waypoints={dynamicWaypoints}
                gasStations={gasStationsToDisplay}
              />
            </div>

            {selectedProducts.length === 0 && (
              <div className="mt-4 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur animate-fade-in">
                <p className="text-center text-base text-slate-700 md:text-lg">Add products to your cart to plan a trip.</p>
              </div>
            )}

            <Link href="/products" className="w-full max-w-sm">
              <button className="mt-6 w-full rounded-full bg-secondary px-6 py-3 text-sm font-semibold text-secondary-foreground shadow-[0_12px_30px_-12px_rgba(37,99,235,0.8)] ring-1 ring-blue-200/70 transition-transform duration-300 ease-in-out hover:scale-[1.02] hover:opacity-95 md:text-base">
                Select Products
              </button>
            </Link>

            {selectedProducts.length > 0 && storesToDisplay.length > 0 && (
              <div className="mt-6 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur animate-fade-in">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 md:text-2xl">Best Stores</h2>
                <ul className="space-y-3">
                  {storesToDisplay.map(store => (
                    <li key={store.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-medium text-slate-900 md:text-lg">{store.name}</h3>
                        <p className="truncate text-sm text-slate-500">{store.address}</p>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:justify-end">
                        <span className="text-lg font-bold text-primary">${store.cartBalance?.toFixed(2)}</span>
                        <button
                          onClick={() => handleStoreClick(store.id)}
                          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition-all duration-300 ease-in-out ${selectedStoreId === store.id ? 'bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgba(13,148,136,0.8)]' : 'bg-slate-200 text-slate-800 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] hover:bg-slate-300'}`}
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
              <div className="mt-6 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur animate-fade-in">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 md:text-2xl">Planned Route</h2>
                <ul className="space-y-3">
                {tripPlan.orderedStops.map((stop, index) => (
                    <li key={`${stop.type}-${stop.id}-${index}`} className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                          Stop {index + 1} | {stop.type === 'user' ? 'Start' : stop.type === 'gas' ? 'Gas Station' : 'Grocery Store'}
                        </p>
                        <h3 className="text-base font-medium text-slate-900 md:text-lg">{stop.name}</h3>
                        <p className="text-sm text-slate-500">{stop.address}</p>
                      </div>

                      {stop.type === 'gas' && stop.pricePerGallon !== undefined && (
                        <span className="text-sm font-semibold text-accent">${stop.pricePerGallon.toFixed(2)}/gal</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {selectedProducts.length > 0 && storesToDisplay.length === 0 && (
              <div className="mt-6 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur animate-fade-in">
                <p className="text-center text-base text-slate-700 md:text-lg">No stores found with all selected products.</p>
              </div>
            )}

            {selectedProducts.length > 0 && (
              <div className="mt-6 w-full max-w-md rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur animate-fade-in">
                <h2 className="mb-4 text-xl font-semibold text-slate-900 md:text-2xl">Selected Products</h2>
                <ul className="list-disc space-y-2 pl-5">
                  {selectedProducts.map(product => (
                    <li key={product.id} className="text-base text-slate-700 md:text-lg">
                      <span className="font-medium text-slate-900">{product.name}</span> from {product.brand}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
