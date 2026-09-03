import { useCallback, useState } from "react";

// Carlsbad, CA — used as a one-tap demo fallback so the app is testable
// without granting location permission or seeding your own coordinates.
export const DEMO_LOCATION = { lat: 33.1581, lng: -117.3506, label: "Carlsbad, CA (demo)" };

export function useGeolocation() {
  const [coords, setCoords] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | locating | granted | denied | unsupported

  const request = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setStatus("unsupported");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setStatus("granted");
      },
      () => {
        setStatus("denied");
      },
      { timeout: 10000 }
    );
  }, []);

  const useDemoLocation = useCallback(() => {
    setCoords({ lat: DEMO_LOCATION.lat, lng: DEMO_LOCATION.lng });
    setStatus("granted");
  }, []);

  return { coords, status, request, useDemoLocation };
}
