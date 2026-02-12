import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CloudSun, Target, Trophy, Swords, MapPin, Bell,
  Snowflake, BarChart3, Moon, Sparkles, ArrowRight,
  Download, Star, Users, Zap
} from "lucide-react";
import { SEOHead } from "@/components/seo/seo-head";
import rainzLogo from "@/assets/rainz-logo-new.png";

const features = [
  {
    icon: CloudSun,
    title: "Multi-Source Forecasts",
    description: "Data from ECMWF, GFS, DWD ICON, and more — aggregated for the most accurate prediction."
  },
  {
    icon: Target,
    title: "Predict Tomorrow's Weather",
    description: "Make daily weather predictions and earn points when you're right. How well do you know your local weather?"
  },
  {
    icon: Swords,
    title: "Prediction Battles",
    description: "Challenge friends or strangers to weather prediction duels. Winner takes bonus points."
  },
  {
    icon: Trophy,
    title: "Leaderboards & Streaks",
    description: "Climb the global leaderboard, build daily streaks, and unlock achievements."
  },
  {
    icon: MapPin,
    title: "Hyper-Local Data",
    description: "Weather station-level accuracy with nearby station detection and minute-by-minute updates."
  },
  {
    icon: BarChart3,
    title: "Weather Trends",
    description: "Track temperature, precipitation, and condition patterns over time for any location."
  },
  {
    icon: Moon,
    title: "Moon & Pollen Tracking",
    description: "Detailed moon phases, sunrise/sunset times, and pollen forecasts for allergy sufferers."
  },
  {
    icon: Sparkles,
    title: "AI Weather Companion",
    description: "Chat with an AI that knows your local weather — ask anything from outfit advice to travel planning."
  },
];

const stats = [
  { value: "6+", label: "Weather Sources" },
  { value: "24/7", label: "Real-time Updates" },
  { value: "Free", label: "Core Features" },
  { value: "PWA", label: "Works Offline" },
];

export default function Info() {
  return (
    <>
      <SEOHead
        title="Rainz — Gamified Weather Forecasting App"
        description="Predict tomorrow's weather, compete with friends, and climb the leaderboard. Rainz combines hyper-accurate multi-source forecasts with gamified predictions, battles, and streaks."
        keywords="Rainz, weather app, weather prediction game, gamified weather, weather forecast, Product Hunt"
      />

      <div className="min-h-screen bg-background">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
          <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10 max-w-5xl">
            <div className="text-center space-y-6">
              <img src={rainzLogo} alt="Rainz" className="h-16 mx-auto mb-4" />
              <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-foreground">
                Weather, but make it <span className="text-primary">competitive</span>.
              </h1>
              <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto">
                Predict tomorrow's weather, battle your friends, earn points, and climb the leaderboard — all powered by hyper-accurate multi-source forecasts.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button size="lg" className="gap-2 text-base px-8" onClick={() => window.location.href = "/"}>
                  <Zap className="w-5 h-5" />
                  Try Rainz Free
                </Button>
                <Button size="lg" variant="outline" className="gap-2 text-base px-8" onClick={() => window.location.href = "/download"}>
                  <Download className="w-5 h-5" />
                  Install PWA
                </Button>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center p-4 rounded-xl bg-card/50 border border-border/30">
                  <div className="text-2xl sm:text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-16 bg-muted/10">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: "1", emoji: "🌤️", title: "Check the Forecast", desc: "Get AI-enhanced weather data from 6+ sources for your exact location." },
                { step: "2", emoji: "🎯", title: "Make Your Prediction", desc: "Predict tomorrow's high, low, and conditions. Earn up to 300 points!" },
                { step: "3", emoji: "⚔️", title: "Compete & Win", desc: "Battle friends, climb the leaderboard, and unlock achievements." },
              ].map((item) => (
                <div key={item.step} className="text-center space-y-3">
                  <div className="text-5xl">{item.emoji}</div>
                  <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-4">Packed with Features</h2>
            <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
              Everything you need from a weather app — plus the game mechanics that make it addictive.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((feature) => (
                <Card key={feature.title} className="glass-card border-border/30 hover:border-primary/30 transition-colors">
                  <CardContent className="p-5 space-y-3">
                    <feature.icon className="w-8 h-8 text-primary" />
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Seasonal Events */}
        <section className="py-16 bg-muted/10">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-3xl font-bold text-center mb-12">Seasonal Events</h2>
            <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
              <Card className="glass-card border-green-500/30 bg-gradient-to-br from-green-950/20 to-red-950/20">
                <CardContent className="p-6 space-y-3">
                  <div className="text-3xl">🎄</div>
                  <h3 className="font-semibold text-green-400">Christmas Advent Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Open a new door every day from December 1-25. Claim points, streak freezes, mystery boxes, and more.
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card border-purple-500/30 bg-gradient-to-br from-indigo-950/20 to-purple-950/20">
                <CardContent className="p-6 space-y-3">
                  <div className="text-3xl">☪️</div>
                  <h3 className="font-semibold text-purple-400">Ramadan Calendar</h3>
                  <p className="text-sm text-muted-foreground">
                    Daily rewards during Ramadan, claimable only after sunset or before sunrise — verified by your location's solar data.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container mx-auto px-4 max-w-3xl text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl font-bold">Ready to outsmart the weather?</h2>
            <p className="text-lg text-muted-foreground">
              Join thousands of weather enthusiasts who predict, compete, and win every day.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" className="gap-2 text-base px-8" onClick={() => window.location.href = "/auth"}>
                <Star className="w-5 h-5" />
                Sign Up Free
              </Button>
              <Button size="lg" variant="outline" className="gap-2 text-base px-8" onClick={() => window.location.href = "/"}>
                <ArrowRight className="w-5 h-5" />
                Explore as Guest
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
