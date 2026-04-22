import React, { useState, useEffect, useMemo } from 'react';
import { Search, MapPin, Sun, Moon, ArrowLeft, ArrowUpDown, Navigation, Clock, ChevronRight, History, X } from 'lucide-react';
import { busLines } from '../data/busLines';
import { useTranslation } from '../hooks/useTranslation';

export default function SearchBar({ onSelectLine, selectedLineId, theme, setTheme, lang, setLang, onMenuOpen }) {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isPlanning, setIsPlanning] = useState(false);
  const { t, Flag } = useTranslation(lang);

  useEffect(() => {
    if (selectedLineId) setIsPlanning(false);
  }, [selectedLineId]);

  useEffect(() => {
    document.documentElement.className = theme;
  }, [theme]);

  const nextLang = { es: 'va', va: 'gb', gb: 'ru', ru: 'es' };

  const suggestedRoutes = useMemo(() => {
    if (!origin && !destination) return [];
    const search = (origin + ' ' + destination).toLowerCase().trim();
    if (!search) return [];
    return busLines.filter(line => {
      const lineData = (line.shortName + line.name + line.origin + line.destination + (line.stops ? line.stops.map(s => s.name).join(' ') : '')).toLowerCase();
      return search.split(/\s+/).every(term => lineData.includes(term));
    }).slice(0, 5);
  }, [origin, destination]);

  const recentSearches = [{ from: "Orihuela", to: "Torrevieja" }, { from: "Alicante", to: "Aeropuerto" }];

  return (
    <>
      {!isPlanning && (
        <div className="search-planner-container">
          <div className="crystal-header-floating">
            <button 
              onClick={() => setLang(nextLang[lang] || 'es')} 
              className="lang-toggle"
              aria-label={t.changeLang || 'Cambiar idioma'}
            >
              <Flag />
            </button>
            <div 
              className="search-trigger" 
              onClick={() => { setIsPlanning(true); if (onMenuOpen) onMenuOpen(); }}
              role="button"
              aria-label={t.placeholder}
            >
              <Search size={18} className="search-icon" /><span className="placeholder">{t.placeholder}</span>
            </div>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} 
              className="theme-toggle"
              aria-label={theme === 'dark' ? 'Activar modo claro' : 'Activar modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </div>
      )}
      {isPlanning && (
        <>
          <div className="planner-backdrop" onClick={() => setIsPlanning(false)}></div>
          <div className="planner-modal">
            <div className="planner-header-sticky">
              <div className="planner-top-actions"><button onClick={() => setIsPlanning(false)} className="back-btn"><ArrowLeft size={20} /></button><div className="planner-title">{t.plannerTitle}</div><button className="swap-btn" onClick={() => { const temp = origin; setOrigin(destination); setDestination(temp); }}><ArrowUpDown size={18} /></button></div>
              <div className="planner-inputs-container">
                <div className="input-row">
                  <div className="dot origin-dot"></div>
                  <input autoFocus type="text" placeholder={t.origin} value={origin} onChange={(e) => setOrigin(e.target.value)} />
                  {origin && <button onClick={() => setOrigin('')} className="clear-input-btn"><X size={14} /></button>}
                  <button onClick={() => setOrigin(t.origin)} className="location-btn"><Navigation size={16} /></button>
                </div>
                <div className="input-divider"></div>
                <div className="input-row">
                  <div className="dot dest-dot"></div>
                  <input type="text" placeholder={t.dest} value={destination} onChange={(e) => setDestination(e.target.value)} />
                  {destination && <button onClick={() => setDestination('')} className="clear-input-btn"><X size={14} /></button>}
                </div>
              </div>
            </div>
            <div className="planner-scroll-content">
              {suggestedRoutes.length > 0 ? (
                <div className="results-section">
                  <h3 className="section-title">{t.routes}</h3>
                  {suggestedRoutes.map(line => (
                    <div key={line.id} className="premium-route-card" onClick={() => { onSelectLine(line.id); setIsPlanning(false); }}>
                      <div className="line-pill" style={{ background: line.color }}>{line.shortName}</div>
                      <div className="route-details"><div className="route-name">{line.name}</div><div className="route-meta"><Clock size={12} /> {line.schedule.split('|')[0]}<span className="dot-separator">•</span>{line.type}</div></div>
                      <ChevronRight size={18} className="arrow-icon" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="recent-section">
                  <h3 className="section-title">{t.recent}</h3>
                  {recentSearches.map((search, i) => (
                    <div key={i} className="recent-item" onClick={() => { setOrigin(search.from); setDestination(search.to); }}><History size={16} className="history-icon" /><div className="recent-text"><span>{search.from}</span><ChevronRight size={12} className="to-arrow" /><span>{search.to}</span></div></div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
