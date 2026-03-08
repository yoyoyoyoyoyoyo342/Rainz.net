import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2, Loader2, MessageCircle, Target, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Reaction {
  id: string;
  emoji: string;
  message: string;
  display_name: string | null;
  location_name: string;
  created_at: string;
  user_id: string;
}

interface Prediction {
  id: string;
  user_id: string;
  location_name: string;
  prediction_date: string;
  predicted_condition: string;
  predicted_high: number;
  predicted_low: number;
  is_verified: boolean | null;
  is_correct: boolean | null;
  points_earned: number | null;
  created_at: string | null;
}

export function AdminContentModeration() {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loadingReactions, setLoadingReactions] = useState(true);
  const [loadingPredictions, setLoadingPredictions] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadReactions();
    loadPredictions();
  }, []);

  const loadReactions = async () => {
    setLoadingReactions(true);
    try {
      const { data, error } = await supabase
        .from('weather_reactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setReactions(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load reactions', variant: 'destructive' });
    } finally {
      setLoadingReactions(false);
    }
  };

  const loadPredictions = async () => {
    setLoadingPredictions(true);
    try {
      const { data, error } = await supabase
        .from('weather_predictions')
        .select('id, user_id, location_name, prediction_date, predicted_condition, predicted_high, predicted_low, is_verified, is_correct, points_earned, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setPredictions(data || []);
    } catch {
      toast({ title: 'Error', description: 'Failed to load predictions', variant: 'destructive' });
    } finally {
      setLoadingPredictions(false);
    }
  };

  const deleteReaction = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('weather_reactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setReactions((prev) => prev.filter((r) => r.id !== id));
      toast({ title: 'Deleted', description: 'Reaction removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete reaction', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  const deletePrediction = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase
        .from('weather_predictions')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setPredictions((prev) => prev.filter((p) => p.id !== id));
      toast({ title: 'Deleted', description: 'Prediction removed' });
    } catch {
      toast({ title: 'Error', description: 'Failed to delete prediction', variant: 'destructive' });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <Tabs defaultValue="reactions" className="space-y-3">
      <TabsList className="bg-muted/50 rounded-xl">
        <TabsTrigger value="reactions" className="rounded-lg text-xs gap-1.5">
          <MessageCircle className="w-3.5 h-3.5" />Reactions
        </TabsTrigger>
        <TabsTrigger value="predictions" className="rounded-lg text-xs gap-1.5">
          <Target className="w-3.5 h-3.5" />Predictions
        </TabsTrigger>
      </TabsList>

      {/* Reactions */}
      <TabsContent value="reactions">
        {loadingReactions ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : reactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No reactions found</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{reactions.length} recent reactions</p>
            {reactions.map((r) => (
              <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
                <span className="text-xl shrink-0">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{r.display_name || 'Anonymous'}</span>
                    <Badge variant="outline" className="text-[10px]">{r.location_name}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{r.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{format(new Date(r.created_at), 'MMM dd, HH:mm')}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      {deletingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Reaction</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove this reaction. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteReaction(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      {/* Predictions */}
      <TabsContent value="predictions">
        {loadingPredictions ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : predictions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">No predictions found</p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">{predictions.length} recent predictions</p>
            {predictions.map((p) => (
              <div key={p.id} className="flex items-start gap-3 p-3 rounded-xl border border-border/30 bg-card/50">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{p.location_name}</span>
                    <Badge variant="outline" className="text-[10px]">{p.prediction_date}</Badge>
                    {p.is_verified && (
                      <Badge className={`text-[10px] ${p.is_correct ? 'bg-green-500/20 text-green-600 border-green-500/30' : 'bg-destructive/20 text-destructive border-destructive/30'}`}>
                        {p.is_correct ? '✓ Correct' : '✗ Wrong'}
                      </Badge>
                    )}
                    {!p.is_verified && <Badge variant="secondary" className="text-[10px]">Pending</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {p.predicted_condition} · H:{p.predicted_high}° L:{p.predicted_low}°
                    {p.points_earned ? ` · ${p.points_earned} pts` : ''}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {p.created_at ? format(new Date(p.created_at), 'MMM dd, HH:mm') : ''}
                  </p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                      {deletingId === p.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Prediction</AlertDialogTitle>
                      <AlertDialogDescription>This will permanently remove this prediction and any associated points. This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deletePrediction(p.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
