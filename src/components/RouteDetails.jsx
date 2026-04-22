import React, { useMemo } from 'react';
import { X, Clock, CreditCard, Star, Zap, Globe } from 'lucide-react';
import { busLines } from '../data/busLines';
import { useTranslation } from '../hooks/useTranslation';
import { getVehicleStopIndex } from '../utils/geo';
import { sanitizeUrl } from '../utils/security';

export default function RouteDetails({ selectedLineId, onClose, lang, favorites, toggleFavorite, vehicles }) {
  const line = useMemo(() => busLines.find(l => l.id === selectedLineId), [selectedLineId]);
  const { t } = useTranslation(lang);
  
  const isFav = favorites.includes(selectedLineId);
  const lineVehicles = useMemo(() => vehicles.filter(v => v.lineId === selectedLineId), [vehicles, selectedLineId]);

  // Security: Sanitize operator URL to prevent javascript: or malformed links
  const safeOperatorUrl = useMemo(() => {
    if (!line?.operatorUrl) return '#';
    return sanitizeUrl(line.operatorUrl);
  }, [line]);

  if (!line) return (
    <div className={`bottom-sheet ${selectedLineId ? 'open' : ''}`}>
      <div className="sheet-handle-container" onClick={onClose} style={{cursor: 'pointer'}}><div className="sheet-handle"></div></div>
    </div>
  );

  const showPriceLink = !line.price || ['Consultar', 'No visible', 'No localizada', 'Consultar en web'].includes(line.price);

  return (
    <div className={`bottom-sheet ${selectedLineId ? 'open' : ''}`}>
      <div className="sheet-handle-container" onClick={onClose} style={{cursor: 'pointer'}}><div className="sheet-handle"></div></div>
      <div className="sheet-content">
        <div className="route-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="line-badge large" style={{ backgroundColor: line.color, boxShadow: `0 0 15px ${line.color}44` }}>{line.shortName}</div>
            <div>
              <h2 className="route-title" style={{ margin: 0, letterSpacing: '-0.03em' }}>{line.name}</h2>
              <div className="route-subtitle" style={{ fontSize: '0.85rem', opacity: 0.7, fontWeight: 500 }}>{line.origin} ↔ {line.destination}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button className="close-dropdown glass-btn" onClick={() => toggleFavorite(selectedLineId)} style={{ color: isFav ? '#f59e0b' : 'var(--text-color)' }}><Star size={20} fill={isFav ? "currentColor" : "none"} /></button>
            <button onClick={onClose} className="close-dropdown glass-btn"><X size={20} /></button>
          </div>
        </div>

        <div className="info-grid">
          <div className="info-box-premium">
            <div className="info-label"><Clock size={14} /> {t.schedule}</div>
            <div className="info-value schematic-schedule">
              {(() => {
                const parts = line.schedule.split('(');
                const range = parts[0].trim();
                const notes = parts[1] ? parts[1].replace(')', '').trim() : null;
                return (
                  <>
                    <div className="schedule-range">{range}</div>
                    {notes && <div className="schedule-notes">{notes}</div>}
                  </>
                );
              })()}
            </div>
          </div>
          <div className="info-box-premium">
            <div className="info-label"><CreditCard size={14} /> {t.price}</div>
            <div className="info-value">
              {showPriceLink ? (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <a href={safeOperatorUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>{t.consult} <Globe size={12} /></a>
                </div>
              ) : (
                <span>{line.price}</span>
              )}
            </div>
          </div>
        </div>

        <div className="stops-scroll-area">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6 }}>
              {lineVehicles.length > 0 ? t.stops : (lang === 'va' ? 'Recorregut i Parades' : lang === 'gb' ? 'Route and Stops' : lang === 'ru' ? 'Маршрут и остановки' : 'Recorrido y Paradas')}
            </h3>
            {lineVehicles.length === 0 && (
              <span style={{ fontSize: '0.7rem', fontWeight: 700, opacity: 0.4, textTransform: 'uppercase' }}>
                {lang === 'va' ? 'Fora de servici' : lang === 'gb' ? 'Out of service' : lang === 'ru' ? 'Вne службы' : 'Fuera de servicio'}
              </span>
            )}
          </div>
          
          <div className="stops-timeline-premium" style={{ '--route-color': line.color }}>
            {line.stops && line.stops.map((stop, index) => {
              const isEndpoint = index === 0 || index === line.stops.length - 1;
              const approachingVehicles = lineVehicles.filter(v => getVehicleStopIndex(line, v) === index);
              return (
                <div className={`stop-item-premium ${isEndpoint ? 'endpoint' : ''}`} key={index}>
                  <div className="stop-node-container">
                    <div className="stop-node" style={{ backgroundColor: approachingVehicles.length > 0 ? 'var(--primary)' : 'var(--route-color)' }}></div>
                    {index < line.stops.length - 1 && <div className="stop-line"></div>}
                  </div>
                  <div className="stop-info-premium">
                    <div className="stop-name" style={{ fontWeight: (isEndpoint || approachingVehicles.length > 0) ? 800 : 500, color: approachingVehicles.length > 0 ? 'var(--primary)' : 'inherit' }}>{stop.name}</div>
                    {approachingVehicles.length > 0 && <div className="approaching-badge"><Zap size={10} fill="currentColor" /> {t.approaching}</div>}
                  </div>
                </div>
              );
            })}
          </div>

          {line.operatorUrl && (
            <div style={{ marginTop: '2rem', paddingBottom: '1rem' }}>
              <a 
                href={safeOperatorUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="crystal-button-full"
                style={{ textDecoration: 'none' }}
              >
                <Globe size={18} />
                {t.moreInfo} {line.operatorName ? `(${line.operatorName})` : ''}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

