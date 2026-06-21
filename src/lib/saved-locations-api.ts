// Aiven-backed saved-locations client. All reads/writes go through the
// `saved-locations` edge function. Use these helpers instead of
// `supabase.from('saved_locations')`.
import { supabase } from "@/integrations/supabase/client";

export interface SavedLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  country: string | null;
  state: string | null;
  is_primary: boolean;
  created_at: string;
  user_id?: string;
}

export async function listSavedLocations(): Promise<SavedLocation[]> {
  const { data, error } = await supabase.functions.invoke("saved-locations", { method: "GET" });
  if (error) {
    console.warn("[saved-locations-api] list failed", error);
    return [];
  }
  return (data?.data ?? []) as SavedLocation[];
}

export async function addSavedLocation(input: {
  name: string;
  latitude: number;
  longitude: number;
  country?: string | null;
  state?: string | null;
}): Promise<SavedLocation> {
  const { data, error } = await supabase.functions.invoke("saved-locations", {
    method: "POST",
    body: input,
  });
  if (error) {
    if (typeof (error as { message?: string }).message === "string" && (error as { message?: string }).message?.includes("MAX_REACHED")) {
      throw new Error("MAX_REACHED");
    }
    throw error;
  }
  if (data?.error === "MAX_REACHED") throw new Error("MAX_REACHED");
  return data?.data as SavedLocation;
}

export async function setPrimarySavedLocation(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke("saved-locations", {
    method: "PATCH",
    body: { id, action: "set_primary" },
  });
  if (error) throw error;
}

export async function renameSavedLocation(id: string, name: string): Promise<void> {
  const { error } = await supabase.functions.invoke("saved-locations", {
    method: "PATCH",
    body: { id, action: "rename", name },
  });
  if (error) throw error;
}

export async function deleteSavedLocation(id: string): Promise<void> {
  const { error } = await supabase.functions.invoke(
    `saved-locations?id=${encodeURIComponent(id)}`,
    { method: "DELETE" },
  );
  if (error) throw error;
}
