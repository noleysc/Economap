'use client';

import { PriceMap } from "@/features/map/components/PriceMap";
import { Store, Product } from "@/types";
import Link from "next/link";
import { useCartStore } from "@/store/useCartStore";
import { useState } from "react";

// A more comprehensive list of dummy stores
const allStores: Store[] = [
  {
    id: "1",
    name: "Publix",
    address: "123 Main St",
    coordinates: { lat: 33.748995, lng: -84.387982 }, // Atlanta, GA
  },
  {
    id: "2",
    name: "Walmart",
    address: "456 Oak Ave",
    coordinates: { lat: 33.753746, lng: -84.386001 }, // Atlanta, GA
  },
  {
    id: "3",
    name: "Kroger",
    address: "789 Pine Ln",
    coordinates: { lat: 33.755492, lng: -84.390000 }, // Atlanta, GA
  },
  {
    id: "4",
    name: "Target",
    address: "101 Elm Rd",
    coordinates: { lat: 33.745000, lng: -84.395000 }, // Atlanta, GA
  },
  {
    id: "5",
    name: "Whole Foods",
    address: "222 Cedar Dr",
    coordinates: { lat: 33.760000, lng: -84.380000 }, // Atlanta, GA
  },
];

interface GasStation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricePerGallon: number;
}

const allGasStations: GasStation[] = [
  {
    id: "gas1",
    name: "Shell",
    address: "111 Gas St",
    coordinates: { lat: 33.740000, lng: -84.385000 },
    pricePerGallon: 3.50,
  },
  {
    id: "gas2",
    name: "BP",
    address: "222 Fuel Ave",
    coordinates: { lat: 33.750000, lng: -84.398000 },
    pricePerGallon: 3.45,
  },
  {
    id: "gas3",
    name: "Chevron",
    address: "333 Pump Rd",
    coordinates: { lat: 33.765000, lng: -84.375000 },
    pricePerGallon: 3.60,
  },
];


// Dummy product-to-store mapping (simplified - ensuring wide availability for demo)
const productToStoreMapping: { [productId: string]: string[] } = {
  "prod1": ["1", "2", "3", "4", "5"], // Milk
  "prod2": ["1", "2", "3", "4", "5"], // Bread
  "prod3": ["1", "2", "3", "4", "5"], // Eggs
  "prod4": ["1", "2", "3", "4", "5"], // Chicken
  "prod5": ["1", "2", "3", "4", "5"], // Rice
  "prod6": ["1", "2", "3", "4", "5"], // Pasta
  "prod7": ["1", "2", "3", "4", "5"], // Tomatoes
  "prod8": ["1", "2", "3", "4", "5"], // Potatoes
  "prod9": ["1", "2", "3", "4", "5"], // Cheese
  "prod10": ["1", "2", "3", "4", "5"], // Yogurt
};

// Dummy product prices by store
// Structure: { storeId: { productId: price } }
const productPricesByStore: { [storeId: string]: { [productId: string]: number } } = {
  "1": { // Publix
    "prod1": 3.00, // Milk
    "prod2": 2.50, // Bread
    "prod3": 4.00, // Eggs
    "prod5": 5.00, // Rice
    "prod7": 2.00, // Tomatoes
    "prod9": 6.00, // Cheese
  },
  "2": { // Walmart
    "prod1": 2.80, // Milk
    "prod2": 2.30, // Bread
    "prod4": 7.00, // Chicken
    "prod5": 4.80, // Rice
    "prod8": 3.00, // Potatoes
    "prod10": 4.00, // Yogurt
  },
  "3": { // Kroger
    "prod1": 3.10, // Milk
    "prod3": 4.20, // Eggs
    "prod4": 7.20, // Chicken
    "prod6": 3.50, // Pasta
    "prod9": 6.30, // Cheese
  },
  "4": { // Target
    "prod2": 2.60, // Bread
    "prod5": 5.20, // Rice
    "prod8": 3.20, // Potatoes
    "prod10": 4.10, // Yogurt
  },
  "5": { // Whole Foods
    "prod3": 5.00, // Eggs
    "prod6": 4.00, // Pasta
    "prod7": 2.50, // Tomatoes
    "prod9": 7.00, // Cheese
  },
};


export default function Home() {
  const { items: selectedProducts, getGas } = useCartStore();
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  const handleStoreClick = (id: string) => {
    setSelectedStoreId(id);
    console.log(`Store with id ${id} clicked`);
  };

  // Determine which stores are relevant based on selected products
  const relevantStoreIds = new Set<string>();
  selectedProducts.forEach(product => {
    if (productToStoreMapping[product.id]) {
      productToStoreMapping[product.id].forEach(storeId => relevantStoreIds.add(storeId));
    }
  });

  interface StoreWithCartBalance extends Store {
    cartBalance: number | null;
  }

  const storesWithBalances: StoreWithCartBalance[] = selectedProducts.length > 0
    ? allStores
        .filter(store => relevantStoreIds.has(store.id))
        .map(store => {
          let totalBalance = 0;
          let allProductsAvailable = true;

          selectedProducts.forEach(product => {
            const price = productPricesByStore[store.id]?.[product.id];
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
    : allStores.map(store => ({ ...store, cartBalance: null })); // If no products selected, show all stores with null balance

    console.log("Stores with balances (before filter):", storesWithBalances); // Debug log
    const storesToDisplay = storesWithBalances.filter(store => store.cartBalance !== null);
    console.log("Stores to display (after filter):", storesToDisplay); // Debug log

  // console.log("Stores to display:", storesToDisplay); // Debug log

  // Filter stores based on selectedStoreId for map waypoints
  const mapStores = selectedStoreId
    ? storesToDisplay.filter(store => store.id === selectedStoreId)
    : storesToDisplay;

  const storeWaypoints = mapStores.map(store => [
    store.coordinates.lat,
    store.coordinates.lng,
  ]) as [number, number][];

  let finalWaypoints = [...storeWaypoints];

  // If getGas is true and a store is selected, find the cheapest gas station and add it to waypoints
  if (getGas && selectedStoreId && mapStores.length > 0) {
    const cheapestGasStation = allGasStations.sort((a, b) => a.pricePerGallon - b.pricePerGallon)[0];
    if (cheapestGasStation) {
      finalWaypoints = [
        [cheapestGasStation.coordinates.lat, cheapestGasStation.coordinates.lng],
        ...storeWaypoints,
      ];
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8 bg-background text-foreground font-sans">
      <h1 className="text-4xl font-bold mb-8 text-primary">EconoMap - Your Trip</h1>
      <div className="flex flex-col md:flex-row w-full max-w-5xl gap-8">
        <div className="flex flex-col items-center w-full">
            <PriceMap
              stores={mapStores}
              onStoreClick={handleStoreClick}
              waypoints={finalWaypoints}
              gasStations={getGas ? allGasStations : undefined}
            />
            {selectedProducts.length === 0 && (
              <div className="mt-8 p-6 border border-border rounded-lg shadow-lg bg-white w-full max-w-md animate-fade-in">
                <p className="text-center text-gray-700 text-lg">Add products to your cart to plan a trip!</p>
              </div>
            )}
          <Link href="/products" className="w-full max-w-sm">
            <button className="mt-8 w-full bg-primary text-primary-foreground py-3 px-6 rounded-lg shadow-md hover:bg-primary-dark transition-all duration-300 ease-in-out transform hover:scale-105">
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