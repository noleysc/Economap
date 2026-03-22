
import { Store, Product } from '@/types';

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

  const newY = y / Math.cos(y0);

  return {
    lat: y0 + newY,
    lng: x0 + x,
  };
};

// Function to generate a list of fake stores
export const generateFakeStores = (count: number, lat: number, lng: number, radius: number): Store[] => {
  const stores: Store[] = [];
  for (let i = 0; i < count; i++) {
    const coordinates = generateRandomCoordinate(lat, lng, radius);
    stores.push({
      id: `store-${i}`,
      name: `Fake Store ${i + 1}`,
      address: `${100 + i} Fake St, Fake City`,
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
