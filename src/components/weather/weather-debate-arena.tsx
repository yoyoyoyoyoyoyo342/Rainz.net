import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Swords, TrendingUp, Users, Plus, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface WeatherDebateArenaProps {
  latitude: number;
  longitude: number;
  locationName: string;
  userId?: string;
  currentWeather?: any;
}

export function WeatherDebateArena({ latitude, longitude, locationName, userId, currentWeather }: WeatherDebateArenaProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [optionA, setOptionA] = useState('Yes');
  const [optionB, setOptionB] = useState('No');
  const [wager, setWager] = useState(10);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: debates = [] } = useQuery({
    queryKey: ['weather-debates', locationName],
    queryFn: async () => {
      const { data } = await supabase
        .from('weather_debates' as any)
        .select('*')
        .eq('status', 'open')
        .gte('resolution_date', today)
        .order('created_at', { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });

  const { data: myBets = [] } = useQuery({
    queryKey: ['my-debate-bets', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('weather_debate_bets' as any)
        .select('debate_id, chosen_option')
        .eq('user_id', userId!);
      return (data || []) as any[];
    },
  });

  const createDebate = async () => {
    if (!userId || !question.trim()) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    await supabase.from('weather_debates' as any).insert({
      creator_id: userId,
      question,
      option_a: optionA,
      option_b: optionB,
      wager_points: wager,
      resolution_date: tomorrow.toISOString().split('T')[0],
      latitude,
      longitude,
      location_name: locationName,
    });
    
    setQuestion('');
    setShowCreate(false);
    queryClient.invalidateQueries({ queryKey: ['weather-debates'] });
    toast.success('Debate created! ⚔️');
  };

  const placeBet = async (debateId: string, option: string, points: number) => {
    if (!userId) return toast.error('Sign in to place bets!');
    
    const existing = myBets.find((b: any) => b.debate_id === debateId);
    if (existing) return toast.error('You already placed a bet!');

    await supabase.from('weather_debate_bets' as any).insert({
      debate_id: debateId,
      user_id: userId,
      chosen_option: option,
      points_wagered: points,
    });
    
    queryClient.invalidateQueries({ queryKey: ['my-debate-bets'] });
    toast.success(`Bet placed! ${points} points on "${option}" ⚔️`);
  };

  const suggestedQuestions = [
    `Will it rain in ${locationName} tomorrow?`,
    `Will temperature exceed ${currentWeather?.temperature ? Math.round(currentWeather.temperature + 5) : 80}° tomorrow?`,
    `Will we get thunderstorms this week?`,
    `Will wind speed top 20 mph today?`,
  ];

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Swords className="w-4 h-4 text-primary" />
          Weather Debate Arena
          <span className="text-xs text-muted-foreground ml-auto">{debates.length} active</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Active debates */}
        {debates.slice(0, 3).map((debate: any) => {
          const myBet = myBets.find((b: any) => b.debate_id === debate.id);
          return (
            <div key={debate.id} className="bg-muted/30 rounded-xl p-3 space-y-2 border border-border/20">
              <p className="text-sm font-medium">{debate.question}</p>
              <p className="text-xs text-muted-foreground">
                📍 {debate.location_name} · Resolves {new Date(debate.resolution_date).toLocaleDateString()}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => placeBet(debate.id, debate.option_a, debate.wager_points)}
                  disabled={!!myBet}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all ${
                    myBet?.chosen_option === debate.option_a
                      ? 'bg-green-500/20 text-green-600 border border-green-500/40'
                      : 'bg-primary/10 text-primary hover:bg-primary/20 border border-transparent'
                  }`}
                >
                  {myBet?.chosen_option === debate.option_a && <Check className="w-3 h-3 inline mr-1" />}
                  {debate.option_a} ({debate.wager_points}pts)
                </button>
                <button
                  onClick={() => placeBet(debate.id, debate.option_b, debate.wager_points)}
                  disabled={!!myBet}
                  className={`flex-1 text-xs py-2 rounded-lg font-medium transition-all ${
                    myBet?.chosen_option === debate.option_b
                      ? 'bg-green-500/20 text-green-600 border border-green-500/40'
                      : 'bg-secondary/50 text-secondary-foreground hover:bg-secondary/70 border border-transparent'
                  }`}
                >
                  {myBet?.chosen_option === debate.option_b && <Check className="w-3 h-3 inline mr-1" />}
                  {debate.option_b} ({debate.wager_points}pts)
                </button>
              </div>
            </div>
          );
        })}

        {debates.length === 0 && !showCreate && (
          <p className="text-xs text-muted-foreground text-center py-3">No active debates yet. Start one!</p>
        )}

        {/* Create debate */}
        {showCreate ? (
          <div className="bg-muted/20 rounded-xl p-3 space-y-2 border border-border/30">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Your weather question..."
              className="w-full text-xs bg-background/50 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="flex gap-2">
              <input value={optionA} onChange={(e) => setOptionA(e.target.value)} placeholder="Option A"
                className="flex-1 text-xs bg-background/50 rounded-lg px-3 py-1.5 border border-border/30" />
              <input value={optionB} onChange={(e) => setOptionB(e.target.value)} placeholder="Option B"
                className="flex-1 text-xs bg-background/50 rounded-lg px-3 py-1.5 border border-border/30" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {suggestedQuestions.map((q, i) => (
                <button key={i} onClick={() => setQuestion(q)}
                  className="text-[10px] px-2 py-1 rounded-full bg-muted/50 text-muted-foreground hover:bg-primary/10 hover:text-primary">
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={createDebate} className="flex-1 text-xs">Create Debate</Button>
              <Button size="sm" variant="outline" onClick={() => setShowCreate(false)} className="text-xs">Cancel</Button>
            </div>
          </div>
        ) : userId ? (
          <Button size="sm" variant="outline" onClick={() => setShowCreate(true)} className="w-full text-xs">
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Start a Debate
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground text-center">Sign in to create debates</p>
        )}
      </CardContent>
    </Card>
  );
}
