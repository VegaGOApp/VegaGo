export const getDistance = (p1, p2) => {
  if (!p1 || !p2) return Infinity;
  const R = 6371; // km
  const dLat = (p2[0] - p1[0]) * Math.PI / 180;
  const dLon = (p2[1] - p1[1]) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(p1[0] * Math.PI / 180) * Math.cos(p2[0] * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

// Squared distance for fast comparison (avoids Math.sqrt/sin)
export const getSquaredDistance = (p1, p2) => {
  if (!p1 || !p2) return Infinity;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return dx * dx + dy * dy;
};

export const getVehicleStopIndex = (line, vehicle) => {
  if (!line || !line.stops) return -1;
  let minIdx = -1;
  let minDistSq = Infinity;
  
  for (let i = 0; i < line.stops.length; i++) {
    const dSq = getSquaredDistance(line.stops[i].coords, vehicle.coords);
    if (dSq < minDistSq) {
      minDistSq = dSq;
      minIdx = i;
    }
  }
  return minIdx;
};
