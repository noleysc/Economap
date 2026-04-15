
import { Store, Product, GasStation } from '@/types';

// Function to generate a random coordinate within a radius
const generateRandomCoordinate = (lat: number, lng: number, radius: number) => {
  const y0 = lat;
  const x0 = lng;
  const rd = radius / 111300; // about 111300 meters in one degree

  const u = Math.random();
  const v = Math.random();

  const w = rd * Math.sqrt(u);
  const t = 2 * Math.PI * v;
  const x = w * Math.cos(t);
  const y = w * Math.sin(t);

  const newY = y / Math.cos(y0 * Math.PI / 180);

  return {
    lat: y0 + newY,
    lng: x0 + x,
  };
};

// Function to generate a list of fake stores
export const generateFakeStores = (count: number, lat: number, lng: number, radius: number): Store[] => {
  const stores: Store[] = [];
  const storeNames = [
    "Budget Basket",
    "Market Square",
    "Fresh Corner",
    "Family Foods",
    "Neighborhood Grocer",
    "Sunrise Market",
  ];

  for (let i = 0; i < count; i++) {
    const coordinates = generateRandomCoordinate(lat, lng, radius);
    stores.push({
      id: `store-${i}`,
      name: `${storeNames[i % storeNames.length]} ${i + 1}`,
      address: `${100 + i} Market St, Nearby`,
      coordinates,
    });
  }
  return stores;
};

// Function to generate fake product prices for stores
export const generateFakeProductPrices = (stores: Store[], products: Product[]) => {
  const prices: { [storeId: string]: { [productId: string]: number } } = {};
  stores.forEach(store => {
    prices[store.id] = {};
    products.forEach(product => {
      // Assign a random price between $1 and $10
      prices[store.id][product.id] = Math.random() * 9 + 1;
    });
  });
  return prices;
};

// Function to generate fake gas stations
export const generateFakeGasStations = (count: number, lat: number, lng: number, radius: number): GasStation[] => {
  const stations: GasStation[] = [];
  const gasNames = ["Shell", "Exxon", "Chevron", "BP", "7-Eleven", "Costco Gas"];

  for (let i = 0; i < count; i++) {
    const coordinates = generateRandomCoordinate(lat, lng, radius);
    stations.push({
      id: `gas-${i}`,
      name: `${gasNames[i % gasNames.length]} ${i + 1}`,
      address: `${200 + i} Fuel Rd, Nearby`,
      coordinates,
      pricePerGallon: parseFloat((Math.random() * 1.5 + 3.5).toFixed(2)), // $3.50 to $5.00
    });
  }

  return stations;
};
