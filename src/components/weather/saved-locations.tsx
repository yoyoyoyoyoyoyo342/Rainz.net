import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MapPin, Plus, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LocationSearch } from "./location-search";

interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  state: string | null;
  is_primary: boolean;
}

interface SavedLocationsProps {
  onLocationSelect: (lat: number, lon: number, locationName: string) => void;
  currentLocation?: { latitude: number; longitude: number };
  isImperial: boolean;
}

export function SavedLocations({ onLocationSelect, currentLocation, isImperial }: SavedLocationsProps) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const queryClient = useQueryClient();

  const { data: savedLocations = [], isLoading } = useQuery({
    queryKey: ["saved-locations"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from("saved_locations")
        .select("*")
        .order("is_primary", { ascending: false })
        .order("name");

      if (error) throw error;
      return data as SavedLocation[];
    },
  });

  const addLocationMutation = useMutation({
    mutationFn: async ({ name, lat, lon }: { name: string; lat: number; lon: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (savedLocations.length >= 3) throw new Error("MAX_REACHED");

      const { error } = await supabase.from("saved_locations").insert({
        user_id: user.id,
        name,
        latitude: lat,
        longitude: lon,
        is_primary: savedLocations.length === 0,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      setIsAddingLocation(false);
      toast.success("Location saved");
    },
    onError: (err: Error) => {
      if (err.message === "MAX_REACHED") {
        toast.error("3 is the max for saved locations.");
      } else {
        toast.error("Failed to save location");
      }
    },
  });

  const deleteLocationMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("saved_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Location removed");
    },
    onError: () => toast.error("Failed to remove location"),
  });

  const setPrimaryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Unset all primary flags
      await supabase.from("saved_locations").update({ is_primary: false }).eq("user_id", user.id);

      // Set the selected one as primary
      const { error } = await supabase.from("saved_locations").update({ is_primary: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      toast.success("Primary location updated");
    },
    onError: () => toast.error("Failed to update primary location"),
  });

  const handleLocationSelect = (lat: number, lon: number, locationName: string) => {
    addLocationMutation.mutate({ name: locationName, lat, lon });
  };

  const isCurrent = (location: SavedLocation) => {
    if (!currentLocation) return false;
    return (
      Math.abs(location.latitude - currentLocation.latitude) < 0.01 &&
      Math.abs(location.longitude - currentLocation.longitude) < 0.01
    );
  };

  if (isLoading) {
    return (
      <Card className="p-4 glass-panel">
        <p className="text-sm text-muted-foreground">Loading locations...</p>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <div className="p-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold flex items-center gap-2 text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Saved Locations
          </h3>
          <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
            <DialogTrigger asChild>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-8 gap-2 bg-background/50 hover:bg-background/80"
              >
                <Plus className="h-3.5 w-3.5" />
                Add
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Location</DialogTitle>
              </DialogHeader>
              <LocationSearch onLocationSelect={handleLocationSelect} isImperial={isImperial} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {savedLocations.length === 0 ? (
        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted/50 mb-3">
            <MapPin className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No saved locations yet
          </p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Add your favorite locations for quick access
          </p>
        </div>
      ) : (
        <div className="p-2">
          {savedLocations.map((location) => (
            <div
              key={location.id}
              className={`group relative rounded-lg mb-2 last:mb-0 transition-all ${
                isCurrent(location) 
                  ? "bg-primary/5 ring-1 ring-primary/20" 
                  : "bg-muted/30 hover:bg-muted/50"
              }`}
            >
              <button
                onClick={() => onLocationSelect(location.latitude, location.longitude, location.name)}
                className="w-full p-4 text-left"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {location.is_primary && (
                        <Star className="h-3.5 w-3.5 fill-primary text-primary shrink-0" />
                      )}
                      <span className="font-medium text-sm text-foreground truncate">
                        {location.name}
                      </span>
                      {isCurrent(location) && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium shrink-0">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    {location.state && location.country && (
                      <p className="text-xs text-muted-foreground truncate">
                        {location.state}, {location.country}
                      </p>
                    )}
                  </div>
                </div>
              </button>
              
              {/* Action buttons - appear on hover */}
              <div className="absolute top-3 right-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {!location.is_primary && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 bg-background/80 hover:bg-background shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimaryMutation.mutate(location.id);
                    }}
                    title="Set as primary location"
                  >
                    <Star className="h-3.5 w-3.5 text-muted-foreground hover:text-primary" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 bg-background/80 hover:bg-destructive/10 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteLocationMutation.mutate(location.id);
                  }}
                  title="Remove location"
                >
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}