'use client';

import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { buildTripPlan } from '@/features/map/components/routing-engine';
import { generateFakeGasStations, generateFakeProductPrices, generateFakeStores } from '@/lib/fakeData';
import { haversineDistance } from '@/lib/routingUtils';
import { useCartStore } from '@/store/useCartStore';
import { useLocationStore } from '@/store/useLocationStore';
import { CartItem, GasStation, Product, Store } from '@/types';

const PriceMap = dynamic(() => import('@/features/map/components/PriceMap').then(mod => mod.PriceMap), { ssr: false });

const legendMarker = (fill: string, stroke: string, innerFill: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34">
      <path fill="${fill}" stroke="${stroke}" stroke-width="1.5" d="M12 1C6.48 1 2 5.48 2 11c0 7.33 10 21 10 21s10-13.67 10-21C22 5.48 17.52 1 12 1z"/>
      <circle cx="12" cy="11" r="3.5" fill="${innerFill}"/>
    </svg>
  `)}`;

const legendItems = [
  {
    label: 'Your location',
    icon: legendMarker('#16a34a', '#166534', '#eafff0'),
  },
  {
    label: 'Gas station',
    icon: legendMarker('#dc2626', '#7f1d1d', '#fff1f1'),
  },
  {
    label: 'Grocery store',
    icon: legendMarker('#2563eb', '#1d4ed8', '#eff6ff'),
  },
];

interface StoreWithCartBalance extends Store {
  cartBalance: number | null;
}

const METERS_PER_MILE = 1_609.34;
const MIN_SEARCH_RADIUS_MILES = 2;
const MAX_SEARCH_RADIUS_MILES = 25;
const DEFAULT_SEARCH_RADIUS_MILES = 7;
const MAX_SEARCH_RADIUS_METERS = MAX_SEARCH_RADIUS_MILES * METERS_PER_MILE;
const TOTAL_GROCERY_STORE_COUNT = 56;
const TOTAL_GAS_STATION_COUNT = 30;

export default function Home() {
  const { items: cartItems, getGas } = useCartStore();
  const { latitude, longitude, setLocation } = useLocationStore();

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [searchRadiusMiles, setSearchRadiusMiles] = useState(DEFAULT_SEARCH_RADIUS_MILES);
  const selectedProducts = useMemo<Product[]>(
    () => cartItems.map((item) => item.product),
    [cartItems]
  );
  const searchRadiusMeters = useMemo(
    () => searchRadiusMiles * METERS_PER_MILE,
    [searchRadiusMiles]
  );
  const allFakeStores = useMemo<Store[]>(
    () => (latitude && longitude ? generateFakeStores(TOTAL_GROCERY_STORE_COUNT, latitude, longitude, MAX_SEARCH_RADIUS_METERS) : []),
    [latitude, longitude]
  );
  const allFakeGasStations = useMemo<GasStation[]>(
    () => (latitude && longitude ? generateFakeGasStations(TOTAL_GAS_STATION_COUNT, latitude, longitude, MAX_SEARCH_RADIUS_METERS) : []),
    [latitude, longitude]
  );
  const userLocation = useMemo(
    () => (latitude && longitude ? { lat: latitude, lng: longitude } : null),
    [latitude, longitude]
  );
  const storesInRadius = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    return allFakeStores.filter((store) =>
      haversineDistance(userLocation.lat, userLocation.lng, store.coordinates.lat, store.coordinates.lng) <= searchRadiusMeters
    );
  }, [allFakeStores, searchRadiusMeters, userLocation]);
  const gasStationsInRadius = useMemo(() => {
    if (!userLocation) {
      return [];
    }

    return allFakeGasStations.filter((station) =>
      haversineDistance(userLocation.lat, userLocation.lng, station.coordinates.lat, station.coordinates.lng) <= searchRadiusMeters
    );
  }, [allFakeGasStations, searchRadiusMeters, userLocation]);
  const productPrices = useMemo(
    () => (selectedProducts.length > 0 ? generateFakeProductPrices(allFakeStores, selectedProducts) : {}),
    [allFakeStores, selectedProducts]
  );

  const storesWithBalances: StoreWithCartBalance[] = useMemo(() => {
    if (selectedProducts.length === 0) {
      return storesInRadius.map(store => ({ ...store, cartBalance: null }));
    }

    return storesInRadius
      .map(store => {
        let totalBalance = 0;
        let allProductsAvailable = true;

        cartItems.forEach((item: CartItem) => {
          const price = productPrices[store.id]?.[item.product.id];
          if (price !== undefined) {
            totalBalance += price * item.quantity;
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
  }, [cartItems, productPrices, selectedProducts.length, storesInRadius]);

  const storesToDisplay = useMemo(
    () => storesWithBalances.filter(store => store.cartBalance !== null),
    [storesWithBalances]
  );
  const activeSelectedStoreId = useMemo(
    () => (selectedStoreId && storesToDisplay.some((store) => store.id === selectedStoreId) ? selectedStoreId : null),
    [selectedStoreId, storesToDisplay]
  );

  const mapStores = useMemo(() => {
    return activeSelectedStoreId
      ? storesToDisplay.filter(store => store.id === activeSelectedStoreId)
      : storesToDisplay;
  }, [activeSelectedStoreId, storesToDisplay]);

  const filteredGasStations = useMemo(() => {
    return getGas ? gasStationsInRadius : [];
  }, [gasStationsInRadius, getGas]);

  const selectedStore = useMemo(
    () => storesToDisplay.find(store => store.id === activeSelectedStoreId) ?? null,
    [activeSelectedStoreId, storesToDisplay]
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

            <div className="mb-4 flex w-full max-w-xl justify-center px-2">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 rounded-full border border-white/70 bg-white/90 px-5 py-3 shadow-lg backdrop-blur">
                {legendItems.map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <Image src={item.icon} alt="" aria-hidden="true" width={20} height={28} className="h-7 w-5" />
                    <span className="text-sm font-medium text-slate-700">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-4 w-full max-w-xl px-2">
              <div className="rounded-2xl border border-white/70 bg-white/90 p-5 shadow-lg backdrop-blur">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900 md:text-lg">Search Radius</h2>
                    <p className="text-sm text-slate-500">Show grocery stores and gas stations within your selected distance.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                    {searchRadiusMiles} mi
                  </span>
                </div>
                <input
                  type="range"
                  min={MIN_SEARCH_RADIUS_MILES}
                  max={MAX_SEARCH_RADIUS_MILES}
                  step={1}
                  value={searchRadiusMiles}
                  onChange={(event) => setSearchRadiusMiles(Number(event.target.value))}
                  className="mt-4 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-primary"
                />
                <div className="mt-2 flex justify-between text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
                  <span>{MIN_SEARCH_RADIUS_MILES} miles</span>
                  <span>{MAX_SEARCH_RADIUS_MILES} miles</span>
                </div>
                <p className="mt-4 text-sm text-slate-600">
                  Showing {storesInRadius.length} grocery stores and {gasStationsInRadius.length} gas stations within {searchRadiusMiles} miles.
                </p>
              </div>
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
                          className={`rounded-full px-4 py-2 text-sm font-semibold ring-1 ring-black/10 transition-all duration-300 ease-in-out ${activeSelectedStoreId === store.id ? 'bg-primary text-primary-foreground shadow-[0_10px_24px_-12px_rgba(13,148,136,0.8)]' : 'bg-slate-200 text-slate-800 shadow-[0_10px_24px_-16px_rgba(15,23,42,0.35)] hover:bg-slate-300'}`}
                        >
                          {activeSelectedStoreId === store.id ? 'Selected' : 'Select'}
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
                  {cartItems.map(item => (
                    <li key={item.product.id} className="text-base text-slate-700 md:text-lg">
                      <span className="font-medium text-slate-900">{item.product.name}</span> from {item.product.brand} x{item.quantity}
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
