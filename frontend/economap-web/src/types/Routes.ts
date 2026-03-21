import { LatLngExpression } from "leaflet";

export interface Stop {
  id: string;
  name: string;
  address: string;
  type: 'Gas' | 'Grocery' | 'Dining';
  position: LatLngExpression;
}

export interface Route {
  id: string;
  name: "Daily Run";
  stops: Stop[];
  optimizedRoute: Stop[];
}
