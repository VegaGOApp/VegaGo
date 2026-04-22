import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { busLines } from '../data/busLines';
import { Navigation } from 'lucide-react';
import L from 'leaflet';
import { Geolocation } from '@capacitor/geolocation';
import { createPortal } from 'react-dom';

// Fix for default marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/images/marker-icon-2x.png',
  iconUrl: '/images/marker-icon.png',
  shadowUrl: '/images/marker-shadow.png',
});

// 1. Move static data outside to prevent re-creation on every render
const STATIONS = [
  { name: 'Aeropuerto Alicante-Elche', coords: [38.2822, -0.5582], type: 'airport' },
  { name: 'Orihuela Miguel Hernández', coords: [38.0779, -0.9447], type: 'ave' },
  { name: 'Elche Alta Velocidad', coords: [38.2461, -0.7668], type: 'ave' },
  { name: 'Alicante Terminal', coords: [38.3446, -0.4939], type: 'ave' },
  { name: 'Callosa de Segura', coords: [38.1226, -0.8752], type: 'cercanias' },
  { name: 'San Isidro - Albatera - Catral', coords: [38.1724, -0.8286], type: 'cercanias' },
  { name: 'Crevillent', coords: [38.2285, -0.8166], type: 'cercanias' },
  { name: 'Elche Parque', coords: [38.2669, -0.6983], type: 'cercanias' },
  { name: 'San Gabriel', coords: [38.3291, -0.5087], type: 'cercanias' },
  { name: 'Torrellano', coords: [38.2896, -0.5825], type: 'cercanias' },
  { name: 'Elche Carrús', coords: [38.2689, -0.7067], type: 'cercanias' },
  { name: 'Universitat d\'Alacant', coords: [38.3841, -0.5284], type: 'cercanias' },
  { name: 'Sant Vicent Centre', coords: [38.3946, -0.5287], type: 'cercanias' },
  { name: 'Hospital General Dr. Balmis (Alicante)', coords: [38.3585, -0.4886], type: 'hospital' },
  { name: 'Hospital General Universitario de Elche', coords: [38.2612, -0.6861], type: 'hospital' },
  { name: 'Hospital Universitario de Torrevieja', coords: [37.9615, -0.7138], type: 'hospital' },
  { name: 'Hospital Vega Baja (Orihuela)', coords: [38.0772, -0.8451], type: 'hospital' },
  { name: 'Hospital Universitario del Vinalopó', coords: [38.2520, -0.7100], type: 'hospital' }
];

const TRAIN_LINES = [
  { 
    name: 'Línea C-1 Cercanías', 
    info: 'Alicante - Elche - Orihuela (Murcia)', 
    color: '#ef4444',
    path: [[38.3446, -0.4939], [38.3360, -0.5015], [38.3291, -0.5087], [38.3150, -0.5350], [38.3000, -0.5650], [38.2896, -0.5825], [38.2800, -0.6200], [38.2700, -0.6600], [38.2669, -0.6983], [38.2689, -0.7067], [38.2580, -0.7450], [38.2450, -0.7850], [38.2285, -0.8166], [38.2100, -0.8180], [38.1900, -0.8240], [38.1724, -0.8286], [38.1450, -0.8500], [38.1226, -0.8752], [38.1050, -0.9000], [38.0779, -0.9447]]
  },
  { 
    name: 'Línea C-3 Cercanías', 
    info: 'Alicante - Universidad - San Vicente', 
    color: '#a855f7',
    path: [[38.3446, -0.4939], [38.3580, -0.4990], [38.3720, -0.5150], [38.3841, -0.5284], [38.3946, -0.5287]]
  }
];

