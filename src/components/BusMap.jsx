import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { busLines } from '../data/busLines';
import stopsData from '../data/gtfs/stops.json';
import poisData from '../data/gtfs/pois.json';
import { Navigation, ShoppingBag, Landmark, MapPin } from 'lucide-react';

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
const STATIONS = [];
const TRAIN_LINES = [];

const getStationIcon = () => {
  const html = `
    <div class="station-marker-circle" style="
      background: #84cc16; 
      width: 10px; 
      height: 10px; 
      border-radius: 50%; 
      border: 1.25px solid white; 
      box-shadow: 0 0 0 0.75px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.2);
    "></div>
  `;
  return L.divIcon({ html, className: 'custom-station-container', iconSize: [10, 10], iconAnchor: [5, 5] });
};

const getPOIIcon = (type, isPremium) => {
  let color = isPremium ? 'var(--primary)' : '#64748b';
  let html = `
    <div class="poi-marker ${isPremium ? 'premium' : ''}" style="background: ${color}; color: white; padding: 2px; border-radius: 50%; border: 1px solid white; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 5px rgba(0,0,0,0.2);">
      ${type === 'shop' ? '<svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>' :
        '<svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>'}
    </div>
  `;
  return L.divIcon({ html, className: 'custom-poi-container', iconSize: [12, 12], iconAnchor: [6, 6] });
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
            {vehicle.lineId.includes('l') ? `Línea ${vehicle.lineId.replace('l', '')}` : 'Bus'}
          </div>
          <div style={{ fontSize: '0.8rem' }}>Próxima parada: <strong>{vehicle.lastStop}</strong></div>
        </div>
      </Popup>
    </Marker>
  );
});

const MapFitter = ({ selectedLineId, isNearbySelection }) => {
  const map = useMap();
  const lastFittedId = useRef(null);

  useEffect(() => {
    // Only fit bounds if the selected ID changed and it's not a nearby selection
    if (selectedLineId && selectedLineId !== lastFittedId.current) {
      if (!isNearbySelection) {
        const line = busLines.find(l => l.id === selectedLineId);
        if (line && line.path.length > 0) {
          map.fitBounds(line.path, { 
            padding: [50, 50, 300, 50], 
            animate: true, 
            duration: 1.5 
          });
          lastFittedId.current = selectedLineId;
        }
      } else {
        // If it's a nearby selection, we just acknowledge the ID without fitting
        lastFittedId.current = selectedLineId;
      }
    } else if (!selectedLineId) {
      // Clear last fitted ID when nothing is selected
      lastFittedId.current = null;
      // We removed the flyTo center on deselect to give user more freedom
    }
  }, [selectedLineId, map, isNearbySelection]);

  return null;
};

const POIFitter = ({ selectedPOI }) => {
  const map = useMap();

  useEffect(() => {
    if (selectedPOI && selectedPOI.coords) {
      map.flyTo(selectedPOI.coords, 16, { animate: true, duration: 1.5 });
    }
  }, [selectedPOI, map]);

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
  const [isLocating, setIsLocating] = useState(false);

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
          maximumAge: 5000
        });
      } catch (err) {
        position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 7000,
          maximumAge: 10000
        });
      }

      const { latitude, longitude } = position.coords;
      const latlng = [latitude, longitude];

      const targetZoom = 15;
      const point = map.project(latlng, targetZoom);
      const offsetPoint = point.add([0, window.innerHeight * 0.18]);
      const targetCenter = map.unproject(offsetPoint, targetZoom);

      map.flyTo(targetCenter, targetZoom, {
        animate: true,
        duration: 2,
        easeLinearity: 0.25
      });

      window.dispatchEvent(new CustomEvent('onUserLocation', { detail: { lat: latitude, lng: longitude } }));
    } catch (e) {
      alert("GPS desactivado o sin señal.");
      console.error(e);
    } finally {
      setIsLocating(false);
    }
  };

  useEffect(() => {
    const handleRequest = () => handleLocate();
    window.addEventListener('requestUserLocation', handleRequest);
    return () => window.removeEventListener('requestUserLocation', handleRequest);
  }, [handleLocate]);

  return (
    <button
      onClick={handleLocate}
      className={`crystal-fab ${isLocating ? 'locating' : ''}`}
      disabled={isLocating}
      style={{
        position: 'absolute',
        bottom: 'calc(7.5rem + var(--safe-area-bottom))',
        right: '1.2rem',
        zIndex: 1000
      }}
      title="Mi ubicación"
    >
      <Navigation size={20} className={isLocating ? "spinning-icon" : "blue-icon"} />
    </button>
  );
};

const VEGA_BAJA_CENTER = [38.0844, -0.7442];
const VEGA_BAJA_ZOOM = 10;
const VEGA_BAJA_BOUNDS = [[37.5, -1.5], [38.7, 0.0]];

