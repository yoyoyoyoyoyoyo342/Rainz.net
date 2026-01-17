import { useState, useEffect } from "react";
import { MapPin, Loader2, History, X, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { useQuery } from "@tanstack/react-query";
import { weatherApi } from "@/lib/weather-api";
import { Location } from "@/types/weather";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";
import { supabase } from "@/integrations/supabase/client";
import { StationSelector } from "./station-selector";
import { trackLocationSearch, trackLocationDetect } from "@/lib/track-event";

interface WeatherStation {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  distance: number;
  reliability: number;
}

interface AddressResult {
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
    country?: string;
  };
}

interface SearchHistoryItem {
  id: string;
  search_type: string;
  location_name: string;
  latitude: number;
  longitude: number;
  created_at: string;
}

interface LocationSearchProps {
  onLocationSelect: (lat: number, lon: number, locationName: string) => void;
  isImperial: boolean;
}

export function LocationSearch({
  onLocationSelect,
  isImperial
}: LocationSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isDetecting, setIsDetecting] = useState(false);
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [showStations, setShowStations] = useState(false);
  const [loadingStations, setLoadingStations] = useState(false);
  const [addressResults, setAddressResults] = useState<AddressResult[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [placeholder, setPlaceholder] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: searchHistory = [], refetch: refetchHistory } = useQuery({
    queryKey: ["/api/search-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('search_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching search history:", error);
        return [];
      }

      return data as SearchHistoryItem[];
    },
    enabled: !!user
  });

  useEffect(() => {
    const phrases = ["Search for a location", "Search for an address"];
    let phraseIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let timeout: NodeJS.Timeout;

    const type = () => {
      const currentPhrase = phrases[phraseIndex];

      if (!isDeleting) {
        setPlaceholder(currentPhrase.substring(0, charIndex + 1));
        charIndex++;

        if (charIndex === currentPhrase.length) {
          timeout = setTimeout(() => {
            isDeleting = true;
            type();
          }, 2000);
          return;
        }
        timeout = setTimeout(type, 100);
      } else {
        setPlaceholder(currentPhrase.substring(0, charIndex - 1));
        charIndex--;

        if (charIndex === 0) {
          isDeleting = false;
          phraseIndex = (phraseIndex + 1) % phrases.length;
          timeout = setTimeout(type, 500);
          return;
        }
        timeout = setTimeout(type, 50);
      }
    };

    type();

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);
  
  const {
    data: locations = [],
    isLoading
  } = useQuery({
    queryKey: ["/api/locations/search", debouncedQuery],
    enabled: debouncedQuery.length > 2 && debouncedQuery.toLowerCase() !== "world",
    queryFn: () => weatherApi.searchLocations(debouncedQuery)
  });
  
  const isWorldSearch = debouncedQuery.toLowerCase() === "world";

  useEffect(() => {
    const fetchAddresses = async () => {
      if (debouncedQuery.length < 3) {
        setAddressResults([]);
        return;
      }

      setLoadingAddresses(true);

      try {
        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { query: debouncedQuery }
        });

        if (error) {
          console.error("Geocode error:", error);
          setAddressResults([]);
          return;
        }

        const results: AddressResult[] = data?.results || [];
        setAddressResults(results);
      } catch (error) {
        console.error("Address search error:", error);
        setAddressResults([]);
      } finally {
        setLoadingAddresses(false);
      }
    };

    fetchAddresses();
  }, [debouncedQuery]);

  const saveToHistory = async (
    searchType: string,
    locationName: string,
    latitude: number,
    longitude: number
  ) => {
    if (!user) return;

    try {
      await supabase.from('search_history').insert({
        user_id: user.id,
        search_type: searchType,
        location_name: locationName,
        latitude,
        longitude
      });
      refetchHistory();
    } catch (error) {
      console.error("Error saving to search history:", error);
    }
  };

  const handleLocationClick = async (location: Location) => {
    const locationName = `${location.name}, ${location.state ? `${location.state}, ` : ''}${location.country}`;
    
    setSearchQuery("");

    trackLocationSearch(locationName, location.latitude, location.longitude, 'location');

    await saveToHistory('location', locationName, location.latitude, location.longitude);

    onLocationSelect(location.latitude, location.longitude, locationName);
    toast({
      title: "Location selected",
      description: `Weather data loading for ${locationName}`,
    });
  };

  const handleAddressClick = async (address: AddressResult) => {
    const lat = parseFloat(address.lat);
    const lon = parseFloat(address.lon);

    const locationName = 
      address.address.suburb || 
      address.address.village || 
      address.address.town || 
      address.address.city || 
      address.display_name;

    setSearchQuery("");
    setLoadingStations(true);

    trackLocationSearch(locationName, lat, lon, 'address');

    await saveToHistory('address', locationName, lat, lon);

    try {
      const { data, error } = await supabase.functions.invoke('find-nearby-stations', {
        body: { latitude: lat, longitude: lon }
      });

      if (error) throw error;

      const nearbyStations: WeatherStation[] = data?.stations || [];
      
      if (nearbyStations.length > 0) {
        const nearestStation = nearbyStations[0];
        onLocationSelect(nearestStation.latitude, nearestStation.longitude, nearestStation.name);
        toast({
          title: "Station selected",
          description: `Using weather data from ${nearestStation.name}`,
        });
      } else {
        onLocationSelect(lat, lon, locationName);
        toast({
          title: "Location selected",
          description: `Weather data loading for ${locationName}`,
        });
      }
    } catch (error) {
      console.error("Error finding stations:", error);
      onLocationSelect(lat, lon, locationName);
      toast({
        title: "Location selected",
        description: `Weather data loading for ${locationName}`,
      });
    } finally {
      setLoadingStations(false);
    }
  };

  const handleHistoryClick = async (item: SearchHistoryItem) => {
    setSearchQuery("");
    setLoadingStations(true);

    if (item.search_type === 'address') {
      try {
        const { data, error } = await supabase.functions.invoke('find-nearby-stations', {
          body: { latitude: item.latitude, longitude: item.longitude }
        });

        if (error) throw error;

        const nearbyStations: WeatherStation[] = data?.stations || [];
        
        if (nearbyStations.length > 0) {
          const nearestStation = nearbyStations[0];
          setLoadingStations(false);
          onLocationSelect(nearestStation.latitude, nearestStation.longitude, nearestStation.name);
          toast({
            title: "Station selected",
            description: `Using weather data from ${nearestStation.name}`,
          });
          return;
        }
      } catch (error) {
        console.error("Error finding stations:", error);
      }
    }

    setLoadingStations(false);
    onLocationSelect(item.latitude, item.longitude, item.location_name);
    toast({
      title: "Location selected",
      description: `Weather data loading for ${item.location_name}`,
    });
  };

  const handleDeleteHistoryItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      await supabase.from('search_history').delete().eq('id', id);
      refetchHistory();
      toast({
        title: "Removed from history",
        description: "Search item removed successfully",
      });
    } catch (error) {
      console.error("Error deleting history item:", error);
    }
  };

  const handleLocationDetection = async () => {
    // UX: reset search UI before jumping back to "my location"
    setSearchQuery("");
    setDebouncedQuery("");
    setAddressResults([]);
    setIsDetecting(true);
    setLoadingStations(true);

    try {
      const position = await weatherApi.getCurrentLocation();
      const { latitude, longitude } = position.coords;

      trackLocationDetect();

      // Prefer nearest station (matches how address search works)
      try {
        const { data, error } = await supabase.functions.invoke('find-nearby-stations', {
          body: { latitude, longitude },
        });

        if (!error) {
          const stations = (data?.stations || []) as WeatherStation[];
          if (stations.length > 0) {
            const nearestStation = stations[0];
            onLocationSelect(nearestStation.latitude, nearestStation.longitude, nearestStation.name);
            toast({
              title: "Station selected",
              description: `Using weather data from ${nearestStation.name}`,
            });
            return;
          }
        }
      } catch (e) {
        console.warn('find-nearby-stations failed:', e);
      }

      onLocationSelect(latitude, longitude, "Current Location");
      toast({
        title: "Location detected",
        description: "Using your current location for weather data.",
      });
    } catch (err: any) {
      const code = typeof err?.code === "number" ? err.code : undefined;
      const isDenied = code === 1; // GeolocationPositionError.PERMISSION_DENIED

      toast({
        title: "Location detection failed",
        description: isDenied
          ? "Location permission is blocked. Enable it in your browser settings and try again."
          : "Please search for a location manually.",
        variant: "destructive",
      });
    } finally {
      setIsDetecting(false);
      setLoadingStations(false);
    }
  };

  const handleSelectStation = (lat: number, lon: number, stationName: string) => {
    setShowStations(false);
    onLocationSelect(lat, lon, stationName);
    toast({
      title: "Station selected",
      description: `Loading weather data from ${stationName}`,
    });
  };

  if (showStations) {
    return (
      <StationSelector
        stations={stations}
        isImperial={isImperial}
        onSelectStation={handleSelectStation}
        onCancel={() => setShowStations(false)}
      />
    );
  }

  return (
    <Card className="glass-card border border-border/50 shadow-md overflow-hidden rounded-2xl relative flex-1 max-w-md z-[9999]">
      <CardContent className="p-4">
        <div className="relative">
          <Input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            className="w-full pl-4 pr-12 py-3 bg-muted/30 text-foreground border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-muted-foreground rounded-xl"
          />
          <Button
            onMouseDown={(e) => {
              // Keep the click from being swallowed by input focus (mobile Safari)
              e.preventDefault();
            }}
            onClick={handleLocationDetection}
            disabled={isDetecting || loadingStations}
            variant="ghost"
            size="sm"
            aria-label="Use my current location"
            className="absolute right-1 top-1/2 z-10 -translate-y-1/2 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors p-2 rounded-lg"
          >
            {isDetecting || loadingStations ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MapPin className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardContent>

      {/* Search Results Dropdown */}
      {(searchQuery.length > 2 || isLoading || loadingAddresses || (isFocused && searchQuery.length === 0)) && (
        <div className="p-0 border-t border-border/30">
          {searchQuery.length === 0 && isFocused ? (
            <div className="max-h-60 overflow-y-auto">
              {searchHistory.length > 0 ? (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Recent Searches
                  </div>
                  {searchHistory.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0 flex items-start gap-2 group"
                    >
                      <History className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{item.location_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {item.search_type === "location" ? "Location" : "Address"}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-auto"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </Button>
                    </button>
                  ))}
                </>
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent searches</p>
                </div>
              )}
            </div>
          ) : (isLoading || loadingAddresses) && !isWorldSearch ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline-block mr-2" />
              {t("search.searching")}
            </div>
          ) : isWorldSearch ? (
            <div className="max-h-60 overflow-y-auto">
              <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                Global Weather
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  onLocationSelect(0, 0, "World Average");
                  toast({
                    title: "World Weather",
                    description: "Loading global weather average from 20 major cities worldwide",
                  });
                }}
                className="w-full text-left p-4 hover:bg-muted/50 transition-colors flex items-start gap-2"
              >
                <Globe className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">World Average</div>
                  <div className="text-xs text-muted-foreground">Global average from 20 major cities</div>
                </div>
              </button>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {locations.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Locations
                  </div>
                  {locations.slice(0, 5).map((location, index) => (
                    <button
                      key={index}
                      onClick={() => handleLocationClick(location)}
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0 flex items-start gap-2"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">{location.name}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {location.state ? `${location.state}, ` : ""}
                          {location.country}
                        </div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {addressResults.length > 0 && (
                <>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/30">
                    Addresses
                  </div>
                  {addressResults.slice(0, 5).map((address, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddressClick(address)}
                      className="w-full text-left p-4 hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0 flex items-start gap-2"
                    >
                      <MapPin className="w-4 h-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground truncate">
                          {address.address.road ||
                            address.address.suburb ||
                            address.display_name.split(",")[0]}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">{address.display_name}</div>
                      </div>
                    </button>
                  ))}
                </>
              )}

              {locations.length === 0 &&
                addressResults.length === 0 &&
                !isLoading &&
                !loadingAddresses && (
                  <div className="p-4 text-center text-muted-foreground">
                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results found</p>
                    <p className="text-xs mt-1">Try a different search term</p>
                  </div>
                )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
