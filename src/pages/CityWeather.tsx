import { useParams, Link, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Cloud, CloudRain, Droplets, Wind, Thermometer, MapPin, Navigation, ArrowRight, Umbrella } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CITY_MAP } from "@/data/cities";
import { weatherApi } from "@/lib/weather-api";
import { SEOHead } from "@/components/seo/seo-head";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";
import { AnimatedWeatherBackground } from "@/components/weather/animated-weather-background";
import { Footer } from "@/components/ui/footer";

function getWeatherIcon(condition: string) {
  const c = condition.toLowerCase();
  if (c.includes("rain") || c.includes("drizzle") || c.includes("shower")) return <CloudRain className="h-8 w-8 text-blue-400" />;
  if (c.includes("cloud") || c.includes("overcast")) return <Cloud className="h-8 w-8 text-muted-foreground" />;
  return <Thermometer className="h-8 w-8 text-yellow-400" />;
}

function CitySchemaMarkup({ cityName, lat, lon }: { cityName: string; lat: number; lon: number }) {
  const schema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Rainz Weather",
        "url": "https://rainz.net",
        "applicationCategory": "WeatherApplication",
        "operatingSystem": "Web, iOS, Android",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" },
        "description": `Live rain forecast and weather data for ${cityName} powered by AI.`,
      },
      {
        "@type": "City",
        "name": cityName,
        "geo": {
          "@type": "GeoCoordinates",
          "latitude": lat,
          "longitude": lon,
        },
      },
      {
        "@type": "WebPage",
        "name": `Rain Forecast & Weather in ${cityName} | Rainz.net`,
        "url": `https://rainz.net/weather/${cityName.toLowerCase().replace(/\s+/g, "-")}`,
        "description": `Check live rain radar, hourly forecasts, and plan rain-free routes in ${cityName} with Rainz — the free AI-powered weather app.`,
        "isPartOf": { "@type": "WebSite", "name": "Rainz.net", "url": "https://rainz.net" },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export default function CityWeather() {
  const { citySlug } = useParams<{ citySlug: string }>();
  const city = citySlug ? CITY_MAP.get(citySlug) : undefined;

  const { data: weatherData, isLoading, error } = useQuery({
    queryKey: ["city-weather", city?.slug],
    queryFn: () => weatherApi.getWeatherData(city!.lat, city!.lon, city!.name),
    enabled: !!city,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Inject schema markup
  useEffect(() => {
    if (!city) return;
    const id = "city-schema-ld";
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement("script");
      el.id = id;
      el.setAttribute("type", "application/ld+json");
      document.head.appendChild(el);
    }
    const schema = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebApplication",
          name: "Rainz Weather",
          url: "https://rainz.net",
          applicationCategory: "WeatherApplication",
          operatingSystem: "Web, iOS, Android",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
          description: `Live rain forecast and weather data for ${city.name} powered by AI.`,
        },
        {
          "@type": "City",
          name: city.name,
          geo: { "@type": "GeoCoordinates", latitude: city.lat, longitude: city.lon },
        },
        {
          "@type": "WebPage",
          name: `Rain Forecast & Weather in ${city.name} | Rainz.net`,
          url: `https://rainz.net/weather/${city.slug}`,
          description: `Check live rain radar, hourly forecasts, and plan rain-free routes in ${city.name} with Rainz.`,
          isPartOf: { "@type": "WebSite", name: "Rainz.net", url: "https://rainz.net" },
        },
      ],
    };
    el.textContent = JSON.stringify(schema);
    return () => { el?.remove(); };
  }, [city]);

  if (!city) return <Navigate to="/" replace />;

  const current = weatherData?.mostAccurate?.currentWeather;
  const hourly = weatherData?.mostAccurate?.hourlyForecast?.slice(0, 12) ?? [];
  const condition = current?.condition ?? "Loading";

  const dryRoutesUrl = `/dryroutes?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(city.name)}`;

  return (
    <>
      <SEOHead
        title={`Rain Forecast & Weather in ${city.name} | Rainz.net`}
        description={`Check live rain radar, hourly forecasts, and plan rain-free routes in ${city.name} with Rainz — the free AI-powered weather app.`}
        keywords={`${city.name} weather, ${city.name} rain forecast, ${city.name} rain radar, weather ${city.name}, rain ${city.name}`}
        canonicalUrl={`https://rainz.net/weather/${city.slug}`}
        ogType="website"
      />

      <div className="min-h-screen relative">
        {current && (
          <AnimatedWeatherBackground
            condition={condition}
          />
        )}

        <div className="relative z-10 max-w-2xl mx-auto px-4 py-6 md:py-10">
          {/* Header */}
          <div className="mb-6">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 mb-3">
              <MapPin className="h-3 w-3" /> Rainz.net
            </Link>
            <h1 className="text-2xl md:text-4xl font-bold text-foreground leading-tight">
              Weather & Rain Forecast in {city.name}
            </h1>
          </div>

          {/* City Description */}
          <Card className="glass-card mb-4">
            <CardContent className="p-4">
              <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
                {city.description}
              </p>
            </CardContent>
          </Card>

          {isLoading ? (
            <WeatherPageSkeleton />
          ) : error ? (
            <Card className="glass-card mb-4">
              <CardContent className="p-6 text-center">
                <CloudRain className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Unable to load weather data. Please try again later.</p>
              </CardContent>
            </Card>
          ) : current ? (
            <>
              {/* Current Conditions */}
              <Card className="glass-card mb-4">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-4xl md:text-5xl font-bold text-foreground">
                        {Math.round(current.temperature)}°F
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        Feels like {Math.round(current.feelsLike)}°F
                      </div>
                    </div>
                    <div className="text-right">
                      {getWeatherIcon(condition)}
                      <div className="text-sm font-medium text-foreground mt-1">{condition}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 pt-3 border-t border-border/50">
                    <div className="text-center">
                      <Droplets className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                      <div className="text-xs text-muted-foreground">Humidity</div>
                      <div className="text-sm font-medium text-foreground">{current.humidity}%</div>
                    </div>
                    <div className="text-center">
                      <Wind className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
                      <div className="text-xs text-muted-foreground">Wind</div>
                      <div className="text-sm font-medium text-foreground">{Math.round(current.windSpeed)} mph</div>
                    </div>
                    <div className="text-center">
                      <Umbrella className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                      <div className="text-xs text-muted-foreground">Pressure</div>
                      <div className="text-sm font-medium text-foreground">{current.pressure} hPa</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Hourly Rain Forecast */}
              <Card className="glass-card mb-4">
                <CardContent className="p-4">
                  <h2 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                    <CloudRain className="h-4 w-4 text-blue-400" />
                    Hourly Rain Forecast
                  </h2>
                  <div className="overflow-x-auto -mx-2 px-2">
                    <div className="flex gap-2 min-w-max pb-1">
                      {hourly.map((h, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 min-w-[56px] p-2 rounded-xl bg-background/30">
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{h.time}</span>
                          {getWeatherIcon(h.condition)}
                          <span className="text-xs font-medium text-foreground">{Math.round(h.temperature)}°</span>
                          <div className="flex items-center gap-0.5">
                            <Droplets className="h-3 w-3 text-blue-400" />
                            <span className="text-[10px] text-blue-400 font-medium">{h.precipitation}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DryRoutes CTA */}
              <Card className="glass-card mb-6 border-primary/20">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-primary/10 p-2.5 shrink-0">
                      <Navigation className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-base font-semibold text-foreground mb-1">
                        Plan a Rain-Free Route in {city.name}
                      </h2>
                      <p className="text-sm text-muted-foreground mb-3">
                        Use DryRoutes to find the driest path for walking, cycling, or driving in {city.name}.
                      </p>
                      <Link to={dryRoutesUrl}>
                        <Button className="w-full sm:w-auto gap-2" size="lg">
                          Open DryRoutes
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : null}

          {/* Internal links to other cities */}
          <Card className="glass-card mb-6">
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">Weather in Other Cities</h2>
              <div className="flex flex-wrap gap-1.5">
                {Array.from(CITY_MAP.values())
                  .filter(c => c.slug !== city.slug)
                  .slice(0, 12)
                  .map(c => (
                    <Link
                      key={c.slug}
                      to={`/weather/${c.slug}`}
                      className="text-xs px-2.5 py-1 rounded-full bg-background/40 text-muted-foreground hover:text-foreground hover:bg-background/60 transition-colors border border-border/30"
                    >
                      {c.name}
                    </Link>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Back to main */}
          <div className="text-center pb-8">
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to Rainz.net Weather
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
