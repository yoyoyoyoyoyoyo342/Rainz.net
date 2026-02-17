import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Reaction {
  id: string;
  display_name: string | null;
  emoji: string;
  message: string;
  location_name: string;
  created_at: string;
}

const QUICK_REACTIONS = [
  { emoji: "😎", label: "Sunny vibes" },
  { emoji: "🌧️", label: "It's raining" },
  { emoji: "❄️", label: "Snow!" },
  { emoji: "💨", label: "So windy" },
  { emoji: "🌈", label: "Rainbow!" },
  { emoji: "⛈️", label: "Thunderstorm" },
];

interface WeatherReactionsFeedProps {
  latitude: number;
  longitude: number;
  locationName: string;
}

export function WeatherReactionsFeed({ latitude, longitude, locationName }: WeatherReactionsFeedProps) {
  const { user, profile } = useAuth();
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [showInput, setShowInput] = useState(false);

  // Fetch nearby reactions (within ~0.5 degree ≈ 50km)
  useEffect(() => {
    const fetchReactions = async () => {
      const { data, error } = await supabase
        .from("weather_reactions")
        .select("*")
        .gte("latitude", latitude - 0.5)
        .lte("latitude", latitude + 0.5)
        .gte("longitude", longitude - 0.5)
        .lte("longitude", longitude + 0.5)
        .order("created_at", { ascending: false })
        .limit(20);

      if (!error && data) {
        setReactions(data as Reaction[]);
      }
    };

    fetchReactions();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("weather-reactions-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "weather_reactions" },
        (payload) => {
          const newReaction = payload.new as Reaction & { latitude: number; longitude: number };
          // Only add if nearby
          if (
            Math.abs(newReaction.latitude - latitude) <= 0.5 &&
            Math.abs(newReaction.longitude - longitude) <= 0.5
          ) {
            setReactions((prev) => [newReaction, ...prev].slice(0, 20));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [latitude, longitude]);

  const postReaction = async (emoji: string, message: string) => {
    if (!user) {
      toast.error("Sign in to post reactions");
      return;
    }

    setIsPosting(true);
    try {
      // Check rate limit (1 per hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("weather_reactions")
        .select("id")
        .eq("user_id", user.id)
        .gte("created_at", oneHourAgo);

      if (recent && recent.length > 0) {
        toast.error("You can post once per hour");
        return;
      }

      const { error } = await supabase.from("weather_reactions").insert({
        user_id: user.id,
        display_name: profile?.display_name || "Anonymous",
        emoji,
        message: message.slice(0, 100),
        latitude,
        longitude,
        location_name: locationName,
      });

      if (error) throw error;

      toast.success("Reaction posted! 🎉");
      setCustomMessage("");
      setSelectedEmoji(null);
      setShowInput(false);
    } catch (error) {
      console.error("Error posting reaction:", error);
      toast.error("Failed to post reaction");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          Live Weather Reactions
          {reactions.length > 0 && (
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              {reactions.length} nearby
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick reaction buttons */}
        <div className="flex flex-wrap gap-2">
          {QUICK_REACTIONS.map((r) => (
            <Button
              key={r.emoji}
              variant={selectedEmoji === r.emoji ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (!showInput) {
                  // Quick post with default label
                  postReaction(r.emoji, r.label);
                } else {
                  setSelectedEmoji(r.emoji);
                }
              }}
              disabled={isPosting}
              className="text-base gap-1"
            >
              {r.emoji} <span className="text-xs">{r.label}</span>
            </Button>
          ))}
        </div>

        {/* Custom message toggle */}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowInput(!showInput)}
            className="text-xs text-muted-foreground"
          >
            {showInput ? "Cancel" : "Write a custom reaction..."}
          </Button>
        </div>

        {showInput && (
          <div className="flex gap-2">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg px-2">
              {selectedEmoji || "😊"}
            </div>
            <input
              type="text"
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="What's the weather like?"
              maxLength={100}
              className="flex-1 bg-muted/50 rounded-lg px-3 py-2 text-sm border border-border/50 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button
              size="sm"
              onClick={() => postReaction(selectedEmoji || "😊", customMessage || "Checking the weather!")}
              disabled={isPosting}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}

        {/* Reactions feed */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {reactions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No reactions nearby yet. Be the first! 🌤️
            </p>
          ) : (
            reactions.map((reaction) => (
              <div
                key={reaction.id}
                className="flex items-start gap-2 p-2 rounded-lg bg-muted/30 border border-border/20"
              >
                <span className="text-xl">{reaction.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-foreground truncate">
                      {reaction.display_name || "Anonymous"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {reaction.location_name}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{reaction.message}</p>
                  <span className="text-[10px] text-muted-foreground/60">
                    {formatDistanceToNow(new Date(reaction.created_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
