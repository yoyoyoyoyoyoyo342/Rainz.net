import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DryRouteFullPage } from '@/components/weather/dry-route-fullpage';

export default function DryRoutesPage() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState('Current Location');

  useEffect(() => {
    // Try to get user location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          // Reverse geocode for location name
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
            .then(r => r.json())
            .then(data => {
              const name = data?.address?.city || data?.address?.town || data?.address?.village || 'Current Location';
              setLocationName(name);
            })
            .catch(() => {});
        },
        () => {
          // Default fallback
          setCoords({ lat: 51.5074, lon: -0.1278 });
          setLocationName('London');
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setCoords({ lat: 51.5074, lon: -0.1278 });
      setLocationName('London');
    }
  }, []);

  if (!coords) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Getting your location...</div>
      </div>
    );
  }

  return (
    <DryRouteFullPage
      latitude={coords.lat}
      longitude={coords.lon}
      locationName={locationName}
      isImperial={false}
    />
  );
}
