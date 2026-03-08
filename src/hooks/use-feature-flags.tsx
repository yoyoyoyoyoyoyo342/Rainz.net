import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const FEATURE_FLAGS_KEY = ['feature-flags'];

export function useFeatureFlags() {
  const queryClient = useQueryClient();

  const { data: flags = {}, isLoading } = useQuery({
    queryKey: FEATURE_FLAGS_KEY,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('key, enabled');

      if (error) {
        console.error('Failed to load feature flags:', error);
        return {} as Record<string, boolean>;
      }

      const result: Record<string, boolean> = {};
      (data || []).forEach((row: any) => {
        result[row.key] = row.enabled;
      });
      return result;
    },
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
  });

  const toggleFlag = async (key: string) => {
    const current = flags[key] ?? true;
    const newValue = !current;

    // Optimistic update
    queryClient.setQueryData(FEATURE_FLAGS_KEY, (old: Record<string, boolean> | undefined) => ({
      ...old,
      [key]: newValue,
    }));

    const { error } = await supabase
      .from('feature_flags')
      .update({ enabled: newValue, updated_at: new Date().toISOString() })
      .eq('key', key);

    if (error) {
      // Rollback
      queryClient.setQueryData(FEATURE_FLAGS_KEY, (old: Record<string, boolean> | undefined) => ({
        ...old,
        [key]: current,
      }));
      console.error('Failed to toggle flag:', error);
      return false;
    }

    return true;
  };

  const isEnabled = (key: string, defaultValue = true): boolean => {
    return flags[key] ?? defaultValue;
  };

  return { flags, isLoading, toggleFlag, isEnabled };
}
