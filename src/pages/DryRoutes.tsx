import { useEffect, useState } from 'react';
import { DryRouteFullPage } from '@/components/weather/dry-route-fullpage';
import { SEOHead } from '@/components/seo/seo-head';

export default function DryRoutesPage() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [locationName, setLocationName] = useState('Current Location');

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
          fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`)
            .then(r => r.json())
            .then(data => {
              const name = data?.address?.city || data?.address?.town || data?.address?.village || 'Current Location';
              setLocationName(name);
            })
            .catch(() => {});
        },
        () => {
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
      <>
        <SEOHead
          title="DryRoutes - Rain-Free Route Planning | Rainz Weather"
          description="Plan walking and cycling routes that avoid rain. DryRoutes uses real-time precipitation data to find the driest path between two points."
          keywords="DryRoutes, rain-free routes, avoid rain, walking route planner, cycling route weather, dry commute, rain forecast route"
          canonicalUrl="https://rainz.net/dryroutes"
        />
        <div className="fixed inset-0 bg-background flex items-center justify-center">
          <div className="animate-pulse text-muted-foreground text-sm">Getting your location...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead
        title="DryRoutes - Rain-Free Route Planning | Rainz Weather"
        description="Plan walking and cycling routes that avoid rain. DryRoutes uses real-time precipitation data to find the driest path between two points."
        keywords="DryRoutes, rain-free routes, avoid rain, walking route planner, cycling route weather, dry commute, rain forecast route"
        canonicalUrl="https://rainz.net/dryroutes"
      />
      <DryRouteFullPage
        latitude={coords.lat}
        longitude={coords.lon}
        locationName={locationName}
        isImperial={false}
      />
    </>
  );
}