// Memoized Background Stops Layer
const StopsLayer = React.memo(() => {
  return (
    <>
      {stopsData.map(stop => {
        if (stop.is_station) {
          return (
            <Marker 
              key={stop.stop_id} 
              position={[stop.stop_lat, stop.stop_lon]} 
              icon={getStationIcon()}
              zIndexOffset={100}
            >
              <Popup>
                <div style={{ fontWeight: 800 }}>{stop.stop_name}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>Estación de Autobús</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>Vega Baja - GVA</div>
              </Popup>
            </Marker>
          );
        }
        
        return (
          <CircleMarker 
            key={stop.stop_id} 
            center={[stop.stop_lat, stop.stop_lon]} 
            pathOptions={{ 
              color: '#1e3a8a', 
              fillColor: '#84cc16', 
              fillOpacity: 0.4, 
              weight: 0.6, 
              opacity: 0.4 
            }} 
            radius={2.2}
            interactive={true}
          >
            <Popup>
              <div style={{ fontWeight: 800 }}>{stop.stop_name}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.6 }}>ID: {stop.stop_id}</div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
});

// Memoized All Lines Layer
const LinesLayer = React.memo(({ selectedLineId, onSelectLine }) => {
  return (
    <>
      {busLines.map(line => {
        const isSelected = selectedLineId === line.id;
        if (!line.path || line.path.length === 0) return null;
        
        return (
          <React.Fragment key={line.id}>
            <Polyline
              positions={line.path}
              pathOptions={{
                color: '#ffffff',
                weight: isSelected ? 7 : 4.5,
                opacity: isSelected ? 0.6 : 0.2,
                lineJoin: 'round'
              }}
              interactive={false}
            />
            <Polyline
              positions={line.path}
              pathOptions={{
                color: line.color,
                weight: isSelected ? 5 : 3,
                opacity: isSelected ? 1 : 0.7,
                lineJoin: 'round'
              }}
              eventHandlers={{
                click: () => onSelectLine(line.id)
              }}
            >
              <Popup><strong>{line.name}</strong></Popup>
            </Polyline>
          </React.Fragment>
        );
      })}
    </>
  );
});

// Memoized Train & Stations Layer
const StaticInfrastructureLayer = React.memo(() => {
  return (
    <>
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
      {STATIONS.map((s, i) => (
        <Marker key={i} position={s.coords} icon={getStationIcon()}>
          <Popup><strong>{s.name}</strong></Popup>
        </Marker>
      ))}
    </>
  );
});

const POIsLayer = React.memo(() => {
  return (
    <>
      {poisData.map(poi => (
        <Marker key={poi.id} position={poi.coords} icon={getPOIIcon(poi.type, poi.isPremium)}>
          <Popup>
            <div style={{ padding: '4px' }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '2px' }}>{poi.name}</div>
              <div style={{ fontSize: '0.75rem', opacity: 0.7, marginBottom: '4px' }}>{poi.description}</div>
              {poi.isPremium && (
                <div style={{ background: 'var(--primary)', color: 'white', fontSize: '0.65rem', padding: '2px 6px', borderRadius: '4px', fontWeight: 700, display: 'inline-block' }}>OFERTA VEGAGO</div>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
});

export default function BusMap({ selectedLineId, selectedPOI, onSelectLine, theme, vehicles, isNearbySelection }) {
  const [userPos, setUserPos] = useState(null);

  useEffect(() => {
    const handleUserLocation = (e) => setUserPos(e.detail);
    window.addEventListener('onUserLocation', handleUserLocation);
    return () => window.removeEventListener('onUserLocation', handleUserLocation);
  }, []);

  const tileUrl = useMemo(() => theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', [theme]);

  const selectedLine = useMemo(() => busLines.find(l => l.id === selectedLineId), [selectedLineId]);

  return (
    <div className="map-container">
      <MapContainer
        center={VEGA_BAJA_CENTER}
        zoom={VEGA_BAJA_ZOOM}
        minZoom={9}
        maxBounds={VEGA_BAJA_BOUNDS}
        maxBoundsViscosity={0.6}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        zoomControl={false}
        attributionControl={false}
        preferCanvas={true}
      >
        <TileLayer url={tileUrl} updateWhenIdle={true} />
        <MapFitter selectedLineId={selectedLineId} isNearbySelection={isNearbySelection} />
        <POIFitter selectedPOI={selectedPOI} />
        <LocateControl />
        <OutOfBoundsControl />
        
        {selectedPOI && (
          <Marker 
            position={selectedPOI.coords}
            icon={L.divIcon({
              className: 'custom-station-container',
              html: `
                <div class="station-marker-circle selected-highlight" style="
                  background: #84cc16; 
                  width: 10px; 
                  height: 10px; 
                  border-radius: 50%; 
                  border: 1.5px solid white; 
                  box-shadow: 0 0 10px rgba(132, 204, 22, 0.8), 0 0 0 1px rgba(132, 204, 22, 0.4);
                "></div>
              `,
              iconSize: [10, 10],
              iconAnchor: [5, 5]
            })}
          >
            <Popup>
              <strong>{selectedPOI.name}</strong><br/>
              {selectedPOI.address || selectedPOI.description}
            </Popup>
          </Marker>
        )}

        {userPos && (
          <CircleMarker
            center={[userPos.lat, userPos.lng]}
            pathOptions={{ color: '#ffffff', fillColor: '#84cc16', fillOpacity: 1, weight: 3 }}
            radius={8}
            zIndexOffset={1000}
          />
        )}

        <StaticInfrastructureLayer />
        <POIsLayer />
        <StopsLayer />
        <LinesLayer selectedLineId={selectedLineId} onSelectLine={onSelectLine} />

        {/* Dynamic Vehicles */}
        {vehicles.map(v => (
          <BusMarker
            key={v.id}
            vehicle={v}
            isSelected={selectedLineId === v.lineId}
            onClick={onSelectLine}
          />
        ))}

        {/* Selected Line Highlighting (Stops) */}
        {selectedLine && selectedLine.stops?.map((stop, idx) => (
          <CircleMarker 
            key={`${selectedLineId}-${idx}`} 
            center={stop.coords} 
            pathOptions={{ color: '#ffffff', fillColor: selectedLine.color, fillOpacity: 1, weight: 2.8 }} 
            radius={idx === 0 || idx === selectedLine.stops.length - 1 ? 7.5 : 5.5} 
          >
            <Popup>
              <strong>{stop.name}</strong>
              <div style={{ fontSize: '0.8rem', color: '#666' }}>{selectedLine.name}</div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
