import { useState, useEffect, useRef } from "react";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { StationSelector } from "./station-selector";

interface AddressSearchProps {
  onLocationSelect: (lat: number, lon: number, address: string) => void;
  isImperial: boolean;
}

interface NominatimResult {
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

interface WeatherStation {
  name: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  distance: number;
  reliability: number;
}

export function AddressSearch({ onLocationSelect, isImperial }: AddressSearchProps) {
  const [address, setAddress] = useState("");
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [stations, setStations] = useState<WeatherStation[]>([]);
  const [showStations, setShowStations] = useState(false);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounce address input for autocomplete
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAddress(address);
    }, 500);

    return () => clearTimeout(timer);
  }, [address]);

  // Fetch autocomplete suggestions
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (debouncedAddress.length < 3) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setLoadingSuggestions(true);

      try {
        const { data, error } = await supabase.functions.invoke('geocode-address', {
          body: { query: debouncedAddress }
        });

        if (error) {
          console.error("Edge function error:", error);
          throw error;
        }

        const results: NominatimResult[] = data?.results || [];
        setSuggestions(results);
        setShowSuggestions(results.length > 0);

        if (results.length === 0 && debouncedAddress.length >= 3) {
          toast({
            title: "No results found",
            description: "Try a different address or be more specific",
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("Autocomplete error:", error);
        setSuggestions([]);
        setShowSuggestions(false);
        toast({
          title: "Search error",
          description: "Unable to search addresses. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoadingSuggestions(false);
      }
    };

    fetchSuggestions();
  }, [debouncedAddress, toast]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = async (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lon = parseFloat(result.lon);

    const locationName = 
      result.address.suburb || 
      result.address.village || 
      result.address.town || 
      result.address.city || 
      result.display_name;

    setAddress(locationName);
    setShowSuggestions(false);
    setSuggestions([]);
    setLoading(true);

    try {
      // Find nearby weather stations
      const { data, error } = await supabase.functions.invoke('find-nearby-stations', {
        body: { latitude: lat, longitude: lon }
      });

      if (error) throw error;

      const nearbyStations: WeatherStation[] = data?.stations || [];
      
      if (nearbyStations.length > 0) {
        setStations(nearbyStations);
        setShowStations(true);
      } else {
        // If no stations found, use the coordinates directly
        onLocationSelect(lat, lon, locationName);
        toast({
          title: "Location selected",
          description: `Weather data loading for ${locationName}`,
        });
      }
    } catch (error) {
      console.error("Error finding stations:", error);
      // Fallback to direct coordinates
      onLocationSelect(lat, lon, locationName);
      toast({
        title: "Location selected",
        description: `Weather data loading for ${locationName}`,
      });
    } finally {
      setLoading(false);
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

  const handleClearInput = () => {
    setAddress("");
    setSuggestions([]);
    setShowSuggestions(false);
    setShowStations(false);
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
    <section className="mb-4 md:mb-8">
      <div className="overflow-hidden rounded-2xl glass-card">
        {/* Header - matching main card style */}
        <div className="p-4 border-b border-border/50">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Search by Address
          </h2>
          <p className="text-xs text-muted-foreground mt-1">Find weather for any location</p>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="relative">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  type="text"
                  placeholder="Type your address..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => {
                    if (suggestions.length > 0) {
                      setShowSuggestions(true);
                    }
                  }}
                  disabled={loading}
                  className="pr-8"
                />
                {address && !loading && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-2 hover:bg-transparent"
                    onClick={handleClearInput}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
                {loadingSuggestions && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-[300px] overflow-y-auto"
              >
                {suggestions.map((suggestion, index) => (
                  <button
                    key={`${suggestion.lat}-${suggestion.lon}-${index}`}
                    onClick={() => handleSelectSuggestion(suggestion)}
                    className={cn(
                      "w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground",
                      "flex items-start gap-2 border-b border-border last:border-b-0",
                      "transition-colors"
                    )}
                  >
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {suggestion.address.suburb ||
                          suggestion.address.village ||
                          suggestion.address.town ||
                          suggestion.address.city ||
                          "Unknown Location"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {suggestion.display_name}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Address geocoding by OpenStreetMap Nominatim
          </p>
        </div>
      </div>
    </section>
  );
}
