import React, { useState, useEffect, useMemo } from 'react';
import BusMap from './components/BusMap';
import Footer from './components/Footer';
import RouteDetails from './components/RouteDetails';
import SearchBar from './components/SearchBar';
import { useBusSimulation } from './hooks/useBusSimulation';
import './index.css';

function App() {
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [selectedPOI, setSelectedPOI] = useState(null);
  const [theme, setTheme] = useState('light');
  const [lang, setLang] = useState('es');
  const [isNearbySelection, setIsNearbySelection] = useState(false);

  // Single source of truth for moving vehicles
  const vehicles = useBusSimulation();

  useEffect(() => {
    document.documentElement.lang = lang === 'va' ? 'ca' : lang;
  }, [lang]);

  // Shared favorites state with robust parsing
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('vegago_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error("Error loading favorites:", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem('vegago_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = (lineId) => {
    setFavorites(prev =>
      prev.includes(lineId)
        ? prev.filter(id => id !== lineId)
        : [...prev, lineId]
    );
  };

  const handleSelectLine = (id, options = {}) => {
    setSelectedLineId(id);
    setIsNearbySelection(!!options.isNearby);
  };

  return (
    <div className={`app-container ${theme}`}>
      <BusMap
        selectedLineId={selectedLineId}
        selectedPOI={selectedPOI}
        onSelectLine={handleSelectLine}
        theme={theme}
        vehicles={vehicles}
        isNearbySelection={isNearbySelection}
      />

      <SearchBar
        onSelectLine={handleSelectLine}
        onSelectPOI={setSelectedPOI}
        selectedLineId={selectedLineId}
        theme={theme}
        setTheme={setTheme}
        lang={lang}
        setLang={setLang}
      />

      <RouteDetails
        selectedLineId={selectedLineId}
        onClose={() => setSelectedLineId(null)}
        lang={lang}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        vehicles={vehicles}
      />

      <Footer
        onSelectLine={handleSelectLine}
        onSelectPOI={setSelectedPOI}
        selectedLineId={selectedLineId}
        lang={lang}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
      />
    </div>
  );
}

export default App;

