import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/use-feature-flags';
import { toast } from 'sonner';

interface FeatureFlagDef {
  id: string;
  label: string;
  description: string;
  key: string;
  defaultValue: boolean;
  category: 'core' | 'social' | 'games' | 'experimental';
}

const FEATURE_FLAGS: FeatureFlagDef[] = [
  { id: 'maintenance_mode', label: 'Maintenance Mode', description: 'Show maintenance banner to all users', key: 'maintenance_mode', defaultValue: false, category: 'core' },
  { id: 'predictions_enabled', label: 'Predictions', description: 'Allow users to submit weather predictions', key: 'predictions_enabled', defaultValue: true, category: 'core' },
  { id: 'leaderboard_enabled', label: 'Leaderboard', description: 'Show the global leaderboard', key: 'leaderboard_enabled', defaultValue: true, category: 'core' },
  { id: 'shop_enabled', label: 'Points Shop', description: 'Enable the points shop for purchasing items', key: 'shop_enabled', defaultValue: true, category: 'core' },
  { id: 'battles_enabled', label: 'Prediction Battles', description: 'Allow users to challenge each other', key: 'battles_enabled', defaultValue: true, category: 'social' },
  { id: 'reactions_enabled', label: 'Weather Reactions', description: 'Let users post weather reaction emojis', key: 'reactions_enabled', defaultValue: true, category: 'social' },
  { id: 'games_enabled', label: 'Weather Games', description: 'Enable mini-games (Rain Dodge, etc.)', key: 'games_enabled', defaultValue: true, category: 'games' },
  { id: 'trivia_enabled', label: 'Daily Trivia', description: 'Show the daily weather trivia question', key: 'trivia_enabled', defaultValue: true, category: 'games' },
  { id: 'ai_companion_enabled', label: 'AI Companion', description: 'Enable PAI weather chat assistant', key: 'ai_companion_enabled', defaultValue: true, category: 'experimental' },
  { id: 'spin_wheel_enabled', label: 'Daily Spin Wheel', description: 'Enable the daily free spin reward', key: 'spin_wheel_enabled', defaultValue: true, category: 'games' },
  { id: 'explore_enabled', label: 'Explore Section', description: 'Show the Explore Rainz button and sheet', key: 'explore_enabled', defaultValue: true, category: 'core' },
];

const CATEGORY_LABELS: Record<string, string> = {
  core: '⚡ Core Features',
  social: '👥 Social',
  games: '🎮 Games & Fun',
  experimental: '🧪 Experimental',
};

export function AdminFeatureFlags() {
  const { flags, isLoading, toggleFlag } = useFeatureFlags();

  const handleToggle = async (key: string) => {
    const flag = FEATURE_FLAGS.find(f => f.key === key);
    const success = await toggleFlag(key);
    if (success) {
      const newValue = !(flags[key] ?? true);
      toast.success(`${flag?.label || key} ${newValue ? 'enabled' : 'disabled'}`);
    } else {
      toast.error('Failed to update flag');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
  }

  const categories = [...new Set(FEATURE_FLAGS.map(f => f.category))];

  return (
    <div className="space-y-5">
      {flags.maintenance_mode && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <span className="text-destructive font-medium">Maintenance mode is ON — users will see a maintenance banner.</span>
        </div>
      )}

      {categories.map(cat => (
        <div key={cat} className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{CATEGORY_LABELS[cat] || cat}</h3>
          <div className="space-y-1">
            {FEATURE_FLAGS.filter(f => f.category === cat).map(flag => (
              <div
                key={flag.id}
                className="flex items-center justify-between p-3 rounded-xl border border-border/30 bg-card/50 hover:border-border/50 transition-colors"
              >
                <div className="flex-1 min-w-0 mr-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={flag.id} className="text-sm font-medium cursor-pointer">{flag.label}</Label>
                    {flag.key === 'maintenance_mode' && flags[flag.key] && (
                      <Badge variant="destructive" className="text-[10px]">Active</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{flag.description}</p>
                </div>
                <Switch
                  id={flag.id}
                  checked={flags[flag.key] ?? flag.defaultValue}
                  onCheckedChange={() => handleToggle(flag.key)}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <p className="text-[10px] text-muted-foreground text-center pt-2">
        Feature flags are stored in the database and apply to all users instantly.
      </p>
    </div>
  );
}
