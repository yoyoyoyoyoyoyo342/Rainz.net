import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toPng } from 'html-to-image';
import { Download, Share2, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/card';

const STORAGE_KEY = 'rainz_weather_personality';

interface Personality {
  id: string;
  emoji: string;
  name: string;
  tagline: string;
  description: string;
  color: string;
}

const PERSONALITIES: Record<string, Personality> = {
  sun: {
    id: 'sun',
    emoji: '☀️',
    name: 'The Sun Chaser',
    tagline: 'Born for golden days',
    description: 'You thrive on sunshine and warmth. A perfect beach day is your idea of paradise.',
    color: 'from-amber-400 to-orange-500',
  },
  rain: {
    id: 'rain',
    emoji: '🌧️',
    name: 'The Rain Romanticist',
    tagline: 'Cozy rain is your therapy',
    description: 'You love the smell of rain, cozy blankets, and a hot drink by the window.',
    color: 'from-blue-400 to-slate-500',
  },
  blizzard: {
    id: 'blizzard',
    emoji: '❄️',
    name: 'The Blizzard Boss',
    tagline: 'Cold is your superpower',
    description: 'Snow, ice, and freezing temps? Bring it on. You were built for the extremes.',
    color: 'from-sky-300 to-blue-600',
  },
  storm: {
    id: 'storm',
    emoji: '🌪️',
    name: 'The Storm Rider',
    tagline: 'Drama is your element',
    description: 'Lightning, thunder, howling winds — you\'re energized by nature\'s fury.',
    color: 'from-purple-500 to-slate-700',
  },
  temperate: {
    id: 'temperate',
    emoji: '🌤️',
    name: 'The Temperate Soul',
    tagline: 'Balance in all things',
    description: 'You appreciate mild days, soft clouds, and gentle breezes. Life is best in moderation.',
    color: 'from-green-400 to-teal-500',
  },
};

interface Question {
  text: string;
  options: { label: string; scores: Record<string, number> }[];
}

const QUESTIONS: Question[] = [
  {
    text: 'Your ideal Saturday morning looks like…',
    options: [
      { label: '🏖️ Beach or outdoor brunch in the sun', scores: { sun: 2 } },
      { label: '☕ Hot drink and rain tapping the window', scores: { rain: 2 } },
      { label: '⛷️ Shredding fresh powder on a ski slope', scores: { blizzard: 2 } },
      { label: '🌩 Watching a dramatic thunderstorm roll in', scores: { storm: 2 } },
    ],
  },
  {
    text: 'Pick the weather that makes you feel most alive:',
    options: [
      { label: '☀️ 90°F, clear skies, pure sunshine', scores: { sun: 2 } },
      { label: '🌧️ Steady drizzle, 60°F, low clouds', scores: { rain: 2 } },
      { label: '❄️ 20°F and snowing heavily', scores: { blizzard: 2 } },
      { label: '⛈️ Major thunderstorm with lightning', scores: { storm: 2 } },
    ],
  },
  {
    text: "How do you feel about extreme weather?",
    options: [
      { label: "😎 Love it — the more dramatic the better", scores: { storm: 2, blizzard: 1 } },
      { label: "🤩 Exciting as long as its sunny and extreme", scores: { sun: 2 } },
      { label: "😌 I prefer calm and predictable", scores: { temperate: 2 } },
      { label: "🥰 Extreme cozy weather only please", scores: { rain: 2 } },
    ],
  },
  {
    text: 'What do you do on a rainy day?',
    options: [
      { label: '😒 Count the minutes until it stops', scores: { sun: 2 } },
      { label: '🥰 My favourite day — fully embrace it', scores: { rain: 2 } },
      { label: '❄️ Wish it were snow instead', scores: { blizzard: 2 } },
      { label: '⚡ Hope it turns into a proper storm', scores: { storm: 2 } },
    ],
  },
  {
    text: 'Choose your spirit vacation:',
    options: [
      { label: '🌴 Maldives — endless sunshine and blue water', scores: { sun: 2 } },
      { label: '🏔️ Scottish Highlands — moody fog and green hills', scores: { rain: 2, temperate: 1 } },
      { label: '🎿 Alaska in January — full snowstorm experience', scores: { blizzard: 2 } },
      { label: '🌊 Tornado Alley during storm season', scores: { storm: 2 } },
    ],
  },
];

function computeResult(answers: number[]): Personality {
  const scores: Record<string, number> = { sun: 0, rain: 0, blizzard: 0, storm: 0, temperate: 0 };

  answers.forEach((answerIdx, questionIdx) => {
    const question = QUESTIONS[questionIdx];
    const option = question.options[answerIdx];
    Object.entries(option.scores).forEach(([key, val]) => {
      scores[key] = (scores[key] || 0) + val;
    });
  });

  // Tie-breaker: temperate
  let winner = 'temperate';
  let max = -1;
  Object.entries(scores).forEach(([key, val]) => {
    if (val > max) { max = val; winner = key; }
  });

  return PERSONALITIES[winner];
}

interface ResultCardProps {
  personality: Personality;
  cardRef: React.RefObject<HTMLDivElement>;
}

function ResultCard({ personality, cardRef }: ResultCardProps) {
  return (
    <div
      ref={cardRef}
      className={`bg-gradient-to-br ${personality.color} rounded-2xl p-6 text-white text-center shadow-xl`}
    >
      <div className="text-5xl mb-3">{personality.emoji}</div>
      <p className="text-sm font-medium opacity-80 uppercase tracking-widest mb-1">My Weather Personality</p>
      <h2 className="text-2xl font-bold mb-1">{personality.name}</h2>
      <p className="text-sm italic opacity-90 mb-3">"{personality.tagline}"</p>
      <p className="text-sm opacity-80">{personality.description}</p>
      <div className="mt-4 text-xs opacity-60 font-medium">rainz.app</div>
    </div>
  );
}

interface WeatherPersonalityQuizProps {
  inSheet?: boolean;
}

export function WeatherPersonalityQuiz({ inSheet = false }: WeatherPersonalityQuizProps) {
  const [open, setOpen] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [result, setResult] = useState<Personality | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return PERSONALITIES[stored] || null;
    } catch {}
    return null;
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const handleOpen = () => {
    setOpen(true);
    if (!result) {
      setCurrentQ(0);
      setAnswers([]);
    }
  };

  const handleAnswer = (optionIdx: number) => {
    const newAnswers = [...answers, optionIdx];
    if (newAnswers.length === QUESTIONS.length) {
      const personality = computeResult(newAnswers);
      setResult(personality);
      try { localStorage.setItem(STORAGE_KEY, personality.id); } catch {}
    } else {
      setAnswers(newAnswers);
      setCurrentQ(currentQ + 1);
    }
  };

  const handleRetake = () => {
    setResult(null);
    setCurrentQ(0);
    setAnswers([]);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement('a');
      link.download = 'my-weather-personality.png';
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Failed to download:', e);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'weather-personality.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: 'My Weather Personality',
          text: `I'm ${result?.name} on Rainz! What's yours?`,
          files: [file],
        });
      } else {
        handleDownload();
      }
    } catch {}
  };

  const trigger = inSheet ? (
    <div className="overflow-hidden rounded-2xl glass-card border border-border/30 p-4">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">🧠</span>
        <div>
          <h3 className="font-semibold text-foreground text-sm">Weather Personality Quiz</h3>
          <p className="text-xs text-muted-foreground">Discover your weather type in 5 questions</p>
        </div>
      </div>
      {result ? (
        <div className="flex items-center gap-2">
          <span className="text-lg">{result.emoji}</span>
          <span className="text-sm font-medium text-foreground">{result.name}</span>
          <Button size="sm" variant="outline" className="ml-auto text-xs h-7" onClick={handleOpen}>
            View Result
          </Button>
        </div>
      ) : (
        <Button size="sm" className="w-full" onClick={handleOpen}>
          Take the Quiz →
        </Button>
      )}
    </div>
  ) : (
    <button onClick={handleOpen} className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-muted/50 transition-colors text-center">
      <span className="text-2xl">🧠</span>
      <span className="text-xs font-medium text-foreground">Personality</span>
    </button>
  );

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              🧠 Weather Personality Quiz
            </DialogTitle>
          </DialogHeader>

          {result ? (
            <div className="space-y-4">
              <ResultCard personality={result} cardRef={cardRef} />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={handleRetake}>
                  <RotateCcw className="w-3 h-3 mr-1.5" />
                  Retake
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="w-3 h-3 mr-1.5" />
                  Share
                </Button>
                <Button size="sm" onClick={handleDownload} disabled={isDownloading}>
                  <Download className="w-3 h-3 mr-1.5" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Question {currentQ + 1} of {QUESTIONS.length}</p>
                <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQ) / QUESTIONS.length) * 100}%` }}
                  />
                </div>
                <p className="font-semibold text-foreground text-sm">{QUESTIONS[currentQ].text}</p>
              </div>
              <div className="space-y-2">
                {QUESTIONS[currentQ].options.map((opt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleAnswer(idx)}
                    className="w-full text-left px-3 py-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm text-foreground"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
