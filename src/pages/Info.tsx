import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  CloudSun, Target, Trophy, Swords, MapPin, Bell,
  Snowflake, BarChart3, Sparkles, ArrowRight,
  Cloud, Droplets, Wind, ThermometerSun
} from "lucide-react";
import { SEOHead } from "@/components/seo/seo-head";
import rainzLogo from "@/assets/rainz-logo-new.png";
import { RainzImageCarousel } from "@/components/weather/rainz-image-carousel";

const features = [
  {
    icon: CloudSun,
    title: "Multi-Source Forecasts",
    description: "Data from ECMWF, GFS, DWD ICON, and more — aggregated for the most accurate prediction.",
    gradient: "from-sky-500/20 to-blue-500/20",
  },
  {
    icon: Target,
    title: "Daily Predictions",
    description: "Make daily weather predictions and earn points when you're right.",
    gradient: "from-green-500/20 to-emerald-500/20",
  },
  {
    icon: Swords,
    title: "Prediction Battles",
    description: "Challenge friends to weather prediction duels. Winner takes bonus points.",
    gradient: "from-purple-500/20 to-pink-500/20",
  },
  {
    icon: Trophy,
    title: "Leaderboards & Streaks",
    description: "Climb the global leaderboard, build daily streaks, and unlock achievements.",
    gradient: "from-amber-500/20 to-orange-500/20",
  },
  {
    icon: MapPin,
    title: "Hyper-Local Data",
    description: "Weather station-level accuracy with nearby station detection.",
    gradient: "from-red-500/20 to-rose-500/20",
  },
  {
    icon: Sparkles,
    title: "AI Weather Companion",
    description: "Chat with an AI that knows your local weather — from outfits to travel.",
    gradient: "from-indigo-500/20 to-violet-500/20",
  },
];

export default function Info() {
  return (
    <>
      <SEOHead
        title="Rainz — Gamified Weather Forecasting App"
        description="Predict tomorrow's weather, compete with friends, and climb the leaderboard. Rainz combines hyper-accurate multi-source forecasts with gamified predictions."
        keywords="Rainz, weather app, weather prediction game, gamified weather, weather forecast"
      />

      <div className="min-h-screen bg-background flex flex-col">
        {/* Hero */}
        <section className="relative overflow-hidden flex-1 flex items-center">
          {/* Background decoration */}
          <div className="absolute inset-0">
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-sky-500/10 rounded-full blur-[100px]" />
          </div>

          {/* Floating weather icons */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <Cloud className="absolute top-[15%] left-[10%] w-8 h-8 text-muted-foreground/10 animate-pulse" />
            <Droplets className="absolute top-[25%] right-[15%] w-6 h-6 text-sky-500/15 animate-pulse" style={{ animationDelay: "1s" }} />
            <Wind className="absolute bottom-[30%] left-[20%] w-7 h-7 text-muted-foreground/10 animate-pulse" style={{ animationDelay: "0.5s" }} />
            <ThermometerSun className="absolute bottom-[20%] right-[25%] w-6 h-6 text-orange-500/15 animate-pulse" style={{ animationDelay: "1.5s" }} />
          </div>

          <div className="container mx-auto px-4 py-16 sm:py-24 relative z-10 max-w-4xl">
            <div className="text-center space-y-8">
              <div className="inline-flex items-center justify-center">
                <img src={rainzLogo} alt="Rainz" className="h-20 sm:h-24 drop-shadow-xl" />
              </div>

              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                  Weather, but make it
                  <br />
                  <span className="bg-gradient-to-r from-primary via-sky-500 to-primary bg-clip-text text-transparent">
                    competitive
                  </span>
                </h1>
                <p className="text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto leading-relaxed">
                  Predict tomorrow's weather, battle friends, earn points, and climb the leaderboard — powered by hyper-accurate multi-source forecasts.
                </p>
              </div>

              <Button 
                size="lg" 
                className="h-14 px-10 text-lg font-bold gap-3 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                onClick={() => window.location.href = "/"}
              >
                Continue to Rainz
                <ArrowRight className="w-5 h-5" />
              </Button>

              {/* Quick stats */}
              <div className="flex items-center justify-center gap-6 sm:gap-10 pt-4 text-sm text-muted-foreground">
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">6+</div>
                  <div>Sources</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">24/7</div>
                  <div>Updates</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">Free</div>
                  <div>Forever</div>
                </div>
                <div className="w-px h-8 bg-border" />
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">PWA</div>
                  <div>Install</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Image Carousel */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8">Learn more about Rainz</h2>
            <RainzImageCarousel />
          </div>
        </section>

        {/* Features */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-3">Everything you need</h2>
            <p className="text-center text-muted-foreground mb-10 max-w-md mx-auto">
              Accurate forecasts + game mechanics that make weather fun.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {features.map((feature) => (
                <Card key={feature.title} className={`border-border/20 bg-gradient-to-br ${feature.gradient} hover:scale-[1.02] transition-transform`}>
                  <CardContent className="p-5 space-y-3">
                    <feature.icon className="w-7 h-7 text-primary" />
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-16 bg-muted/10 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">How It Works</h2>
            <div className="grid sm:grid-cols-3 gap-8">
              {[
                { step: "1", emoji: "🌤️", title: "Check the Forecast", desc: "AI-enhanced data from 6+ sources for your exact location." },
                { step: "2", emoji: "🎯", title: "Make Your Prediction", desc: "Predict tomorrow's high, low, and conditions. Earn up to 300 points!" },
                { step: "3", emoji: "⚔️", title: "Compete & Win", desc: "Battle friends, climb the leaderboard, unlock achievements." },
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

        {/* Bottom CTA */}
        <section className="py-16 border-t border-border/30">
          <div className="container mx-auto px-4 max-w-2xl text-center space-y-6">
            <h2 className="text-2xl sm:text-3xl font-bold">Ready to outsmart the weather?</h2>
            <p className="text-muted-foreground">
              Join weather enthusiasts who predict, compete, and win every day.
            </p>
            <Button
              size="lg"
              className="h-14 px-10 text-lg font-bold gap-3 rounded-2xl shadow-lg shadow-primary/25"
              onClick={() => window.location.href = "/"}
            >
              Continue to Rainz
              <ArrowRight className="w-5 h-5" />
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
