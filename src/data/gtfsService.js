import routesData from './gtfs/routes.json';
import stopsData from './gtfs/stops.json';
import stopTimesData from './gtfs/stop_times.json';
import shapesData from './gtfs/shapes.json';
import tripsData from './gtfs/trips.json';

const processLines = () => {
  try {
    // Check if critical data is available
    if (!routesData || !Array.isArray(routesData)) {
      console.warn("GTFS: routesData is missing or invalid.");
      return [];
    }

    // 1. Pre-index data for O(1) lookups with safety checks
    const tripsByRoute = new Map();
    if (Array.isArray(tripsData)) {
      tripsData.forEach(t => {
        if (t && t.route_id && !tripsByRoute.has(t.route_id)) {
          tripsByRoute.set(t.route_id, t);
        }
      });
    }

    const stopsById = new Map();
    if (Array.isArray(stopsData)) {
      stopsData.forEach(s => {
        if (s && s.stop_id) stopsById.set(s.stop_id, s);
      });
    }

    const stopTimesByTrip = new Map();
    if (Array.isArray(stopTimesData)) {
      stopTimesData.forEach(st => {
        if (st && st.trip_id) {
          if (!stopTimesByTrip.has(st.trip_id)) stopTimesByTrip.set(st.trip_id, []);
          stopTimesByTrip.get(st.trip_id).push(st);
        }
      });
    }

    // 2. Map routes with optimized lookups and fallback values
    return routesData.map(route => {
      try {
        const trip = tripsByRoute.get(route.route_id);
        const tripId = trip ? trip.trip_id : null;
        const shapeId = trip ? trip.shape_id : route.route_id;

        const shapePoints = (shapesData && shapesData[shapeId]) || [];

        const routeStops = tripId 
          ? (stopTimesByTrip.get(tripId) || [])
              .sort((a, b) => a.stop_sequence - b.stop_sequence)
              .map(st => {
                const stop = stopsById.get(st.stop_id);
                return {
                  name: stop ? stop.stop_name : 'Parada desconocida',
                  coords: stop ? [stop.stop_lat, stop.stop_lon] : [0, 0]
                };
              })
          : [];

        return {
          id: (route.route_id || 'unknown').replace('route_', ''),
          name: route.route_long_name || 'Sin nombre',
          shortName: route.route_short_name || '?',
          color: `#${route.route_color || '3b82f6'}`,
          textColor: `#${route.route_text_color || 'ffffff'}`,
          type: (route.route_id || '').includes('_u') ? 'urbano' : 'interurbano',
          schedule: route.schedule_summary || '',
          price: route.price_summary || '',
          origin: route.origin || '',
          destination: route.destination || '',
          operatorName: route.operator_name || 'Desconocido',
          operatorUrl: route.operator_url || '',
          path: Array.isArray(shapePoints) ? shapePoints : [],
          stops: routeStops
        };
      } catch (err) {
        console.error(`GTFS: Error processing route ${route?.route_id}:`, err);
        return null;
      }
    }).filter(Boolean); // Remove routes that failed to process
  } catch (error) {
    console.error("GTFS: Critical error in processLines:", error);
    return [];
  }
};

export const busLines = processLines();

export const getBusLineById = (id) => {
  return busLines.find(l => l.id === id);
};

export const gtfsService = {
  getGtfsLines: () => busLines
};