const getStationIcon = (type) => {
  let html = '';
  const svgSize = 12;
  if (type === 'airport') {
    html = `<div class="station-icon airport"><svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.2-1.1.6L3 8l6 5-4 4-3-1-2 2 4 4 2-2-1-3 4-4 5 6 1.2-.7c.4-.2.7-.6.6-1.1Z"/></svg></div>`;
  } else if (type === 'ave') {
    html = `<div class="station-icon ave"><svg width="${svgSize}" height="${svgSize}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="3" width="16" height="16" rx="2"/><path d="M4 11h16"/><path d="M12 3v8"/><path d="M8 19l-2 3"/><path d="M18 22l-2-3"/><path d="M8 15h0"/><path d="M16 15h0"/></svg></div>`;
  } else if (type === 'hospital') {
    html = `<div class="station-icon hospital" style="font-weight: 900; font-size: 11px;">H</div>`;
  } else {
    html = `<div class="station-icon cercanias">C</div>`;
  }
  return L.divIcon({ html, className: 'custom-station-container', iconSize: [20, 20], iconAnchor: [10, 10] });
};

// 2. Memoized Bus Marker for high performance
const BusMarker = React.memo(({ vehicle, isSelected, onClick }) => {
  const icon = useMemo(() => L.divIcon({
    html: `
      <div class="bus-marker-wrapper ${isSelected ? 'selected' : ''}" style="transform: rotate(${vehicle.heading}deg)">
        <div class="bus-marker-body" style="background-color: ${vehicle.lineColor}">
          <div class="bus-marker-arrow"></div>
        </div>
      </div>
    `,
    className: 'custom-bus-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  }), [isSelected, vehicle.heading, vehicle.lineColor]);

  return (
    <Marker 
      position={vehicle.coords} 
      icon={icon}
      eventHandlers={{ click: () => onClick(vehicle.lineId) }}
    >
      <Popup>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, color: vehicle.lineColor }}>
            {vehicle.lineId.includes('l') ? `Línea ${vehicle.lineId.replace('l','')}` : 'Bus'}
          </div>
          <div style={{ fontSize: '0.8rem' }}>Próxima parada: <strong>{vehicle.lastStop}</strong></div>
        </div>
      </Popup>
    </Marker>
  );
});

const MapFitter = ({ selectedLineId }) => {
  const map = useMap();
  const isFirstRender = useRef(true);
  
  useEffect(() => {
    if (selectedLineId) {
      const line = busLines.find(l => l.id === selectedLineId);
      if (line && line.path.length > 0) {
        map.fitBounds(line.path, { padding: [50, 150], animate: true, duration: 1.5 });
      }
      isFirstRender.current = false;
    } else if (!isFirstRender.current) {
      map.flyTo([38.0844, -0.7442], 10, { animate: true, duration: 1 });
    } else {
      isFirstRender.current = false;
    }
  }, [selectedLineId, map]);

  return null;
};

const OutOfBoundsControl = () => {
  const map = useMap();
  const [isOut, setIsOut] = useState(false);
  const VEGA_BAJA_CENTER = [38.0844, -0.7442];

  useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const distance = map.distance(center, VEGA_BAJA_CENTER);
      setIsOut(distance > 35000);
    }
  });

  if (!isOut) return null;

  return (
    <div className="crystal-card out-of-bounds" onClick={() => { map.flyTo(VEGA_BAJA_CENTER, 11); setIsOut(false); }}>
      <Navigation size={16} /> Centrar Mapa
    </div>
  );
};

const LocateControl = () => {
  const map = useMap();
  const [container, setContainer] = useState(null);
  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    const corner = map._controlContainer.querySelector('.leaflet-bottom.leaflet-right');
    if (corner) setContainer(corner);
  }, [map]);

  const handleLocate = async () => {
    if (isLocating) return;
    setIsLocating(true);
    
    try {
      const permissions = await Geolocation.checkPermissions();
      if (permissions.location !== 'granted') {
        const request = await Geolocation.requestPermissions();
        if (request.location !== 'granted') {
          alert("Permisos de ubicación denegados. Por favor, habilítalos en ajustes.");
          setIsLocating(false);
          return;
        }
      }

      let position;
      try {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 7000,
          maximumAge: 5000 // Use recent cache if available (5s)
        });
      } catch (err) {
        console.warn("High accuracy failed, trying coarse location fallback...");
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 10000 // Coarse can be a bit older
        });
      }

      const { latitude, longitude } = position.coords;
      const latlng = [latitude, longitude];
      
      map.flyTo(latlng, 15);
      window.dispatchEvent(new CustomEvent('onUserLocation', { detail: { lat: latitude, lng: longitude } }));
    } catch (e) {
      if (e.message?.includes('timeout')) {
        alert("Tiempo de espera agotado. Asegúrate de estar en un lugar con señal GPS.");
      } else {
        alert("GPS desactivado o sin señal. Por favor, activa la ubicación en los ajustes del teléfono.");
      }
      console.error('Geolocation error details:', e);
    } finally {
      setIsLocating(false);
    }
  };

  if (!container) return null;

  return createPortal(
    <div className="leaflet-control leaflet-bar" style={{ border: 'none', background: 'none' }}>
      <button 
        onClick={handleLocate} 
        className={`crystal-fab ${isLocating ? 'locating' : ''}`} 
        disabled={isLocating}
        title="Mi ubicación"
      >
        <Navigation size={20} className={isLocating ? "spinning-icon" : "blue-icon"} />
      </button>
    </div>,
    container
  );
};

