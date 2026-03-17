import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FEATURE_FLAGS_KEY = ['feature-flags'];

interface FlagEntry {
  enabled: boolean;
  value: string | null;
}

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = {}, isLoading } = useQuery({
    queryKey: FEATURE_FLAGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled, value');

      if (error) {
        console.error('Failed to load feature flags:', error);
        return {} as Record<string, FlagEntry>;
      }

      const result: Record<string, FlagEntry> = {};
      (data || []).forEach((row: any) => {
        result[row.key] = { enabled: row.enabled, value: row.value ?? null };
      });
      return result;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: true,
  });

  const toggleFlag = async (key: string) => {
    const current = flags[key]?.enabled ?? true;
    const newValue = !current;

    queryClient.setQueryData(FEATURE_FLAGS_KEY, (old: Record<string, FlagEntry> | undefined) => ({
      ...old,
      [key]: { ...(old?.[key] || { value: null }), enabled: newValue },
    }));

    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: newValue, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      queryClient.setQueryData(FEATURE_FLAGS_KEY, (old: Record<string, FlagEntry> | undefined) => ({
        ...old,
        [key]: { ...(old?.[key] || { value: null }), enabled: current },
      }));
      console.error('Failed to toggle flag:', error);
      return false;
    }

    return true;
  };

  const isEnabled = (key: string, defaultValue = true): boolean => {
    return flags[key]?.enabled ?? defaultValue;
  };

  const getValue = (key: string, defaultValue: string): string => {
    return flags[key]?.value ?? defaultValue;
  };

  const setValue = async (key: string, val: string) => {
    queryClient.setQueryData(FEATURE_FLAGS_KEY, (old: Record<string, FlagEntry> | undefined) => ({
      ...old,
      [key]: { ...(old?.[key] || { enabled: true }), value: val },
    }));

    const { error } = await supabase
      .from('feature_flags')
      .update({ value: val, updated_at: new Date().toISOString() } as any)
      .eq('key', key);

    if (error) {
      console.error('Failed to set flag value:', error);
      return false;
    }
    return true;
  };

  return { flags, isLoading, toggleFlag, isEnabled, getValue, setValue };
}
