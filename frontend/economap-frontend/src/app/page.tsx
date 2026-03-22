'use client';

const PriceMap = dynamic(() => import('@/features/map/components/PriceMap').then(mod => mod.PriceMap), { ssr: false });
import { Store, Product, RouteSummary } from "@/types";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useLocationStore } from "@/store/useLocationStore";
import { useState, useEffect, useMemo } from "react";
import { generateFakeStores, generateFakeProductPrices } from "@/lib/fakeData";
import dynamic from 'next/dynamic';

export default function Home() {
  const { items: selectedProducts } = useCartStore();
  const { latitude, longitude, setLocation } = useLocationStore();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [fakeStores, setFakeStores] = useState<Store[]>([]);
  const [productPrices, setProductPrices] = useState<{ [storeId: string]: { [productId: string]: number } }>({});




  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation(position.coords.latitude, position.coords.longitude);
      });
    }
  }, [setLocation]);

  useEffect(() => {
    if (latitude && longitude) {
      const stores = generateFakeStores(10, latitude, longitude, 10000); // 10 stores within 10km
      setFakeStores(stores);
    }
  }, [latitude, longitude]);

  useEffect(() => {
    if (fakeStores.length > 0 && selectedProducts.length > 0) {
      const prices = generateFakeProductPrices(fakeStores, selectedProducts);
      setProductPrices(prices);
    }
  }, [fakeStores, selectedProducts]);

  const handleStoreClick = (id: string) => {
    setSelectedStoreId(id);
    const mapElement = document.getElementById('price-map');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth' });
    }
  };


  interface StoreWithCartBalance extends Store {
    cartBalance: number | null;
  }

  const storesWithBalances: StoreWithCartBalance[] = selectedProducts.length > 0
    ? fakeStores
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
        .filter(store => store.cartBalance !== null) // Only show stores where all selected products are available
        .sort((a, b) => (a.cartBalance || Infinity) - (b.cartBalance || Infinity))
    : fakeStores.map(store => ({ ...store, cartBalance: null })); // If no products selected, show all stores with null balance

    const storesToDisplay = storesWithBalances.filter(store => store.cartBalance !== null);

  const mapStores = selectedStoreId
    ? storesToDisplay.filter(store => store.id === selectedStoreId)
    : storesToDisplay;

  const storeWaypoints = useMemo(() => {
    if (mapStores.length === 1 && latitude && longitude) {
        return [
            {lat: latitude, lng: longitude},
            {lat: mapStores[0].coordinates.lat, lng: mapStores[0].coordinates.lng}
        ];
    }
    return [];
  }, [mapStores, latitude, longitude]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-background text-foreground font-sans">
      <h1 className="text-4xl font-bold mb-8 text-primary flex items-center justify-center">
        <img src="/AppIcon.png" alt="Economap icon" className="w-12 h-12 mr-4 rounded-lg" />
        <span>EconoMap - Your Trip</span>
      </h1>
      <div className="flex flex-col md:flex-row w-full max-w-5xl gap-8">
        <div className="flex flex-col items-center w-full">
          <div id="price-map" className="w-full h-[500px] mb-8 rounded-lg shadow-lg overflow-hidden border-2 border-primary-dark">
            <PriceMap
              stores={mapStores}
              onStoreClick={handleStoreClick}
              waypoints={storeWaypoints}
              gasStations={undefined}
            />
            </div>

            {selectedProducts.length === 0 && (
              <div className="mt-8 p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md animate-fade-in">
                <p className="text-center text-gray-700 text-lg">Add products to your cart to plan a trip!</p>
              </div>
            )}
          <Link href="/products" className="w-full max-w-sm">
            <button className="mt-8 w-full bg-blue-500 text-white py-3 px-6 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-300 ease-in-out transform hover:scale-105">
              Select Products for Trip
            </button>
          </Link>

          {selectedProducts.length > 0 && storesToDisplay.length > 0 && (
            <div className="mt-8 p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md animate-fade-in">
              <h2 className="text-2xl font-semibold mb-4 text-accent">Best Stores for your Cart:</h2>
              <ul className="space-y-4">
                {storesToDisplay.map(store => (
                  <li key={store.id} className="flex justify-between items-center py-3 border-b border-border last:border-b-0">
                    <div>
                      <h3 className="text-lg font-medium text-foreground">{store.name}</h3>
                      <p className="text-sm text-gray-500">{store.address}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-bold text-primary">${store.cartBalance?.toFixed(2)}</span>
                      <button
                        onClick={() => handleStoreClick(store.id)}
                        className={`py-2 px-4 rounded-lg shadow-sm transition-all duration-300 ease-in-out transform hover:scale-105 ${selectedStoreId === store.id ? 'bg-secondary text-secondary-foreground' : 'bg-primary text-primary-foreground hover:bg-primary-dark'}`}
                      >
                        {selectedStoreId === store.id ? 'Selected' : 'Select'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {selectedProducts.length > 0 && storesToDisplay.length === 0 && (
            <div className="mt-8 p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md animate-fade-in">
              <p className="text-center text-gray-700 text-lg">No stores found with all selected products.</p>
            </div>
          )}


          {selectedProducts.length > 0 && (
            <div className="mt-8 p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md animate-fade-in">
              <h2 className="text-2xl font-semibold mb-4 text-secondary">Selected Products:</h2>
              <ul className="list-disc pl-5 space-y-2">
                {selectedProducts.map(product => (
                  <li key={product.id} className="text-foreground text-lg"><span className="font-medium">{product.name}</span> from {product.brand}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
