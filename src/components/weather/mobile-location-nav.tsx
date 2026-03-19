import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { MapPin, Plus, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LocationSearch } from "./location-search";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  state: string | null;
  is_primary: boolean;
}

interface MobileLocationNavProps {
  onLocationSelect: (lat: number, lon: number, locationName: string) => void;
  currentLocation?: { lat: number; lon: number; name: string } | null;
  isImperial: boolean;
}

export function MobileLocationNav({ onLocationSelect, currentLocation, isImperial }: MobileLocationNavProps) {
  const [isAddingLocation, setIsAddingLocation] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SavedLocation | null>(null);
  const [editName, setEditName] = useState("");
  const navRef = useRef<HTMLDivElement>(null);
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
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
  });

  const addLocationMutation = useMutation({
    mutationFn: async ({ name, lat, lon }: { name: string; lat: number; lon: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

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
    onError: () => toast.error("Failed to save location"),
  });

  const renameLocationMutation = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("saved_locations")
        .update({ name })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-locations"] });
      setEditingLocation(null);
      setEditName("");
      toast.success("Location renamed");
    },
    onError: () => toast.error("Failed to rename location"),
  });

  const handleLocationSelect = (lat: number, lon: number, locationName: string) => {
    addLocationMutation.mutate({ name: locationName, lat, lon });
  };

  // Haptic feedback function with iOS detection
  const triggerHaptic = () => {
    // Check if device supports vibration (not iOS)
    if (navigator.vibrate && !isIOS()) {
      navigator.vibrate(50);
    }
  };

  // Detect iOS devices
  const isIOS = () => {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  };

  const handleLocationClick = (lat: number, lon: number, locationName: string) => {
    triggerHaptic();
    onLocationSelect(lat, lon, locationName);
  };

  const handleAddClick = () => {
    triggerHaptic();
    setIsAddingLocation(true);
  };

  const handleEditClick = (location: SavedLocation, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic();
    setEditingLocation(location);
    setEditName(location.name);
  };

  const handleRenameSubmit = () => {
    if (editingLocation && editName.trim()) {
      renameLocationMutation.mutate({ id: editingLocation.id, name: editName.trim() });
    }
  };

  // Extract just the city name from full location string
  const getShortLocationName = (fullName: string) => {
    return fullName.split(',')[0].trim();
  };

  const isCurrent = (location: SavedLocation) => {
    if (!currentLocation) return false;
    return (
      Math.abs(location.latitude - currentLocation.lat) < 0.01 &&
      Math.abs(location.longitude - currentLocation.lon) < 0.01
    );
  };

  return (
    <>
      <nav 
        ref={navRef}
        className="fixed bottom-0 left-0 right-0 z-50 pb-safe px-2"
      >
        <div className="glass-card glass-tab-bar rounded-3xl border border-border/30 backdrop-blur-xl mx-2 mb-2 shadow-lg">
          {/* Handle indicator */}
          <div className="w-full flex items-center justify-center py-2">
            <div className="w-12 h-1 rounded-full bg-muted-foreground/40" />
          </div>
          
          <div className="overflow-x-auto overflow-y-hidden scrollbar-hide">
            <div className="flex items-center gap-1 p-2 pt-0 min-w-max">
              {/* Add Location Button */}
              <Dialog open={isAddingLocation} onOpenChange={setIsAddingLocation}>
                <button
                  onClick={handleAddClick}
                  className={`shrink-0 flex flex-col items-center justify-center gap-1.5 min-w-[80px] py-3 px-4 rounded-2xl transition-all ${
                    isAddingLocation
                      ? "bg-primary/20 scale-95"
                      : "hover:bg-muted/30 active:scale-95"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Plus className="h-5 w-5 text-primary" />
                  </div>
                  <span className="text-[10px] font-medium text-foreground whitespace-nowrap">Add</span>
                </button>
                <DialogContent className="glass-card">
                  <DialogHeader>
                    <DialogTitle>Add Location</DialogTitle>
                  </DialogHeader>
                  <LocationSearch onLocationSelect={handleLocationSelect} isImperial={isImperial} />
                </DialogContent>
              </Dialog>

              {/* Saved Locations */}
              {savedLocations.map((location) => (
                <div key={location.id} className="relative shrink-0">
                  <button
                    onClick={() => handleLocationClick(location.latitude, location.longitude, location.name)}
                    className={`flex flex-col items-center justify-center gap-1.5 min-w-[80px] py-3 px-4 rounded-2xl transition-all ${
                      isCurrent(location)
                        ? "bg-primary/20 scale-95"
                        : "hover:bg-muted/30 active:scale-95"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCurrent(location)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}>
                      <MapPin className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-medium text-foreground whitespace-nowrap max-w-[72px] truncate">
                      {location.name.split(',')[0].trim()}
                    </span>
                    {isCurrent(location) && (
                      <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                    )}
                  </button>
                  <button
                    onClick={(e) => handleEditClick(location, e)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/80 backdrop-blur-sm border border-border/50 flex items-center justify-center hover:bg-muted/80 transition-colors"
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              ))}

              {savedLocations.length === 0 && (
                <div className="flex-1 flex items-center justify-center py-4 px-4">
                  <p className="text-xs text-muted-foreground">
                    Add locations for quick access
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content being hidden behind nav */}
      <div className="h-36" />

      {/* Rename Location Dialog */}
      <Dialog open={!!editingLocation} onOpenChange={(open) => !open && setEditingLocation(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Rename Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="location-name">Location Name</Label>
              <Input
                id="location-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter location name"
                className="mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingLocation(null)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRenameSubmit}
                className="flex-1"
                disabled={!editName.trim() || renameLocationMutation.isPending}
              >
                {renameLocationMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