export default function BusMap({ selectedLineId, onSelectLine, theme, vehicles }) {
  const tileUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const linesToRender = useMemo(() => selectedLineId ? [busLines.find(l => l.id === selectedLineId)] : busLines, [selectedLineId]);

  return (
    <div className="map-container">
      <MapContainer 
        center={[38.0844, -0.7442]} 
        zoom={11} 
        minZoom={9} 
        maxBounds={[[37.5, -1.5], [38.7, 0.0]]} 
        maxBoundsViscosity={1.0} 
        style={{ height: '100%', width: '100%', zIndex: 0 }} 
        zoomControl={false} 
        attributionControl={false}
        preferCanvas={true} // Performance boost for geometries
      >
        <TileLayer url={tileUrl} updateWhenIdle={true} />
        <MapFitter selectedLineId={selectedLineId} />
        <LocateControl />
        <OutOfBoundsControl />

        {/* Render Train Lines */}
        {TRAIN_LINES.map((line, i) => (
          <React.Fragment key={`train-line-${i}`}>
            <Polyline 
              positions={line.path} 
              pathOptions={{ color: line.color, weight: 7, opacity: 0.9, lineJoin: 'round' }} 
            />
            <Polyline 
              positions={line.path} 
              pathOptions={{ color: '#ffffff', weight: 3, opacity: 1, lineJoin: 'round' }} 
            >
              <Popup>
                <div style={{ textAlign: 'center' }}>
                  <strong style={{ color: line.color }}>{line.name}</strong>
                  <div style={{ fontSize: '0.85rem', marginTop: '4px' }}>{line.info}</div>
                </div>
              </Popup>
            </Polyline>
          </React.Fragment>
        ))}

        {/* Render Stations */}
        {STATIONS.map((s, i) => <Marker key={i} position={s.coords} icon={getStationIcon(s.type)}><Popup><strong>{s.name}</strong></Popup></Marker>)}
        
        {/* Render Vehicles (Buses) with memoized component */}
        {vehicles.map(v => (
          <BusMarker 
            key={v.id} 
            vehicle={v} 
            isSelected={selectedLineId === v.lineId} 
            onClick={onSelectLine} 
          />
        ))}

        {linesToRender.map(line => line && (
          <React.Fragment key={line.id}>
            <Polyline positions={line.path} pathOptions={{ color: '#ffffff', weight: selectedLineId ? 10 : 0, opacity: 0.8 }} />
            <Polyline positions={line.path} pathOptions={{ color: line.color, weight: selectedLineId ? 6 : 4, opacity: selectedLineId ? 1 : 0.4, lineJoin: 'round', lineCap: 'round' }} eventHandlers={{ click: () => onSelectLine(line.id) }} />
            {selectedLineId === line.id && line.stops?.map((stop, idx) => (
              <CircleMarker key={idx} center={stop.coords} pathOptions={{ color: '#ffffff', fillColor: line.color, fillOpacity: 1, weight: 2.8 }} radius={idx === 0 || idx === line.stops.length-1 ? 7.5 : 5.5} eventHandlers={{ click: () => onSelectLine(line.id) }}>
                <Popup><strong>{stop.name}</strong><div style={{fontSize: '0.8rem', color: '#666'}}>{line.name}</div></Popup>
              </CircleMarker>
            ))}
          </React.Fragment>
        ))}
      </MapContainer>
    </div>
  );
}
