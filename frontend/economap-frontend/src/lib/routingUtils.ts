export const getRouteDistance = (waypoints: { lat: number; lng: number }[]): Promise<number> => {
  return new Promise(async (resolve, reject) => {
    if (typeof window === 'undefined') {
      // Running on the server, return 0 or handle as appropriate
      return resolve(0);
    }

    const L = await import('leaflet');
    await import('leaflet-routing-machine');

    if (waypoints.length < 2) {
      return resolve(0);
    }

    const leafletWaypoints = waypoints.map(wp => L.Routing.waypoint(L.latLng(wp.lat, wp.lng)));

    const router = L.Routing.osrmv1();
        // @ts-expect-error The OSRMv1 router does not have up-to-date types for the route callback.
    router.route(leafletWaypoints, (err: Error, routes: L.Routing.IRoute[]) => {
      if (err) {
        console.error("Error routing:", err);
        reject(err);
      } else if (routes && routes.length > 0) {
        resolve(routes[0].summary.totalDistance);
      } else {
        resolve(0); // No route found
      }
    });
  });
};

// Haversine formula to calculate distance between two lat/lng points
export const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lon2-lon1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
};
