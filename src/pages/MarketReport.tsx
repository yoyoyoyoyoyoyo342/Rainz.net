import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SEOHead } from "@/components/seo/seo-head";
import {
  TrendingUp,
  Users,
  Target,
  Swords,
  FileText,
  MapPin,
  Trophy,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  BarChart3,
  Cloud,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

type QuarterKey = "Q3-2025" | "Q4-2025" | "Q1-2026" | "Q2-2026";

interface QuarterData {
  label: string;
  subtitle: string;
  dateRange: string;
  predictions: number;
  uniquePredictors: number;
  correctPredictions: number;
  accuracyRate: number;
  pointsEarned: number;
  newUsers: number;
  battles: number;
  articles: number;
  savedLocations: number;
  searchQueries: number;
  dailySpins: number;
  shopPurchases: number;
  aiConversations: number;
  featureIdeas: number;
  streakChallenges: number;
  weatherDebates: number;
  cityPages: number;
  highlights: string[];
  milestones: string[];
  isPartial?: boolean;
}

const QUARTER_DATA: Record<QuarterKey, QuarterData> = {
  "Q3-2025": {
    label: "Q3 2025",
    subtitle: "The Beginning",
    dateRange: "August – September 2025",
    predictions: 0,
    uniquePredictors: 0,
    correctPredictions: 0,
    accuracyRate: 0,
    pointsEarned: 0,
    newUsers: 1,
    battles: 0,
    articles: 0,
    highlights: [
      "Rainz Weather launched in August 2025, bringing AI-powered hyper-local weather forecasting to Scandinavia",
      "Core platform built with multi-model ensemble forecasting (ECMWF, GFS, Met.no, SMHI)",
      "Progressive Web App (PWA) support shipped from day one",
      "Initial weather prediction game system designed and prototyped",
    ],
    milestones: [
      "🚀 Platform launch — August 2025",
      "🌦️ Multi-source weather aggregation live",
      "📱 PWA with offline support deployed",
      "🤖 AI Weather Companion (PAI) conceived",
    ],
  },
  "Q4-2025": {
    label: "Q4 2025",
    subtitle: "Building Momentum",
    dateRange: "October – December 2025",
    predictions: 60,
    uniquePredictors: 8,
    correctPredictions: 18,
    accuracyRate: 30,
    pointsEarned: 2100,
    newUsers: 10,
    battles: 7,
    articles: 3,
    highlights: [
      "Prediction system went live — 60 weather predictions made by 8 users",
      "Prediction Battles launched with 7 head-to-head challenges",
      "First blog articles published, establishing Rainz as a weather content hub",
      "User base grew to 11 registered accounts across Scandinavia",
      "Leaderboard and points system introduced to gamify forecasting",
    ],
    milestones: [
      "🎯 First 60 weather predictions submitted",
      "⚔️ Prediction Battles feature launched",
      "📝 3 weather articles published",
      "👥 10 new users joined the platform",
      "🏆 Monthly leaderboard system introduced",
    ],
  },
  "Q1-2026": {
    label: "Q1 2026",
    subtitle: "Explosive Growth",
    dateRange: "January – March 2026",
    predictions: 166,
    uniquePredictors: 6,
    correctPredictions: 164,
    accuracyRate: 98.8,
    pointsEarned: 71000,
    newUsers: 3,
    battles: 56,
    articles: 7,
    highlights: [
      "Prediction volume surged 177% quarter-over-quarter — 166 verified predictions",
      "Accuracy rate skyrocketed to 98.8%, up from 30% in Q4 — users mastered the system",
      "Prediction Battles exploded with 56 battles, an 8x increase from Q4",
      "71,000 points earned across the platform, a 33x increase from Q4",
      "7 new weather articles published, more than doubling Q4 content output",
      "Trophy system launched — monthly winners now earn permanent trophies",
      "AI Weather Companion (PAI) fully integrated for personalized forecasts",
    ],
    milestones: [
      "📈 177% growth in predictions (60 → 166)",
      "🎯 98.8% prediction accuracy achieved",
      "⚔️ 56 Prediction Battles fought (8x growth)",
      "💰 71,000 total points earned (33x growth)",
      "🏆 Trophy Board & monthly awards launched",
      "🤖 PAI AI assistant fully deployed",
      "📰 7 weather science articles published",
    ],
  },
  "Q2-2026": {
    label: "Q2 2026",
    subtitle: "Scaling Up",
    dateRange: "April – June 2026",
    predictions: 10,
    uniquePredictors: 3,
    correctPredictions: 10,
    accuracyRate: 100,
    pointsEarned: 6700,
    newUsers: 1,
    battles: 3,
    articles: 2,
    isPartial: true,
    highlights: [
      "Q2 is just getting started — early data shows 100% prediction accuracy maintained",
      "Market report system launched for full platform transparency",
      "Airport weather intelligence product page published",
      "Continued investment in AI-enhanced forecasting models",
    ],
    milestones: [
      "📊 Quarterly Market Reports launched",
      "✈️ Airport weather product showcase live",
      "🎯 100% accuracy maintained in early Q2",
      "🔬 Ongoing AI model improvements",
    ],
  },
};

const QUARTERS: QuarterKey[] = ["Q3-2025", "Q4-2025", "Q1-2026", "Q2-2026"];

function getGrowth(current: number, previous: number): { value: string; direction: "up" | "down" | "flat" } {
  if (previous === 0) return { value: "New", direction: "up" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { value: `+${pct}%`, direction: "up" };
  if (pct < 0) return { value: `${pct}%`, direction: "down" };
  return { value: "0%", direction: "flat" };
}

function GrowthBadge({ current, previous }: { current: number; previous: number }) {
  const { value, direction } = getGrowth(current, previous);
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      direction === "up" ? "text-emerald-400" : direction === "down" ? "text-red-400" : "text-muted-foreground"
    }`}>
      {direction === "up" && <ArrowUpRight className="h-3 w-3" />}
      {direction === "down" && <ArrowDownRight className="h-3 w-3" />}
      {direction === "flat" && <Minus className="h-3 w-3" />}
      {value}
    </span>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  current,
  previous,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  current: number;
  previous: number;
}) {
  return (
    <Card className="p-5 bg-card/60 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <GrowthBadge current={current} previous={previous} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </Card>
  );
}

function QuarterReport({ quarterKey }: { quarterKey: QuarterKey }) {
  const data = QUARTER_DATA[quarterKey];
  const prevIdx = QUARTERS.indexOf(quarterKey) - 1;
  const prev = prevIdx >= 0 ? QUARTER_DATA[QUARTERS[prevIdx]] : null;

  return (
    <div className="space-y-8 animate-in fade-in-0 duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="outline" className="text-xs border-primary/40 text-primary">
            {data.dateRange}
          </Badge>
          {data.isPartial && (
            <Badge variant="secondary" className="text-xs">
              In Progress
            </Badge>
          )}
        </div>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          {data.label}: {data.subtitle}
        </h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Quarterly performance report for the Rainz Weather platform
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          icon={Target}
          label="Predictions Made"
          value={data.predictions.toLocaleString()}
          current={data.predictions}
          previous={prev?.predictions ?? 0}
        />
        <MetricCard
          icon={Users}
          label="Active Predictors"
          value={data.uniquePredictors.toLocaleString()}
          current={data.uniquePredictors}
          previous={prev?.uniquePredictors ?? 0}
        />
        <MetricCard
          icon={Swords}
          label="Battles Fought"
          value={data.battles.toLocaleString()}
          current={data.battles}
          previous={prev?.battles ?? 0}
        />
        <MetricCard
          icon={TrendingUp}
          label="Points Earned"
          value={data.pointsEarned >= 1000 ? `${(data.pointsEarned / 1000).toFixed(1)}K` : data.pointsEarned.toString()}
          current={data.pointsEarned}
          previous={prev?.pointsEarned ?? 0}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          icon={Zap}
          label="Accuracy Rate"
          value={data.accuracyRate > 0 ? `${data.accuracyRate}%` : "N/A"}
          current={data.accuracyRate}
          previous={prev?.accuracyRate ?? 0}
        />
        <MetricCard
          icon={Users}
          label="New Users"
          value={data.newUsers.toLocaleString()}
          current={data.newUsers}
          previous={prev?.newUsers ?? 0}
        />
        <MetricCard
          icon={FileText}
          label="Articles Published"
          value={data.articles.toLocaleString()}
          current={data.articles}
          previous={prev?.articles ?? 0}
        />
        <MetricCard
          icon={Trophy}
          label="Correct Predictions"
          value={data.correctPredictions.toLocaleString()}
          current={data.correctPredictions}
          previous={prev?.correctPredictions ?? 0}
        />
      </div>

      {/* Highlights & Milestones */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Highlights</h3>
          </div>
          <ul className="space-y-3">
            {data.highlights.map((h, i) => (
              <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">•</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-6 bg-card/60 backdrop-blur-sm border-border/50">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Key Milestones</h3>
          </div>
          <ul className="space-y-3">
            {data.milestones.map((m, i) => (
              <li key={i} className="text-sm text-muted-foreground">
                {m}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Cumulative Stats Bar */}
      <Card className="p-6 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
        <h3 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
          Cumulative Platform Totals (as of end of {data.label})
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {(() => {
            const idx = QUARTERS.indexOf(quarterKey);
            const cumPredictions = QUARTERS.slice(0, idx + 1).reduce((s, q) => s + QUARTER_DATA[q].predictions, 0);
            const cumBattles = QUARTERS.slice(0, idx + 1).reduce((s, q) => s + QUARTER_DATA[q].battles, 0);
            const cumArticles = QUARTERS.slice(0, idx + 1).reduce((s, q) => s + QUARTER_DATA[q].articles, 0);
            const cumUsers = QUARTERS.slice(0, idx + 1).reduce((s, q) => s + QUARTER_DATA[q].newUsers, 0);
            const cumPoints = QUARTERS.slice(0, idx + 1).reduce((s, q) => s + QUARTER_DATA[q].pointsEarned, 0);
            return (
              <>
                <div>
                  <p className="text-xl font-bold text-foreground">{cumPredictions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Predictions</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{cumBattles.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Battles</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{cumUsers.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Registered Users</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{cumPoints >= 1000 ? `${(cumPoints / 1000).toFixed(1)}K` : cumPoints}</p>
                  <p className="text-xs text-muted-foreground">Points Distributed</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-foreground">{cumArticles}</p>
                  <p className="text-xs text-muted-foreground">Articles Published</p>
                </div>
              </>
            );
          })()}
        </div>
      </Card>
    </div>
  );
}

export default function MarketReport() {
  const [activeQuarter, setActiveQuarter] = useState<QuarterKey>("Q1-2026");
  const navigate = useNavigate();

  return (
    <>
      <SEOHead
        title="Rainz Weather — Quarterly Market Report"
        description="Platform performance, growth metrics, and milestones from the Rainz Weather ecosystem. Predictions, battles, user growth, and more."
        keywords="Rainz market report, weather app statistics, Rainz growth, quarterly report, weather predictions data"
        canonicalUrl="https://rainz.net/market-report"
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
          <div className="relative max-w-5xl mx-auto px-4 py-16 md:py-24 text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Cloud className="h-6 w-6 text-primary" />
              <span className="text-sm font-medium text-primary uppercase tracking-widest">Rainz Weather</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
              Market Report
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Transparent quarterly insights into the Rainz Weather platform — user growth,
              prediction accuracy, community engagement, and product milestones.
            </p>
          </div>
        </div>

        {/* Quarter Tabs */}
        <div className="max-w-5xl mx-auto px-4 py-8">
          <Tabs value={activeQuarter} onValueChange={(v) => setActiveQuarter(v as QuarterKey)}>
            <TabsList className="grid w-full grid-cols-4 mb-8">
              {QUARTERS.map((q) => (
                <TabsTrigger key={q} value={q} className="text-xs sm:text-sm">
                  {QUARTER_DATA[q].label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <QuarterReport quarterKey={activeQuarter} />

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t border-border/40 text-center">
            <p className="text-xs text-muted-foreground">
              Data sourced from the Rainz Weather platform database. All metrics reflect verified,
              production data. Updated quarterly.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 text-sm text-primary hover:underline"
            >
              ← Back to Rainz Weather
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
