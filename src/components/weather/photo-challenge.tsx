import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Heart, Trophy, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PhotoChallengeProps {
  latitude: number;
  longitude: number;
  locationName: string;
  userId?: string;
}

export function PhotoChallenge({ latitude, longitude, locationName, userId }: PhotoChallengeProps) {
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: photos = [] } = useQuery({
    queryKey: ['weather-photos', today],
    queryFn: async () => {
      const { data } = await supabase
        .from('weather_photos' as any)
        .select('*')
        .eq('photo_date', today)
        .order('vote_count', { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
  });

  const { data: myVotes = [] } = useQuery({
    queryKey: ['my-photo-votes', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from('weather_photo_votes' as any)
        .select('photo_id')
        .eq('user_id', userId!);
      return (data || []).map((v: any) => v.photo_id);
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!userId || !e.target.files?.[0]) return;
    setUploading(true);
    try {
      const file = e.target.files[0];
      const ext = file.name.split('.').pop();
      const path = `weather-photos/${userId}/${Date.now()}.${ext}`;
      
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      
      await supabase.from('weather_photos' as any).insert({
        user_id: userId,
        image_url: urlData.publicUrl,
        caption: caption || '📸 Weather snap!',
        location_name: locationName,
        latitude,
        longitude,
      });
      
      setCaption('');
      queryClient.invalidateQueries({ queryKey: ['weather-photos'] });
      toast.success('Photo submitted! 📸');
    } catch (err) {
      toast.error('Failed to upload photo');
    }
    setUploading(false);
  };

  const toggleVote = async (photoId: string) => {
    if (!userId) return toast.error('Sign in to vote!');
    const hasVoted = myVotes.includes(photoId);
    
    if (hasVoted) {
      await supabase.from('weather_photo_votes' as any)
        .delete()
        .eq('photo_id', photoId)
        .eq('user_id', userId);
    } else {
      await supabase.from('weather_photo_votes' as any)
        .insert({ photo_id: photoId, user_id: userId });
    }
    queryClient.invalidateQueries({ queryKey: ['weather-photos'] });
    queryClient.invalidateQueries({ queryKey: ['my-photo-votes'] });
  };

  const winner = photos[0];

  return (
    <Card className="glass-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Photo of the Day
          <span className="text-xs text-muted-foreground ml-auto">{photos.length} entries</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Winner */}
        {winner && (
          <div className="relative rounded-xl overflow-hidden">
            <img src={winner.image_url} alt="Today's top photo" className="w-full h-40 object-cover" />
            <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <div className="flex items-center justify-between">
                <p className="text-white text-xs font-medium">{winner.caption}</p>
                <div className="flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                  <span className="text-white text-xs">{winner.vote_count}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Photo grid */}
        {photos.length > 1 && (
          <div className="grid grid-cols-3 gap-1.5">
            {photos.slice(1, 7).map((photo: any) => (
              <button
                key={photo.id}
                onClick={() => toggleVote(photo.id)}
                className="relative rounded-lg overflow-hidden group aspect-square"
              >
                <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                    <Heart className={`w-4 h-4 ${myVotes.includes(photo.id) ? 'text-red-400 fill-red-400' : 'text-white'}`} />
                    <span className="text-white text-xs">{photo.vote_count}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Upload */}
        {userId && (
          <div className="space-y-2">
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption your sky shot..."
              className="w-full text-xs bg-muted/30 rounded-lg px-3 py-2 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <label className="block">
              <input type="file" accept="image/*" capture="environment" onChange={handleUpload} className="hidden" />
              <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-dashed border-border/50 hover:border-primary/50 cursor-pointer transition-colors text-xs text-muted-foreground hover:text-primary">
                <Upload className="w-3.5 h-3.5" />
                {uploading ? 'Uploading...' : 'Upload Sky Photo'}
              </div>
            </label>
          </div>
        )}

        {!userId && (
          <p className="text-xs text-muted-foreground text-center py-2">Sign in to submit & vote on photos</p>
        )}
      </CardContent>
    </Card>
  );
}
