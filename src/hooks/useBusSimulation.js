import { useState, useEffect } from 'react';
import { busLines } from '../data/busLines';

/**
 * useBusSimulation
 * A hook that simulates bus positions based on existing routes and shapes.
 * This makes the map feel "alive" even without a real-time API.
 */
export const useBusSimulation = () => {
  const [vehicles, setVehicles] = useState([]);

  const isLineActive = (scheduleStr) => {
    if (!scheduleStr) return false;
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;
    const day = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
    const isWeekend = day === 0 || day === 6;

    // Handle "No localizada" or "No visible" - use a conservative default
    if (scheduleStr.includes('No localizada') || scheduleStr.includes('No visible')) {
      // Standard service hours fallback: 08:00 - 21:00
      return currentHour >= 8 && currentHour < 21;
    }

    // Extract time ranges (e.g. "07:00 - 23:25")
    // This matches formats like HH:mm - HH:mm, HH:mm-HH:mm, etc.
    const rangeMatch = scheduleStr.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
    if (rangeMatch) {
      const [startH, startM] = rangeMatch[1].split(':').map(Number);
      const [endH, endM] = rangeMatch[2].split(':').map(Number);
      
      const startTime = startH * 60 + startM;
      const endTime = endH * 60 + endM;
      
      let isActiveRange = false;
      // If end time is earlier than start time, it crosses midnight
      if (endTime < startTime) {
        isActiveRange = currentTimeInMinutes >= startTime || currentTimeInMinutes <= endTime;
      } else {
        isActiveRange = currentTimeInMinutes >= startTime && currentTimeInMinutes <= endTime;
      }

      // If we found a range, we MUST respect it, but we also check if it's limited to Laborables/Weekends
      const mentionsLaborables = scheduleStr.includes('Laborables');
      const mentionsWeekends = scheduleStr.toLowerCase().includes('fines de semana');
      
      if (mentionsLaborables && !mentionsWeekends && isWeekend) return false;
      // Note: If it says "Laborables ... Fines de semana: Sí", then the range check is enough
      
      return isActiveRange;
    }

    // Fallback for cases without a clear range
    // Always apply a basic hour check (e.g. 08:00 - 21:00) to fallbacks to avoid 4 AM buses
    const isDaytime = currentHour >= 8 && currentHour < 21;

    if (scheduleStr.toLowerCase().includes('fines de semana') && isWeekend) return isDaytime;
    if (scheduleStr.toLowerCase().includes('laborables') && !isWeekend) return isDaytime;

    // Fallback for other descriptions (like "3 expediciones L-S")
    if (scheduleStr.length > 5) {
      return currentHour >= 8 && currentHour < 20;
    }

    return false;
  };

  useEffect(() => {
    // 1. Initialize persistent vehicles once
    const initialVehicles = [];
    busLines.forEach(line => {
      if (!line.path || line.path.length < 2) return;
      
      // Determine a stable number of buses based on line ID (1 to 2 buses)
      const lineHash = line.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const numBuses = (lineHash % 2) + 1;
      
      for (let i = 0; i < numBuses; i++) {
        initialVehicles.push({
          id: `v-${line.id}-${i}`,
          lineId: line.id,
          lineColor: line.color,
          // Fixed spacing offset for this specific vehicle
          spacingOffset: i * (100 / numBuses),
          // Deterministic seed for speed variation (if wanted, but keeping it simple for now)
          speedMultiplier: 1 + ((lineHash % 10) / 50) 
        });
      }
    });

    const updatePositions = () => {
      const now = Date.now();
      
      const movedVehicles = initialVehicles
        .filter(v => {
          const line = busLines.find(l => l.id === v.lineId);
          return isLineActive(line?.schedule);
        })
        .map(v => {
          const line = busLines.find(l => l.id === v.lineId);
          const path = line.path;
          
          // Calculate progress based on time and spacing offset
          // (now / 20000) controls the global speed
          const timeFactor = (now / 20000) * v.speedMultiplier;
          const progress = ((timeFactor + v.spacingOffset) % 100) / 100;
          
          const pointIdx = Math.floor(progress * (path.length - 1));
          const nextPointIdx = Math.min(pointIdx + 1, path.length - 1);
          
          const currentPoint = path[pointIdx];
          const nextPoint = path[nextPointIdx];
          
          const subProgress = (progress * (path.length - 1)) % 1;
          const lat = currentPoint[0] + (nextPoint[0] - currentPoint[0]) * subProgress;
          const lon = currentPoint[1] + (nextPoint[1] - currentPoint[1]) * subProgress;

          return {
            ...v,
            coords: [lat, lon],
            heading: calculateHeading(currentPoint, nextPoint),
            lastStop: line.stops[Math.floor(progress * line.stops.length)]?.name || 'En camino'
          };
        });
      
      setVehicles(movedVehicles);
    };

    const calculateHeading = (p1, p2) => {
      if (!p1 || !p2) return 0;
      return Math.atan2(p2[1] - p1[1], p2[0] - p1[0]) * 180 / Math.PI;
    };

    // Update every 2 seconds for smoother movement
    const interval = setInterval(updatePositions, 2000);
    updatePositions();

    return () => clearInterval(interval);
  }, []);

  return vehicles;
};
