import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cake, Gift, Sparkles, Trophy, Zap, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BIRTHDAY_LOGO, rejnAgeOn } from "@/lib/birthday-mode";

type Game = "menu" | "pop" | "trivia" | "wheel";

const HIGH_SCORE_KEY = "rejn-birthday-highscores-v1";
type Scores = { pop?: number; trivia?: number; wheelClaims?: string };

function loadScores(): Scores {
  if (typeof localStorage === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY) || "{}"); } catch { return {}; }
}
function saveScores(s: Scores) {
  localStorage.setItem(HIGH_SCORE_KEY, JSON.stringify(s));
}

export function BirthdayMinigames({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [game, setGame] = useState<Game>("menu");
  const [scores, setScores] = useState<Scores>(() => loadScores());

  useEffect(() => { if (!open) setGame("menu"); }, [open]);

  const updateScore = (patch: Scores) => {
    const next = { ...scores, ...patch };
    setScores(next);
    saveScores(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md birthday-dialog overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-amber-500" />
            Rejn Birthday Arcade
          </DialogTitle>
        </DialogHeader>

        {game === "menu" && (
          <MenuView scores={scores} onPick={setGame} />
        )}
        {game === "pop" && (
          <PopBalloons
            best={scores.pop || 0}
            onDone={(score) => {
              if (score > (scores.pop || 0)) updateScore({ pop: score });
            }}
            onBack={() => setGame("menu")}
          />
        )}
        {game === "trivia" && (
          <Trivia
            best={scores.trivia || 0}
            onDone={(score) => {
              if (score > (scores.trivia || 0)) updateScore({ trivia: score });
            }}
            onBack={() => setGame("menu")}
          />
        )}
        {game === "wheel" && (
          <WheelOfRejn
            alreadyClaimed={scores.wheelClaims === new Date().toDateString()}
            onClaim={() => updateScore({ wheelClaims: new Date().toDateString() })}
            onBack={() => setGame("menu")}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Menu ---------- */
function MenuView({ scores, onPick }: { scores: Scores; onPick: (g: Game) => void }) {
  const items: { id: Game; icon: any; title: string; sub: string; best?: string }[] = [
    { id: "pop", icon: Sparkles, title: "Pop the Balloons", sub: "30s — tap golden balloons, dodge bombs", best: scores.pop ? `Best: ${scores.pop}` : undefined },
    { id: "trivia", icon: Zap, title: "Weather Trivia", sub: "5 quick questions, 10s each", best: scores.trivia != null ? `Best: ${scores.trivia}/5` : undefined },
    { id: "wheel", icon: Gift, title: "Wheel of Rejn", sub: "Daily golden spin — 1 prize / day" },
  ];
  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-amber-100/60 to-amber-50/30 dark:from-amber-900/30 dark:to-amber-700/20 border border-amber-400/30">
        <img src={BIRTHDAY_LOGO} alt="" className="h-12 w-12 rounded-xl ring-2 ring-amber-400/60" />
        <div className="min-w-0">
          <p className="font-semibold leading-tight">Rejn turns {rejnAgeOn()} 🎉</p>
          <p className="text-xs text-muted-foreground">Play, win golden swag, brag on the leaderboard.</p>
        </div>
      </div>
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onPick(it.id)}
          data-birthday-glow
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-accent transition text-left"
        >
          <span className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-white shadow">
            <it.icon className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-medium leading-tight">{it.title}</p>
            <p className="text-xs text-muted-foreground">{it.sub}</p>
          </div>
          {it.best && (
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 flex items-center gap-1">
              <Trophy className="h-3 w-3" /> {it.best}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ---------- Pop the Balloons ---------- */
type Balloon = { id: number; x: number; y: number; r: number; bomb: boolean; speed: number };

function PopBalloons({ best, onDone, onBack }: { best: number; onDone: (s: number) => void; onBack: () => void }) {
  const [running, setRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  const rafRef = useRef<number | null>(null);
  const idRef = useRef(0);
  const startRef = useRef(0);

  const start = () => {
    setScore(0);
    setTime(30);
    setBalloons([]);
    setRunning(true);
    startRef.current = performance.now();
  };

  useEffect(() => {
    if (!running) return;
    let last = performance.now();
    let spawnAcc = 0;
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      spawnAcc += dt;
      const elapsed = (now - startRef.current) / 1000;
      const remaining = Math.max(0, 30 - elapsed);
      setTime(Math.ceil(remaining));
      if (remaining <= 0) {
        setRunning(false);
        return;
      }
      // spawn ~every 0.45s
      if (spawnAcc > 0.45) {
        spawnAcc = 0;
        setBalloons((prev) => [
          ...prev,
          {
            id: ++idRef.current,
            x: 10 + Math.random() * 80,
            y: 100,
            r: 18 + Math.random() * 10,
            bomb: Math.random() < 0.18,
            speed: 18 + Math.random() * 22,
          },
        ]);
      }
      setBalloons((prev) =>
        prev
          .map((b) => ({ ...b, y: b.y - b.speed * dt }))
          .filter((b) => b.y > -10),
      );
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running]);

  useEffect(() => {
    if (!running && score > 0) onDone(score);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  const pop = (b: Balloon) => {
    setBalloons((prev) => prev.filter((x) => x.id !== b.id));
    if (b.bomb) {
      setScore((s) => Math.max(0, s - 3));
      navigator.vibrate?.(80);
    } else {
      setScore((s) => s + 1);
      navigator.vibrate?.(15);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm font-semibold">
        <span>⏱ {time}s</span>
        <span className="text-amber-600 dark:text-amber-400">Score: {score}</span>
        <span className="text-xs text-muted-foreground">Best: {best}</span>
      </div>
      <div
        className="relative h-72 w-full rounded-2xl overflow-hidden border border-amber-400/30"
        style={{ background: "linear-gradient(180deg, #fff8dc 0%, #ffe8a3 100%)" }}
      >
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-black/10">
            <p className="text-amber-900 font-bold text-lg">
              {score > 0 ? `Final score: ${score}` : "Tap golden balloons, avoid 💣"}
            </p>
            <Button onClick={start} data-birthday-glow className="bg-amber-500 hover:bg-amber-600 text-amber-950">
              {score > 0 ? "Play again" : "Start"}
            </Button>
          </div>
        )}
        {balloons.map((b) => (
          <button
            key={b.id}
            onClick={() => pop(b)}
            className="absolute -translate-x-1/2 -translate-y-1/2 select-none active:scale-90 transition-transform"
            style={{ left: `${b.x}%`, top: `${b.y}%`, width: b.r * 2, height: b.r * 2 }}
            aria-label={b.bomb ? "bomb" : "balloon"}
          >
            <span className="text-3xl drop-shadow-lg">{b.bomb ? "💣" : "🎈"}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        {!running && score > 0 && (
          <Button onClick={start} className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950" data-birthday-glow>
            <RotateCcw className="h-4 w-4 mr-1" /> Retry
          </Button>
        )}
      </div>
    </div>
  );
}

/* ---------- Weather Trivia ---------- */
const QUESTIONS = [
  { q: "What's the rainiest city in Scandinavia (annually)?", a: ["Bergen, Norway", "Stockholm", "Copenhagen", "Oslo"], correct: 0 },
  { q: "What weather code 95 means in WMO standards?", a: ["Light drizzle", "Snow grains", "Thunderstorm", "Fog"], correct: 2 },
  { q: "At what wind speed does a 'gale' officially start?", a: ["10 m/s", "17.2 m/s", "32 m/s", "8 m/s"], correct: 1 },
  { q: "Lightning is roughly how many times hotter than the sun's surface?", a: ["2×", "5×", "Same temperature", "Cooler"], correct: 1 },
  { q: "Rejn's favourite weather emoji is...", a: ["☀️", "🌧️", "🌩️", "All of them"], correct: 3 },
];

function Trivia({ best, onDone, onBack }: { best: number; onDone: (s: number) => void; onBack: () => void }) {
  const [idx, setIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(10);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done || picked != null) return;
    if (timeLeft <= 0) { setPicked(-1); return; }
    const id = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timeLeft, picked, done]);

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    if (i === QUESTIONS[idx].correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= QUESTIONS.length) {
      setDone(true);
      onDone(score + (picked === QUESTIONS[idx].correct ? 0 : 0));
      return;
    }
    setIdx((x) => x + 1);
    setPicked(null);
    setTimeLeft(10);
  };

  if (done) {
    return (
      <div className="space-y-4 text-center py-4">
        <Trophy className="h-12 w-12 mx-auto text-amber-500" />
        <p className="text-xl font-bold">You scored {score} / {QUESTIONS.length}</p>
        <p className="text-sm text-muted-foreground">Best: {Math.max(best, score)} / {QUESTIONS.length}</p>
        <Button onClick={onBack} className="bg-amber-500 hover:bg-amber-600 text-amber-950" data-birthday-glow>Back to arcade</Button>
      </div>
    );
  }

  const q = QUESTIONS[idx];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>Question {idx + 1} / {QUESTIONS.length}</span>
        <span>Score: {score}</span>
        <span className={timeLeft <= 3 ? "text-destructive" : ""}>⏱ {timeLeft}s</span>
      </div>
      <p className="font-medium text-base">{q.q}</p>
      <div className="grid gap-2">
        {q.a.map((opt, i) => {
          const isCorrect = picked != null && i === q.correct;
          const isWrong = picked === i && i !== q.correct;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={picked != null}
              className={`text-left px-4 py-3 rounded-xl border transition ${
                isCorrect ? "bg-emerald-500/20 border-emerald-500" :
                isWrong ? "bg-destructive/20 border-destructive" :
                "bg-card border-border hover:bg-accent"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {picked != null && (
        <Button onClick={next} className="w-full bg-amber-500 hover:bg-amber-600 text-amber-950" data-birthday-glow>
          {idx + 1 >= QUESTIONS.length ? "See results" : "Next"}
        </Button>
      )}
      <Button variant="ghost" onClick={onBack} size="sm" className="w-full">Quit</Button>
    </div>
  );
}

/* ---------- Wheel of Rejn ---------- */
const WHEEL_PRIZES = [
  { label: "50 SP", icon: "💰" },
  { label: "Streak Freeze", icon: "🧊" },
  { label: "2× Multiplier", icon: "⚡" },
  { label: "Golden Badge", icon: "🏅" },
  { label: "+1 Prediction", icon: "🎯" },
  { label: "Try again", icon: "🔁" },
  { label: "Golden Avatar", icon: "👑" },
  { label: "Mystery Box", icon: "🎁" },
];

function WheelOfRejn({ alreadyClaimed, onClaim, onBack }: { alreadyClaimed: boolean; onClaim: () => void; onBack: () => void }) {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<typeof WHEEL_PRIZES[number] | null>(null);
  const seg = 360 / WHEEL_PRIZES.length;

  const wheelBg = useMemo(() => {
    const stops = WHEEL_PRIZES.map((_, i) => {
      const from = i * seg;
      const to = (i + 1) * seg;
      const color = i % 2 === 0 ? "#f1c40f" : "#b8860b";
      return `${color} ${from}deg ${to}deg`;
    }).join(", ");
    return `conic-gradient(${stops})`;
  }, [seg]);

  const spin = () => {
    if (spinning || alreadyClaimed) return;
    setSpinning(true);
    setPrize(null);
    const pick = Math.floor(Math.random() * WHEEL_PRIZES.length);
    const target = 360 * 6 + (360 - (pick * seg + seg / 2));
    setAngle(target);
    setTimeout(() => {
      setSpinning(false);
      setPrize(WHEEL_PRIZES[pick]);
      onClaim();
      toast.success(`🎉 You won: ${WHEEL_PRIZES[pick].label}`, {
        description: "Come back tomorrow for another spin!",
      });
    }, 4200);
  };

  return (
    <div className="space-y-4 text-center">
      <div className="relative mx-auto" style={{ width: 240, height: 240 }}>
        {/* Pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-2 z-10 text-2xl">▼</div>
        <motion.div
          className="rounded-full border-4 border-amber-300 shadow-2xl relative overflow-hidden"
          style={{ width: 240, height: 240, background: wheelBg }}
          animate={{ rotate: angle }}
          transition={{ duration: 4, ease: [0.17, 0.67, 0.21, 0.99] }}
        >
          {WHEEL_PRIZES.map((p, i) => {
            const a = i * seg + seg / 2;
            return (
              <div
                key={i}
                className="absolute left-1/2 top-1/2 text-amber-950 font-bold text-xs"
                style={{
                  transform: `rotate(${a}deg) translateY(-90px) rotate(${-a}deg)`,
                  transformOrigin: "0 0",
                }}
              >
                <div className="-translate-x-1/2 flex flex-col items-center w-16">
                  <span className="text-lg leading-none">{p.icon}</span>
                  <span className="leading-tight">{p.label}</span>
                </div>
              </div>
            );
          })}
        </motion.div>
        {/* Hub */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-gradient-to-br from-amber-200 to-amber-500 border-4 border-amber-700 shadow-inner" />
      </div>
      <AnimatePresence>
        {prize && (
          <motion.p initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-bold text-amber-600 dark:text-amber-300">
            🎁 You won {prize.label}!
          </motion.p>
        )}
      </AnimatePresence>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onBack} className="flex-1">Back</Button>
        <Button
          onClick={spin}
          disabled={spinning || alreadyClaimed}
          className="flex-1 bg-amber-500 hover:bg-amber-600 text-amber-950 disabled:opacity-60"
          data-birthday-glow
        >
          {alreadyClaimed ? "Come back tomorrow" : spinning ? "Spinning…" : "Spin!"}
        </Button>
      </div>
    </div>
  );
}
