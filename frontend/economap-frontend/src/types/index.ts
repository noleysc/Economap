export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  image_url: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Store {
  id: string;
  name: string; // e.g., "Publix", "Walmart"
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface GasStation {
  id: string;
  name: string;
  address: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  pricePerGallon: number;
}

export interface RouteWaypoint {
  lat: number;
  lng: number;
}

export interface RouteStop {
  id: string;
  name: string;
  address: string;
  type: 'user' | 'grocery' | 'gas';
  coordinates: RouteWaypoint;
  pricePerGallon?: number;
}

export interface TripPlan {
  orderedStops: RouteStop[];
  totalDistanceMeters: number;
  estimatedScore: number;
  selectedStoreId: string;
  selectedGasStationId?: string;
}

export interface PriceRecord {
  productId: string;
  storeId: string;
  price: number;
  unit: 'oz' | 'lb' | 'each' | 'qt';
  updatedAt: string; // ISO String
}

export interface ShoppingTrip {
  totalCost: number;
  stores: Store[];
  optimizedRoute: string[]; // Array of Store IDs
}

export interface RouteSummary {
  totalDistance: number;
  totalTime: number;
}
