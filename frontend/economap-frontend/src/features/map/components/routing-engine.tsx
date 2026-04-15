'use client';

import { useEffect } from 'react';

import { GasStation, RouteStop, Store, TripPlan } from '@/types';

interface RoutingEngineProps {
  userLocation: { lat: number; lng: number } | null;
  selectedStore: Store | null;
  gasStations: GasStation[];
  shouldGetGas: boolean;
  getRouteDistance: ((waypoints: { lat: number; lng: number }[]) => Promise<number>) | null;
  onRouteCalculated: (tripPlan: TripPlan | null) => void;
}

const ESTIMATED_COST_PER_MILE = 0.22;
const ESTIMATED_FILL_UP_GALLONS = 10;

export const RoutingEngine = ({
  userLocation,
  selectedStore,
  gasStations,
  shouldGetGas,
  getRouteDistance,
  onRouteCalculated,
}: RoutingEngineProps) => {
  useEffect(() => {
    let isCancelled = false;

    const calculateBestTrip = async () => {
      if (!userLocation || !selectedStore || !getRouteDistance) {
        onRouteCalculated(null);
        return;
      }

      const groceryStop: RouteStop = {
        id: selectedStore.id,
        name: selectedStore.name,
        address: selectedStore.address,
        type: 'grocery' as const,
        coordinates: selectedStore.coordinates,
      };

      try {
        if (!shouldGetGas || gasStations.length === 0) {
          const totalDistanceMeters = await getRouteDistance([
            userLocation,
            selectedStore.coordinates,
          ]);

          if (isCancelled) {
            return;
          }

          onRouteCalculated({
            orderedStops: [
              {
                id: 'user-location',
                name: 'Your Location',
                address: 'Current position',
                type: 'user',
                coordinates: userLocation,
              },
              groceryStop,
            ],
            totalDistanceMeters,
            estimatedScore: totalDistanceMeters,
            selectedStoreId: selectedStore.id,
          });
          return;
        }

        let bestPlan: TripPlan | null = null;

        for (const gasStation of gasStations) {
          const gasStop: RouteStop = {
            id: gasStation.id,
            name: gasStation.name,
            address: gasStation.address,
            type: 'gas' as const,
            coordinates: gasStation.coordinates,
            pricePerGallon: gasStation.pricePerGallon,
          };

          const routeOrders = [
            [userLocation, gasStation.coordinates, selectedStore.coordinates],
            [userLocation, selectedStore.coordinates, gasStation.coordinates],
          ];

          for (const routeCoordinates of routeOrders) {
            const totalDistanceMeters = await getRouteDistance(routeCoordinates);

            if (isCancelled) {
              return;
            }

            const distanceMiles = totalDistanceMeters / 1609.34;
            const estimatedScore =
              distanceMiles * ESTIMATED_COST_PER_MILE +
              gasStation.pricePerGallon * ESTIMATED_FILL_UP_GALLONS;

            const orderedStops: RouteStop[] = routeCoordinates.map((coordinates, index) => {
              if (index === 0) {
                return {
                  id: 'user-location',
                  name: 'Your Location',
                  address: 'Current position',
                  type: 'user',
                  coordinates,
                };
              }

              const isGasStop = coordinates === gasStation.coordinates;
              return isGasStop ? gasStop : groceryStop;
            });

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

        onRouteCalculated(bestPlan);
      } catch (error) {
        console.error('Unable to calculate route', error);
        onRouteCalculated(null);
      }
    };

    void calculateBestTrip();

    return () => {
      isCancelled = true;
    };
  }, [gasStations, getRouteDistance, onRouteCalculated, selectedStore, shouldGetGas, userLocation]);

  return null;
};

export default RoutingEngine;
