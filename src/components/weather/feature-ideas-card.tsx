import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, Plus, Lightbulb, Loader2, CheckCircle2, Clock, Zap, XCircle, ChevronUp } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface FeatureIdea {
  id: string;
  title: string;
  description: string | null;
  status: string;
  is_pinned: boolean;
  vote_count: number;
  user_id: string | null;
  display_name: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
  submitted: { label: 'Submitted', icon: <Clock className="w-3 h-3" />, className: 'text-muted-foreground bg-muted/50' },
  planned: { label: 'Planned', icon: <CheckCircle2 className="w-3 h-3" />, className: 'text-blue-500 bg-blue-500/10' },
  in_progress: { label: 'Building', icon: <Zap className="w-3 h-3" />, className: 'text-yellow-500 bg-yellow-500/10' },
  done: { label: 'Shipped ✓', icon: <CheckCircle2 className="w-3 h-3" />, className: 'text-green-500 bg-green-500/10' },
  rejected: { label: 'Not planned', icon: <XCircle className="w-3 h-3" />, className: 'text-destructive/70 bg-destructive/5' },
};

export function FeatureIdeasCard() {
  const { user } = useAuth();
  const [ideas, setIdeas] = useState<FeatureIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());
  const [votingId, setVotingId] = useState<string | null>(null);
  const [showSubmit, setShowSubmit] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadIdeas();
    if (user) loadVotes();
  }, [user]);

  const loadIdeas = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_ideas')
        .select('*')
        .neq('status', 'rejected')
        .order('is_pinned', { ascending: false })
        .order('vote_count', { ascending: false })
        .limit(20);
      if (error) throw error;
      setIdeas(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadVotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('feature_idea_votes')
      .select('idea_id')
      .eq('user_id', user.id);
    if (data) setVotedIds(new Set(data.map((v) => v.idea_id)));
  };

  const handleVote = async (idea: FeatureIdea) => {
    if (!user) { toast.error('Sign in to vote'); return; }
    if (votingId) return;
    setVotingId(idea.id);
    const hasVoted = votedIds.has(idea.id);
    try {
      if (hasVoted) {
        await supabase.from('feature_idea_votes').delete().eq('idea_id', idea.id).eq('user_id', user.id);
        setVotedIds((prev) => { const s = new Set(prev); s.delete(idea.id); return s; });
        setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, vote_count: Math.max(0, i.vote_count - 1) } : i));
      } else {
        await supabase.from('feature_idea_votes').insert({ idea_id: idea.id, user_id: user.id });
        setVotedIds((prev) => new Set(prev).add(idea.id));
        setIdeas((prev) => prev.map((i) => i.id === idea.id ? { ...i, vote_count: i.vote_count + 1 } : i));
      }
    } catch (e: any) {
      toast.error('Failed to vote');
    } finally {
      setVotingId(null);
    }
  };

  const handleSubmit = async () => {
    if (!user) { toast.error('Sign in to submit ideas'); return; }
    if (!title.trim()) { toast.error('Title is required'); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('feature_ideas').insert({
        user_id: user.id,
        title: title.trim(),
        description: description.trim() || null,
        display_name: null,
      });
      if (error) throw error;
      toast.success('Idea submitted! Thanks 🙏');
      setTitle('');
      setDescription('');
      setShowSubmit(false);
      loadIdeas();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-4 overflow-hidden rounded-2xl glass-card border border-border/30">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-border/20">
          <div className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">Feature Ideas 💡</h3>
              <p className="text-xs text-muted-foreground">Vote or suggest what we build next</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1"
            onClick={() => { if (!user) { toast.error('Sign in to submit ideas'); return; } setShowSubmit(true); }}
          >
            <Plus className="w-3 h-3" />
            Suggest
          </Button>
        </div>

        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : ideas.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-6">
              No ideas yet — be the first to suggest a feature!
            </p>
          ) : (
            ideas.map((idea) => {
              const hasVoted = votedIds.has(idea.id);
              const statusCfg = STATUS_CONFIG[idea.status] || STATUS_CONFIG.submitted;
              return (
                <div
                  key={idea.id}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                    idea.is_pinned ? 'border-primary/30 bg-primary/5' : 'border-border/30 bg-card/50'
                  }`}
                >
                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(idea)}
                    disabled={votingId === idea.id}
                    className={`flex flex-col items-center gap-0.5 min-w-[36px] rounded-lg p-1.5 border transition-all ${
                      hasVoted
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border/40 text-muted-foreground hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                    }`}
                  >
                    {votingId === idea.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <ChevronUp className="w-3 h-3" />
                    )}
                    <span className="text-[10px] font-bold">{idea.vote_count}</span>
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-semibold text-foreground leading-tight">
                        {idea.is_pinned && <span className="mr-1">📌</span>}
                        {idea.title}
                      </p>
                      <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${statusCfg.className}`}>
                        {statusCfg.icon}
                        {statusCfg.label}
                      </span>
                    </div>
                    {idea.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{idea.description}</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Submit Dialog */}
      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              Suggest a Feature
            </DialogTitle>
            <DialogDescription>
              What would you like to see in Rainz? Your idea will be visible to everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Feature title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Show wind direction on the map"
                maxLength={120}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Details (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the feature..."
                maxLength={500}
                rows={3}
                className="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowSubmit(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !title.trim()}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Submit Idea
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
