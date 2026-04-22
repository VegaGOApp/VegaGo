const fs = require('fs');
const path = require('path');

const dataDir = 'c:\\Users\\User\\Documents\\Antigra\\Vega2\\src\\data\\gtfs';

// 1. Update trips.json
const tripsPath = path.join(dataDir, 'trips.json');
let trips = JSON.parse(fs.readFileSync(tripsPath, 'utf8'));

// Rename existing l5, l6
trips = trips.map(t => {
    if (t.route_id === 'route_l5') {
        return { ...t, route_id: 'route_l5_u', trip_id: 'trip_l5_u_outbound', shape_id: 'route_l5_u' };
    }
    if (t.route_id === 'route_l6') {
        return { ...t, route_id: 'route_l6_u', trip_id: 'trip_l6_u_outbound', shape_id: 'route_l6_u' };
    }
    return t;
});

// Add new urban trips
const urbanRoutes = ['route_a_u', 'route_a2_u', 'route_b_u', 'route_c_u', 'route_df_u', 'route_e_u', 'route_g_u', 'route_h_u'];
urbanRoutes.forEach(rid => {
    if (!trips.find(t => t.route_id === rid)) {
        trips.push({
            route_id: rid,
            service_id: 'everyday',
            trip_id: `trip_${rid.replace('route_', '')}_outbound`,
            trip_headsign: 'Servicio Urbano',
            direction_id: 0,
            shape_id: rid
        });
    }
});

fs.writeFileSync(tripsPath, JSON.stringify(trips, null, 2));
console.log('Updated trips.json');

// 2. Update stop_times.json
const stPath = path.join(dataDir, 'stop_times.json');
let st = JSON.parse(fs.readFileSync(stPath, 'utf8'));

st = st.map(s => {
    if (s.trip_id === 'trip_l5_outbound') return { ...s, trip_id: 'trip_l5_u_outbound' };
    if (s.trip_id === 'trip_l6_outbound') return { ...s, trip_id: 'trip_l6_u_outbound' };
    return s;
});

// Add placeholder stop for new urban lines (Torrevieja Center - stop_6)
urbanRoutes.forEach(rid => {
    const tid = `trip_${rid.replace('route_', '')}_outbound`;
    if (!st.find(s => s.trip_id === tid)) {
        st.push({
            trip_id: tid,
            arrival_time: null,
            departure_time: null,
            stop_id: 'stop_6', // Torrevieja Central
            stop_sequence: 1
        });
    }
});

fs.writeFileSync(stPath, JSON.stringify(st, null, 2));
console.log('Updated stop_times.json');

// 3. Update shapes.json
const shapesPath = path.join(dataDir, 'shapes.json');
let shapes = JSON.parse(fs.readFileSync(shapesPath, 'utf8'));

if (shapes['route_l5'] && !shapes['route_l5_u']) {
    shapes['route_l5_u'] = shapes['route_l5'];
    delete shapes['route_l5'];
}
if (shapes['route_l6'] && !shapes['route_l6_u']) {
    shapes['route_l6_u'] = shapes['route_l6'];
    delete shapes['route_l6'];
}

// Add placeholder shapes for new urban lines
const torreviejaCoords = [37.9792, -0.6758];
urbanRoutes.forEach(rid => {
    if (!shapes[rid]) {
        // Small random path around Torrevieja so it shows a dot or small line
        shapes[rid] = [
            torreviejaCoords,
            [torreviejaCoords[0] + 0.005, torreviejaCoords[1] + 0.005]
        ];
    }
});

fs.writeFileSync(shapesPath, JSON.stringify(shapes));
console.log('Updated shapes.json');
