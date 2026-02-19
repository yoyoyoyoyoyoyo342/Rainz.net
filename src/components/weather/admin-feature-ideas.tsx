import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Zap, XCircle, Pin, Trash2, Loader2, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeatureIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_pinned: boolean;
  vote_count: number;
  display_name: string | null;
  user_id: string | null;
  created_at: string;
}

const STATUSES = [
  { value: 'submitted', label: 'Submitted', icon: <Clock className="w-3 h-3" /> },
  { value: 'planned', label: 'Planned', icon: <CheckCircle2 className="w-3 h-3" /> },
  { value: 'in_progress', label: 'Building', icon: <Zap className="w-3 h-3" /> },
  { value: 'done', label: 'Shipped', icon: <CheckCircle2 className="w-3 h-3" /> },
  { value: 'rejected', label: 'Rejected', icon: <XCircle className="w-3 h-3" /> },
];

const STATUS_COLORS: Record<string, string> = {
  submitted: 'text-muted-foreground border-border/40',
  planned: 'text-blue-400 border-blue-500/40',
  in_progress: 'text-yellow-400 border-yellow-500/40',
  done: 'text-green-400 border-green-500/40',
  rejected: 'text-destructive border-destructive/40',
};

export function AdminFeatureIdeas() {
  const [ideas, setIdeas] = useState<FeatureIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => { loadIdeas(); }, []);

  const loadIdeas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('feature_ideas')
      .select('*')
      .order('is_pinned', { ascending: false })
      .order('vote_count', { ascending: false });
    if (error) { toast.error('Failed to load ideas'); }
    else setIdeas(data || []);
    setLoading(false);
  };

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const { error } = await supabase.from('feature_ideas').update({ status }).eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success('Status updated'); setIdeas((p) => p.map((i) => i.id === id ? { ...i, status } : i)); }
    setUpdatingId(null);
  };

  const togglePin = async (idea: FeatureIdea) => {
    setUpdatingId(idea.id);
    const { error } = await supabase.from('feature_ideas').update({ is_pinned: !idea.is_pinned }).eq('id', idea.id);
    if (error) toast.error('Failed to update');
    else setIdeas((p) => p.map((i) => i.id === idea.id ? { ...i, is_pinned: !i.is_pinned } : i));
    setUpdatingId(null);
  };

  const deleteIdea = async (id: string) => {
    if (!confirm('Delete this idea?')) return;
    setUpdatingId(id);
    const { error } = await supabase.from('feature_ideas').delete().eq('id', id);
    if (error) toast.error('Failed to delete');
    else { toast.success('Deleted'); setIdeas((p) => p.filter((i) => i.id !== id)); }
    setUpdatingId(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{ideas.length} ideas total</p>
      </div>

      {ideas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">No feature ideas submitted yet.</div>
      ) : (
        ideas.map((idea) => (
          <div
            key={idea.id}
            className={`p-4 rounded-2xl border glass-card transition-all ${idea.is_pinned ? 'border-primary/30' : 'border-border/30'}`}
          >
            <div className="flex items-start gap-3">
              {/* Votes */}
              <div className="flex flex-col items-center gap-0.5 min-w-[40px] text-center">
                <ChevronUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-bold text-foreground">{idea.vote_count}</span>
                <span className="text-[10px] text-muted-foreground">votes</span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">
                    {idea.is_pinned && <span className="mr-1">📌</span>}
                    {idea.title}
                  </p>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(idea.created_at).toLocaleDateString()}
                  </span>
                </div>
                {idea.description && (
                  <p className="text-xs text-muted-foreground mb-2">{idea.description}</p>
                )}

                {/* Status selector */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {STATUSES.map((s) => (
                    <button
                      key={s.value}
                      disabled={updatingId === idea.id}
                      onClick={() => updateStatus(idea.id, s.value)}
                      className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-lg border transition-all ${
                        idea.status === s.value
                          ? `${STATUS_COLORS[s.value]} bg-current/10 font-semibold ring-1 ring-current/30`
                          : 'text-muted-foreground border-border/30 hover:border-border/60'
                      }`}
                    >
                      {s.icon}{s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1 shrink-0">
                <button
                  onClick={() => togglePin(idea)}
                  disabled={updatingId === idea.id}
                  className={`p-1.5 rounded-lg border transition-all ${idea.is_pinned ? 'border-primary/40 text-primary bg-primary/10' : 'border-border/30 text-muted-foreground hover:text-primary'}`}
                  title={idea.is_pinned ? 'Unpin' : 'Pin'}
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => deleteIdea(idea.id)}
                  disabled={updatingId === idea.id}
                  className="p-1.5 rounded-lg border border-border/30 text-muted-foreground hover:text-destructive transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
