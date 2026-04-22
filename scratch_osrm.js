const https = require('https');

const getRoute = (coords) => {
  // coords is array of [lat, lon]
  // OSRM needs lon,lat;lon,lat
  const coordString = coords.map(c => `${c[1]},${c[0]}`).join(';');
  const url = `https://router.project-osrm.org/route/v1/driving/${coordString}?overview=full&geometries=geojson`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const parsed = JSON.parse(data);
      console.log('Status:', parsed.code);
      if (parsed.routes && parsed.routes[0]) {
        console.log('Points count:', parsed.routes[0].geometry.coordinates.length);
      }
    });
  }).on('error', err => console.error(err));
};

getRoute([[38.3452, -0.4810], [38.2822, -0.5582]]);
