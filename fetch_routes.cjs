const fs = require('fs');
const https = require('https');

// Read the current file as a string
let content = fs.readFileSync('./src/data/busLines.js', 'utf8');

// A quick hack to extract the busLines array without importing it
// We will evaluate the file content but mock out export
let busLines = [];
let coords = {};
let defaultColors = [];

try {
  // Replace export const with var so we can eval it
  let evalContent = content.replace('export const busLines =', 'busLines =')
                           .replace('export const getBusLineById', '//');
  
  eval(evalContent);
} catch(e) {
  console.error("Error evaluating busLines.js", e);
  process.exit(1);
}

const getRoute = (line, callback) => {
  // We use stops to get the route, since path might be just straight lines
  const points = line.stops.map(s => s.coords);
  
  // OSRM needs lon,lat
  const coordString = points.map(c => `${c[1]},${c[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.code === 'Ok' && parsed.routes && parsed.routes[0]) {
          // Map back to lat, lon
          line.path = parsed.routes[0].geometry.coordinates.map(c => [c[1], c[0]]);
          console.log(`Fetched route for ${line.id}: ${line.path.length} points`);
        } else {
          console.error(`Failed to get route for ${line.id}: ${parsed.code}`);
        }
      } catch(e) {
         console.error(`Parse error for ${line.id}:`, e.message);
      }
      callback();
    });
  }).on('error', err => {
    console.error(`HTTP error for ${line.id}:`, err.message);
    callback();
  });
};

// Process in sequence to avoid rate limits
let index = 0;
const processNext = () => {
  if (index >= busLines.length) {
    // Done! Write back to file
    const newContent = `// Coordenadas base
const coords = {
  Alicante: [38.3452, -0.4810],
  PilarHoradada: [37.8680, -0.7925],
  Torrevieja: [37.9787, -0.6822],
  Orihuela: [38.0844, -0.9442],
  Callosa: [38.1219, -0.8797],
  LaMata: [38.0267, -0.6558],
  LagoJardin: [37.9555, -0.7169],
  Desamparados: [38.0674, -0.9631],
  MilPalmeras: [37.8821, -0.7588],
  Guardamar: [38.0877, -0.6521],
  LosMontesinos: [38.0264, -0.7628],
  HospitalTorrevieja: [37.9545, -0.7047],
  HospitalVegaBaja: [38.1064, -0.8692],
  Crevillent: [38.2494, -0.8105],
  Aeropuerto: [38.2822, -0.5582],
  ZeniaBoulevard: [37.9272, -0.7350],
  Almoradi: [38.1097, -0.7933],
  Rojales: [38.0863, -0.7226],
  Abanilla: [38.2045, -1.0408],
  LaMurada: [38.1884, -0.9634],
  Benferri: [38.1407, -0.9611],
  SantaPola: [38.1917, -0.5658],
  Elche: [38.2669, -0.6983],
  SantVicent: [38.3962, -0.5255],
  ElAltet: [38.2709, -0.5513],
  LaMarina: [38.1384, -0.6433],
  Campoamor: [37.8967, -0.7635]
};

const defaultColors = ['#2563EB', '#16A34A', '#DC2626', '#9333EA', '#EA580C', '#0891B2', '#D97706', '#4F46E5', '#BE123C', '#1D4ED8'];

export const busLines = ${JSON.stringify(busLines, null, 2)};

export const getBusLineById = (id) => busLines.find(line => line.id === id);
`;
    fs.writeFileSync('./src/data/busLines.js', newContent);
    console.log("Updated src/data/busLines.js");
    return;
  }
  
  getRoute(busLines[index], () => {
    // Wait 500ms before next request to respect rate limit
    setTimeout(() => {
      index++;
      processNext();
    }, 500);
  });
};

console.log("Starting to fetch routes...");
processNext();
