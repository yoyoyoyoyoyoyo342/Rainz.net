// Aiven-backed profile helpers. All reads/writes go through the `profiles` edge
// function so the browser never talks to Aiven directly. Use these instead of
// `supabase.from('profiles')` for any code path that runs after the Aiven
// migration has cleaned the Supabase table.
import { supabase } from "@/integrations/supabase/client";

export interface OwnProfile {
  id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  total_points: number;
  trophy_count: number;
  notification_enabled?: boolean;
  notification_time?: string;
  country?: string | null;
  language_preference?: string | null;
  is_imperial?: boolean;
}

export interface PublicProfile {
  id: string;
  user_id?: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  total_points: number;
  trophy_count: number;
}

export async function getOwnProfile(): Promise<OwnProfile | null> {
  const { data, error } = await supabase.functions.invoke("profiles", { method: "GET" });
  if (error) {
    console.warn("[profiles-api] getOwnProfile failed", error);
    return null;
  }
  return (data?.data ?? null) as OwnProfile | null;
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  const { data, error } = await supabase.functions.invoke(
    `profiles?user_id=${encodeURIComponent(userId)}`,
    { method: "GET" },
  );
  if (error) {
    console.warn("[profiles-api] getPublicProfile failed", error);
    return null;
  }
  return (data?.data ?? null) as PublicProfile | null;
}

export async function upsertOwnProfile(input: {
  username?: string;
  display_name?: string;
  notification_enabled?: boolean;
  notification_time?: string;
}): Promise<OwnProfile | null> {
  const { data, error } = await supabase.functions.invoke("profiles", {
    method: "POST",
    body: input,
  });
  if (error) {
    console.warn("[profiles-api] upsertOwnProfile failed", error);
    return null;
  }
  return (data?.data ?? null) as OwnProfile | null;
}

export async function updateOwnProfile(patch: Partial<OwnProfile>): Promise<OwnProfile | null> {
  const { data, error } = await supabase.functions.invoke("profiles", {
    method: "PATCH",
    body: patch,
  });
  if (error) {
    console.warn("[profiles-api] updateOwnProfile failed", error);
    return null;
  }
  return (data?.data ?? null) as OwnProfile | null;
}
