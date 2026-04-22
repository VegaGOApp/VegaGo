import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import busLines
import { busLines } from '../src/data/busLines.js';

// GTFS-like data arrays
const routes = [];
const stopsMap = new Map();
const trips = [];
const stopTimes = [];
const shapes = {};

let stopIdCounter = 1;

// Helper to generate a stable stop ID based on name and coords
const getStopId = (name, lat, lon) => {
  const key = `${name}_${lat.toFixed(4)}_${lon.toFixed(4)}`;
  if (!stopsMap.has(key)) {
    stopsMap.set(key, {
      stop_id: `stop_${stopIdCounter++}`,
      stop_name: name,
      stop_lat: lat,
      stop_lon: lon,
      zone_id: 'vega_baja' // default zone
    });
  }
  return stopsMap.get(key).stop_id;
};

// Process each line
busLines.forEach(line => {
  if (!line) return;

  const route_id = `route_${line.id}`;
  
  // 1. Add Route
  routes.push({
    route_id: route_id,
    route_short_name: line.shortName || line.id.replace('l', ''),
    route_long_name: line.name,
    route_type: 3, // Bus
    route_color: line.color ? line.color.replace('#', '') : '2563EB',
    route_text_color: 'FFFFFF',
    schedule_summary: line.schedule,
    price_summary: line.price,
    origin: line.origin,
    destination: line.destination
  });

  // 2. Extract Shape
  shapes[route_id] = line.path;

  // 3. Create a single abstract "Trip" for now
  const trip_id = `trip_${line.id}_outbound`;
  trips.push({
    route_id: route_id,
    service_id: 'everyday',
    trip_id: trip_id,
    trip_headsign: line.destination,
    direction_id: 0,
    shape_id: route_id
  });

  // 4. Extract Stops and Stop Times
  if (line.stops && Array.isArray(line.stops)) {
    line.stops.forEach((stop, index) => {
      const stop_id = getStopId(stop.name, stop.coords[0], stop.coords[1]);
      
      stopTimes.push({
        trip_id: trip_id,
        arrival_time: null, // For now, we don't have exact schedules per stop
        departure_time: null,
        stop_id: stop_id,
        stop_sequence: index + 1
      });
    });
  }
});

// Prepare to save
const dataDir = path.join(__dirname, '../src/data/gtfs');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Convert stopsMap to array
const stops = Array.from(stopsMap.values());

fs.writeFileSync(path.join(dataDir, 'routes.json'), JSON.stringify(routes, null, 2));
fs.writeFileSync(path.join(dataDir, 'stops.json'), JSON.stringify(stops, null, 2));
fs.writeFileSync(path.join(dataDir, 'trips.json'), JSON.stringify(trips, null, 2));
fs.writeFileSync(path.join(dataDir, 'stop_times.json'), JSON.stringify(stopTimes, null, 2));
fs.writeFileSync(path.join(dataDir, 'shapes.json'), JSON.stringify(shapes)); // not pretty printed to save space

console.log('GTFS migration completed successfully!');
console.log(`Exported ${routes.length} routes, ${stops.length} unique stops, ${trips.length} trips, and ${stopTimes.length} stop times.`);
