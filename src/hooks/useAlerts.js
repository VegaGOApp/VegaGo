import { useState, useEffect } from 'react';

/**
 * useAlerts
 * A hook that manages service alerts.
 * Currently returns an empty list as requested.
 */
export const useAlerts = (lineIds) => {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    // We keep this hook prepared for future real-time integrations
    setAlerts([]);
  }, [lineIds]);

  return alerts;
};
