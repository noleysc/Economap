'use client';

import { haversineDistance } from '@/lib/routingUtils';
import { GasStation, RouteStop, Store, TripPlan } from '@/types';

interface BuildTripPlanArgs {
  userLocation: { lat: number; lng: number } | null;
  selectedStore: Store | null;
  gasStations: GasStation[];
  shouldGetGas: boolean;
}

const DISTANCE_PRIORITY_WEIGHT = 15;
const GAS_PRICE_WEIGHT = 8;

const getRouteDistance = (waypoints: { lat: number; lng: number }[]) => {
  if (waypoints.length < 2) {
    return 0;
  }

  return waypoints.slice(1).reduce((totalDistance, waypoint, index) => {
    const previousWaypoint = waypoints[index];

    return totalDistance + haversineDistance(
      previousWaypoint.lat,
      previousWaypoint.lng,
      waypoint.lat,
      waypoint.lng
    );
  }, 0);
};

export const buildTripPlan = ({
  userLocation,
  selectedStore,
  gasStations,
  shouldGetGas,
}: BuildTripPlanArgs): TripPlan | null => {
  if (!userLocation || !selectedStore) {
    return null;
  }

  const userStop: RouteStop = {
    id: 'user-location',
    name: 'Your Location',
    address: 'Current position',
    type: 'user',
    coordinates: userLocation,
  };

  const groceryStop: RouteStop = {
    id: selectedStore.id,
    name: selectedStore.name,
    address: selectedStore.address,
    type: 'grocery',
    coordinates: selectedStore.coordinates,
  };

  const directRouteDistance = getRouteDistance([
    userLocation,
    selectedStore.coordinates,
  ]);

  if (!shouldGetGas || gasStations.length === 0) {
    return {
      orderedStops: [userStop, groceryStop],
      totalDistanceMeters: directRouteDistance,
      estimatedScore: directRouteDistance,
      selectedStoreId: selectedStore.id,
    };
  }

  let bestPlan: TripPlan | null = null;

  for (const gasStation of gasStations) {
    const gasStop: RouteStop = {
      id: gasStation.id,
      name: gasStation.name,
      address: gasStation.address,
      type: 'gas',
      coordinates: gasStation.coordinates,
      pricePerGallon: gasStation.pricePerGallon,
    };

    const candidateRoutes: RouteStop[][] = [
      [userStop, gasStop, groceryStop],
      [userStop, groceryStop, gasStop],
    ];

    for (const orderedStops of candidateRoutes) {
      const totalDistanceMeters = getRouteDistance(
        orderedStops.map(stop => stop.coordinates)
      );
      const totalDistanceMiles = totalDistanceMeters / 1609.34;
      const estimatedScore =
        totalDistanceMiles * DISTANCE_PRIORITY_WEIGHT +
        gasStation.pricePerGallon * GAS_PRICE_WEIGHT;

      if (!bestPlan || estimatedScore < bestPlan.estimatedScore) {
        bestPlan = {
          orderedStops,
          totalDistanceMeters,
          estimatedScore,
          selectedStoreId: selectedStore.id,
          selectedGasStationId: gasStation.id,
        };
      }
    }
  }

  return bestPlan;
};
