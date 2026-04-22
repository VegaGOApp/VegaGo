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

export const getVehicleStopIndex = (line, vehicle) => {
  if (!line || !line.stops) return -1;
  let minIdx = -1;
  let minDist = Infinity;
  
  line.stops.forEach((stop, idx) => {
    const d = Math.sqrt(
      Math.pow(stop.coords[0] - vehicle.coords[0], 2) + 
      Math.pow(stop.coords[1] - vehicle.coords[1], 2)
    );
    if (d < minDist) {
      minDist = d;
      minIdx = idx;
    }
  });
  return minIdx;
};
