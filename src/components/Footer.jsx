import React, { useState, useEffect, useMemo } from 'react';
import { Route, Clock, User, ChevronRight, Search, Bus, Mail, Phone, X, Star, AlertTriangle, Train, Car, Send, Users, Map as MapIcon, Calendar, Bell, Info, Heart, MapPin, Navigation } from 'lucide-react';
import { busLines } from '../data/busLines';
import taxis from '../data/taxis.json';
import { useAlerts } from '../hooks/useAlerts';
import { useTranslation } from '../hooks/useTranslation';
import { getDistance } from '../utils/geo';
import { sanitizeInput } from '../utils/security';

const Footer = ({ onSelectLine, selectedLineId, lang, onMenuOpen, favorites, toggleFavorite }) => {
  const [activeMenu, setActiveMenu] = useState(null); // 'lines', 'alerts', 'about', 'report', 'taxi'
  const [scheduleSearch, setScheduleSearch] = useState('');
  const [scheduleTab, setScheduleTab] = useState('Todas');
  const [userLocation, setUserLocation] = useState(null);
  const { t } = useTranslation(lang);

  // Community Reports State with robust parsing
  const [reports, setReports] = useState(() => {
    try {
      const saved = localStorage.getItem('vegago_community_reports');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading community reports:", e);
      return [];
    }
  });


  // New Report Form State
  const [reportForm, setReportForm] = useState({ lineId: busLines[0].id, type: 'delay', reason: '' });

  // Pre-calculate distances once per location update to optimize search performance
  const lineDistances = useMemo(() => {
    if (!userLocation) return {};
    const distances = {};
    const userLat = userLocation.lat;
    const userLng = userLocation.lng;
    const userCoords = [userLat, userLng];

    for (const line of busLines) {
      if (!line.stops || line.stops.length === 0) {
        distances[line.id] = Infinity;
        continue;
      }

      let minDist = Infinity;
      for (const stop of line.stops) {
        const d = getDistance(stop.coords, userCoords);
        if (d < minDist) minDist = d;
      }
      distances[line.id] = minDist;
    }
    return distances;
  }, [userLocation]);

  const mockAlerts = useAlerts(busLines.map(l => l.id));

  // Consolidate mock alerts and community-validated alerts
  const allAlerts = useMemo(() => {
    const validatedReports = reports
      .filter(r => r.votes >= 3)
      .map(r => ({
        lineId: r.lineId,
        type: r.type,
        msg: r.type === 'full_bus' ? (lang === 'va' ? 'Bus Plen' : lang === 'ru' ? 'Автобус переполнен' : lang === 'gb' ? 'Full Bus' : 'Autobús lleno') + ' (Community)' :
          r.type === 'works' ? (lang === 'va' ? 'Obres o desviació' : lang === 'ru' ? 'Дорожные работы' : lang === 'gb' ? 'Roadworks' : 'Obras o desvío') + ' (Community)' :
            (lang === 'va' ? 'Retard' : lang === 'ru' ? 'Задержка' : lang === 'gb' ? 'Delay' : 'Retraso') + ' (Community)',
        reason: r.reason,
        severity: r.type === 'canceled' ? 'high' : 'medium',
        timestamp: r.timestamp,
        isCommunity: true
      }));

    const now = new Date().getTime();
    const activeValidated = validatedReports.filter(r => (now - new Date(r.timestamp).getTime()) < 10 * 60 * 60 * 1000);

    return [...mockAlerts, ...activeValidated].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [mockAlerts, reports, lang]);

  useEffect(() => {
    localStorage.setItem('vegago_community_reports', JSON.stringify(reports));
  }, [reports]);

  useEffect(() => {
    const handleUserLocation = (e) => {
      setUserLocation(e.detail);
      setActiveMenu('nearby');
      if (onMenuOpen) onMenuOpen();
    };
    window.addEventListener('onUserLocation', handleUserLocation);
    return () => window.removeEventListener('onUserLocation', handleUserLocation);
  }, [onMenuOpen]);

  const handleReport = () => {
    const lastReport = localStorage.getItem('vegago_last_report');
    const now = new Date().getTime();

    if (lastReport && (now - parseInt(lastReport)) < 3600000) {
      alert(t.cooldownMsg);
      return;
    }

    const sanitizedReason = sanitizeInput(reportForm.reason);

    setReports(prev => {
      const existing = prev.find(r => r.lineId === reportForm.lineId && r.type === reportForm.type);
      if (existing) {
        return prev.map(r => r === existing ? { ...r, votes: r.votes + 1 } : r);
      } else {
        return [...prev, { ...reportForm, reason: sanitizedReason, votes: 1, timestamp: new Date().toISOString() }];
      }
    });

    localStorage.setItem('vegago_last_report', now.toString());
    alert(t.reportSuccess);
    setReportForm(prev => ({ ...prev, reason: '' })); // Clear input after success
    setActiveMenu('alerts');
  };

  const nearbyLines = useMemo(() => {
    if (!userLocation) return [];
    return busLines
      .map(line => ({ ...line, distance: lineDistances[line.id] || Infinity }))
      .filter(l => l.distance <= 10) // Only within 10km for a better user experience
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 3);
  }, [userLocation, lineDistances]);

  const filteredLines = useMemo(() => {
    return busLines.filter(line => {
      const matchesSearch = line.name.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        line.shortName.toLowerCase().includes(scheduleSearch.toLowerCase()) ||
        line.id.includes(scheduleSearch);
      let matchesTab = true;
      if (scheduleTab === 'Interurbana') matchesTab = line.type === 'interurbano';
      if (scheduleTab === 'Urbana') matchesTab = line.type === 'urbano';
      if (scheduleTab === 'Favoritas') matchesTab = (favorites || []).includes(line.id);
      return matchesSearch && matchesTab;
    }).map(line => ({
      ...line,
      distance: lineDistances[line.id] || Infinity
    })).sort((a, b) => {
      if (scheduleTab === 'Favoritas') return 0;

      const aIsCe = a.shortName.startsWith('CE');
      const bIsCe = b.shortName.startsWith('CE');

      if (aIsCe && !bIsCe) return -1;
      if (!aIsCe && bIsCe) return 1;

      if (aIsCe && bIsCe) {
        return a.shortName.localeCompare(b.shortName);
      }

      const aNum = parseInt(a.shortName);
      const bNum = parseInt(b.shortName);

      if (!isNaN(aNum) && !isNaN(bNum)) {
        if (aNum !== bNum) return aNum - bNum;
        return a.shortName.localeCompare(b.shortName); // Tie breaker for 4A, 4B
      }

      if (!isNaN(aNum)) return -1;
      if (!isNaN(bNum)) return 1;

      return a.shortName.localeCompare(b.shortName);
    });
  }, [scheduleSearch, scheduleTab, userLocation, favorites]);

  const toggleMenu = (menu) => {
    if (activeMenu === menu) {
      setActiveMenu(null);
    } else {
      setActiveMenu(menu);
      if (selectedLineId && onSelectLine) onSelectLine(null);
      if (onMenuOpen) onMenuOpen();
    }
  };

  return (
    <>
      {/* Lines View */}
      {activeMenu === 'lines' && (
        <div className="lines-dropdown crystal-card">
          <div className="sheet-handle-container" onClick={() => setActiveMenu(null)} style={{ cursor: 'pointer' }}><div className="sheet-handle"></div></div>
          <div className="dropdown-header"><h3>{t.linesHeader}</h3><button onClick={() => setActiveMenu(null)} className="close-dropdown"><X size={20} /></button></div>
          <div className="ios-search-container" style={{ margin: '0.8rem 1.5rem 1rem' }}><Search size={16} style={{ opacity: 0.5 }} /><input type="text" placeholder={t.searchPlace} value={scheduleSearch} onChange={(e) => setScheduleSearch(e.target.value)} /></div>
          <div className="ios-tabs" style={{ margin: '0 1.5rem 1rem' }}>
            {['Todas', 'Interurbana', 'Urbana', 'Favoritas'].map(tab => (
              <button key={tab} className={`tab-btn ${scheduleTab === tab ? 'active' : ''}`} onClick={() => setScheduleTab(tab)}>{tab === 'Todas' ? t.all : tab === 'Interurbana' ? t.inter : tab === 'Urbana' ? t.urb : t.favs}</button>
            ))}
          </div>
          <div className="lines-list">
            {filteredLines.map(line => (
              <div key={line.id} className={`line-item ${selectedLineId === line.id ? 'selected' : ''}`} onClick={() => { onSelectLine(line.id); setActiveMenu(null); }}>
                <div className="line-icon" style={{ backgroundColor: line.color }}>{line.shortName}</div>
                <div className="line-info"><span className="line-name">{line.name}</span><span className="line-meta">{line.distance !== Infinity ? `${line.distance.toFixed(1)} km` : line.type}</span></div>
                <button className="fav-btn-inline" onClick={(e) => { e.stopPropagation(); toggleFavorite(line.id); }}>
                  <div className={`fav-icon-glass ${(favorites || []).includes(line.id) ? 'active' : ''}`}>
                    <Star 
                      size={16} 
                      fill={(favorites || []).includes(line.id) ? "white" : "none"} 
                      color={(favorites || []).includes(line.id) ? "white" : "var(--primary)"}
                      strokeWidth={2.5} 
                    />
                  </div>
                </button>
                <ChevronRight size={18} style={{ opacity: 0.3 }} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts View */}
      {activeMenu === 'alerts' && (
        <div className="lines-dropdown crystal-card">
          <div className="sheet-handle-container" onClick={() => setActiveMenu(null)} style={{ cursor: 'pointer' }}><div className="sheet-handle"></div></div>
          <div className="dropdown-header"><div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><AlertTriangle size={24} color="var(--primary)" /><h3>{t.alertsHeader}</h3></div><button onClick={() => setActiveMenu(null)} className="close-dropdown"><X size={20} /></button></div>
          <div className="lines-list" style={{ maxHeight: '45vh', overflowY: 'auto', padding: '0.8rem 1rem 0.5rem' }}>
            {allAlerts.length > 0 ? allAlerts.map((alert, i) => {
              const line = busLines.find(l => l.id === alert.lineId);
              return (
                <div key={i} className="line-item" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)', padding: '0.8rem 1.5rem' }}>
                  <div className="line-icon" style={{ backgroundColor: line?.color || 'var(--primary)', width: '36px', height: '36px', fontSize: '0.8rem' }}>{line?.shortName || alert.lineId.replace('l', '').toUpperCase()}</div>
                  <div className="line-info">
                    <span className="line-name" style={{ fontSize: '0.9rem' }}>{alert.msg}</span>
                    <span className="line-meta" style={{ color: alert.severity === 'high' ? '#ef4444' : 'var(--text-muted)' }}>
                      {t[alert.type] || alert.type} • {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {alert.reason && (
                      <div style={{ fontSize: '0.8rem', opacity: 0.6, marginTop: '4px', fontStyle: 'italic', background: 'rgba(0,0,0,0.03)', padding: '4px 8px', borderRadius: '6px' }}>
                        "{alert.reason}"
                      </div>
                    )}
                  </div>
                  {alert.isCommunity ? <Users size={16} color="var(--primary)" style={{ opacity: 0.6 }} /> : <ChevronRight size={18} style={{ opacity: 0.3 }} />}
                </div>
              );
            }) : (
              <div style={{ textAlign: 'center', padding: '3rem 1rem', opacity: 0.5 }}><Clock size={40} style={{ marginBottom: '1rem' }} /><p>{t.noAlerts}</p></div>
            )}
          </div>
          <div style={{ padding: '1rem 1.5rem' }}><button className="crystal-button-full" onClick={() => setActiveMenu('report')}><AlertTriangle size={18} /> {t.reportBtn}</button></div>
        </div>
      )}

      {/* Taxi View */}
      {activeMenu === 'taxi' && (
        <div className="lines-dropdown crystal-card">
          <div className="sheet-handle-container" onClick={() => setActiveMenu(null)} style={{ cursor: 'pointer' }}><div className="sheet-handle"></div></div>
          <div className="dropdown-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Phone size={24} color="var(--primary)" />
              <h3>{t.taxiHeader}</h3>
            </div>
            <button onClick={() => setActiveMenu(null)} className="close-dropdown"><X size={20} /></button>
          </div>
          <div className="lines-list">
            {taxis.map((taxi, i) => (
              <a key={i} href={`tel:${taxi.phone}`} className="line-item" style={{ textDecoration: 'none', color: 'inherit' }}>
                <div className="line-icon" style={{ background: 'var(--primary)', opacity: 0.8 }}><Phone size={18} color="white" /></div>
                <div className="line-info"><span className="line-name">{taxi.name}</span><span className="line-meta">{taxi.city} • {taxi.phone}</span></div>
                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>{t.callNow}</div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Report Form */}
      {activeMenu === 'report' && (
        <div className="lines-dropdown crystal-card">
          <div className="dropdown-header"><div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}><Users size={24} color="var(--primary)" /><h3>{t.reportHeader}</h3></div><button onClick={() => setActiveMenu('alerts')} className="close-dropdown"><X size={20} /></button></div>
          <div className="lines-list" style={{ padding: '1.5rem', maxHeight: '50vh' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.7 }}>{t.selectLine}</label>
            <div style={{ display: 'flex', gap: '0.8rem', overflowX: 'auto', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              {busLines.map(line => (
                <button key={line.id} onClick={() => setReportForm(prev => ({ ...prev, lineId: line.id }))} style={{ flexShrink: 0, width: '50px', height: '50px', borderRadius: '12px', background: reportForm.lineId === line.id ? line.color : 'rgba(0,0,0,0.05)', color: reportForm.lineId === line.id ? 'white' : 'inherit', border: 'none', fontWeight: 800, transition: 'all 0.2s' }}>{line.shortName}</button>
              ))}
            </div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.7 }}>{t.selectType}</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '2rem' }}>
              {['delay', 'works', 'full_bus'].map(type => (
                <button key={type} onClick={() => setReportForm(prev => ({ ...prev, type }))} style={{ padding: '1rem', borderRadius: '12px', border: '2px solid', borderColor: reportForm.type === type ? 'var(--primary)' : 'transparent', background: reportForm.type === type ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.05)', fontWeight: 700, fontSize: '0.85rem' }}>{t[type]}</button>
              ))}
            </div>

            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.8rem', opacity: 0.7 }}>{t.reasonLabel}</label>
            <textarea
              value={reportForm.reason}
              onChange={(e) => setReportForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder={t.reasonPlaceholder}
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.1)',
                background: 'rgba(0,0,0,0.03)',
                fontSize: '0.9rem',
                fontFamily: 'inherit',
                resize: 'none',
                marginBottom: '2rem'
              }}
            />

            <button className="crystal-button-full" onClick={handleReport} style={{ background: 'var(--primary)', color: 'white' }}><Send size={18} /> {t.sendReport}</button>
            <p style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.5, textAlign: 'center' }}>{t.communityNote}</p>
          </div>
        </div>
      )}

      {/* About View */}
      {activeMenu === 'about' && (
        <div className="lines-dropdown crystal-card about-overlay">
          <div className="sheet-handle-container" onClick={() => setActiveMenu(null)} style={{ cursor: 'pointer' }}><div className="sheet-handle"></div></div>
          <div className="dropdown-header"><h3>{t.aboutTitle}</h3><button onClick={() => setActiveMenu(null)} className="close-dropdown"><X size={20} /></button></div>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <Bus size={48} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '1rem' }}>VegaGO</h2>
            <p style={{ opacity: 0.7, fontSize: '0.9rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>{t.aboutDesc}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', opacity: 0.6, fontSize: '0.8rem', marginBottom: '1.5rem' }}>
              <span>www.vegago.app</span>
              <span>hello@vegago.app</span>
              <span>{t.version}</span>
            </div>
            <p style={{ fontSize: '0.7rem', opacity: 0.4, borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>{t.legal}</p>
          </div>
        </div>
      )}
      {/* Nearby Lines View (Compact Popup) */}
      {activeMenu === 'nearby' && (
        <div className="lines-dropdown crystal-card nearby-overlay" style={{ bottom: 'calc(7.5rem + var(--safe-area-bottom))', maxHeight: 'auto' }}>
          <div className="sheet-handle-container" onClick={() => setActiveMenu(null)} style={{ cursor: 'pointer' }}><div className="sheet-handle"></div></div>
          <div className="dropdown-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
              <Navigation size={22} color="var(--primary)" />
              <h3 style={{ fontSize: '1rem', fontWeight: 800 }}>{lang === 'va' ? 'Línies properes' : lang === 'gb' ? 'Nearby lines' : lang === 'ru' ? 'Ближайшие линии' : 'Líneas cercanas'}</h3>
            </div>
            <button onClick={() => setActiveMenu(null)} className="close-dropdown"><X size={18} /></button>
          </div>
          <div className="nearby-content" style={{ padding: '0.5rem 1rem 1rem' }}>
            {nearbyLines.length > 0 ? (
              nearbyLines.map(line => (
                <div key={line.id} className="premium-route-card" style={{ marginBottom: '0.5rem', padding: '0.75rem' }} onClick={() => { onSelectLine(line.id); setActiveMenu(null); }}>
                  <div className="line-pill" style={{ background: line.color, width: '38px', height: '22px', fontSize: '0.75rem' }}>{line.shortName}</div>
                  <div className="route-details">
                    <div className="route-name" style={{ fontSize: '0.85rem' }}>{line.name}</div>
                    <div className="route-meta" style={{ fontSize: '0.7rem' }}>
                      <MapPin size={10} /> {line.distance.toFixed(1)} km
                    </div>
                  </div>
                  <ChevronRight size={16} className="arrow-icon" />
                </div>
              ))
            ) : (
              <div style={{ textAlign: 'center', padding: '1rem', opacity: 0.6, fontSize: '0.85rem' }}>
                {lang === 'va' ? 'No hi ha línies prop' : lang === 'gb' ? 'No lines nearby' : lang === 'ru' ? 'Нет линий поблизости' : 'No hay líneas cerca'}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="crystal-footer" role="navigation" aria-label="Navegación principal">
        <button 
          className={`nav-btn ${activeMenu === 'lines' ? 'active' : ''}`} 
          onClick={() => toggleMenu('lines')}
          aria-label={t.lines}
          aria-expanded={activeMenu === 'lines'}
        >
          <Route size={22} /><span>{t.lines}</span>
        </button>
        <button 
          className={`nav-btn ${activeMenu === 'alerts' ? 'active' : ''}`} 
          onClick={() => toggleMenu('alerts')} 
          style={{ position: 'relative' }}
          aria-label={t.alerts}
          aria-expanded={activeMenu === 'alerts'}
        >
          <AlertTriangle size={22} />
          {allAlerts.length > 0 && <span style={{ position: 'absolute', top: '10px', right: '25%', width: '8px', height: '8px', background: '#f59e0b', borderRadius: '50%', border: '2px solid white' }}></span>}
          <span>{t.alerts}</span>
        </button>
        <button
          className={`nav-btn ${activeMenu === 'about' ? 'active' : ''}`}
          onClick={() => toggleMenu('about')}
          aria-label="Sobre VegaGO"
          aria-expanded={activeMenu === 'about'}
          style={{
            zIndex: 10,
            transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
        >
          <div className="glass-circle" style={{
            transform: activeMenu === 'about' ? 'scale(1.1) translateY(-5px)' : 'scale(1)',
          }}>
            <Bus size={30} color="var(--primary)" />
            <span style={{
              fontWeight: 900,
              color: 'var(--primary)',
              textTransform: 'none',
              letterSpacing: '-0.02em',
              fontSize: '0.75rem',
              lineHeight: 1
            }}>VegaGO</span>
          </div>
        </button>
        <button 
          className={`nav-btn ${activeMenu === 'taxi' ? 'active' : ''}`} 
          onClick={() => toggleMenu('taxi')}
          aria-label="Taxis"
          aria-expanded={activeMenu === 'taxi'}
        >
          <Phone size={22} /><span>Taxi</span>
        </button>
        <button 
          className={`nav-btn ${activeMenu === 'lines' && scheduleTab === 'Favoritas' ? 'active' : ''}`} 
          onClick={() => { if (activeMenu === 'lines' && scheduleTab === 'Favoritas') { setActiveMenu(null); } else { setActiveMenu('lines'); setScheduleTab('Favoritas'); if (onMenuOpen) onMenuOpen(); if (selectedLineId) onSelectLine(null); } }}
          aria-label={t.favs}
        >
          <Heart size={22} /><span>{t.favs}</span>
        </button>
      </div>
    </>
  );
};

export default Footer;
