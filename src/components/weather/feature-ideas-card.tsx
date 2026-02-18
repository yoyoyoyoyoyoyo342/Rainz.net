import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DISMISS_KEY = 'rainz_feature_ideas_dismissed_at';
const RESHOW_DAYS = 7;

interface Tile {
  emoji: string;
  title: string;
  desc: string;
  action: () => void;
}

interface FeatureIdeasCardProps {
  isLoggedIn: boolean;
  onOpenExplore: () => void;
  onOpenPrediction?: () => void;
  onOpenSpin?: () => void;
  onOpenQuiz?: () => void;
}

export function FeatureIdeasCard({
  isLoggedIn,
  onOpenExplore,
  onOpenPrediction,
  onOpenSpin,
  onOpenQuiz,
}: FeatureIdeasCardProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(DISMISS_KEY);
      if (!stored) { setVisible(true); return; }
      const dismissedAt = parseInt(stored, 10);
      const daysSince = (Date.now() - dismissedAt) / (1000 * 60 * 60 * 24);
      if (daysSince >= RESHOW_DAYS) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  const loggedOutTiles: Tile[] = [
    {
      emoji: '🔮',
      title: 'Make a Prediction',
      desc: 'Predict tomorrow\'s weather & earn points',
      action: () => onOpenPrediction?.(),
    },
    {
      emoji: '⚔️',
      title: 'Battle a Friend',
      desc: 'Challenge someone to a weather duel',
      action: () => navigate('/auth'),
    },
    {
      emoji: '📱',
      title: 'Install the App',
      desc: 'Add Rainz to your home screen',
      action: () => navigate('/download'),
    },
    {
      emoji: '⏰',
      title: 'Time Machine',
      desc: 'Explore historical weather at your location',
      action: onOpenExplore,
    },
  ];

  const loggedInTiles: Tile[] = [
    {
      emoji: '🌍',
      title: 'Weather Wrapped',
      desc: 'See your personal weather stats',
      action: () => navigate('/user/' + ''),
    },
    {
      emoji: '⏰',
      title: 'Time Machine',
      desc: 'Look up any past date\'s weather',
      action: onOpenExplore,
    },
    {
      emoji: '🎰',
      title: 'Daily Spin',
      desc: 'Spin for bonus points — free daily',
      action: () => onOpenSpin?.(),
    },
    {
      emoji: '🧠',
      title: 'Weather Personality',
      desc: 'Discover your weather personality type',
      action: () => onOpenQuiz?.(),
    },
  ];

  const tiles = isLoggedIn ? loggedInTiles : loggedOutTiles;

  return (
    <div className="mb-4 overflow-hidden rounded-2xl glass-card border border-border/30">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">What should I try next? 💡</h3>
          <p className="text-xs text-muted-foreground">Tap a suggestion to explore</p>
        </div>
        <button
          onClick={dismiss}
          className="w-6 h-6 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-3 h-3 text-muted-foreground" />
        </button>
      </div>

      <div className="px-4 pb-4 grid grid-cols-2 gap-2">
        {tiles.map((tile) => (
          <button
            key={tile.title}
            onClick={tile.action}
            className="text-left p-3 rounded-xl border border-border/50 hover:border-primary/40 hover:bg-primary/5 transition-all group"
          >
            <span className="text-xl block mb-1">{tile.emoji}</span>
            <p className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors">{tile.title}</p>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">{tile.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
