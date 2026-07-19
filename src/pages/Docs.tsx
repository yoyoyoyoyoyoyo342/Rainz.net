import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Cloud, Search, Zap, Shield, Trophy, Map, Bell, Sparkles, Code,
  Smartphone, Globe, Database, Heart, Users, BarChart3, Wind,
  Droplets, Sun, MessageSquare, ExternalLink, ChevronRight, Menu, X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SEOHead } from "@/components/seo/seo-head";
import { subdomainHref } from "@/lib/subdomain-routing";

interface DocSection {
  id: string;
  title: string;
  category: string;
  icon: any;
  summary: string;
  content: React.ReactNode;
}

const SECTIONS: DocSection[] = [
  {
    id: "intro",
    title: "What is Rejn?",
    category: "Getting Started",
    icon: Cloud,
    summary: "An AI-powered, completely free weather app built for Scandinavia and beyond.",
    content: (
      <>
        <p>
          Rejn is a free, AI-enhanced weather platform aimed at people aged 13–35 in
          Scandinavia. We combine seven Open-Meteo numerical models, Met.no, OpenWeatherMap,
          and live weather stations to give you a forecast that's noticeably more accurate
          than any single provider.
        </p>
        <p>
          On top of that we layer prediction games, head-to-head battles, dry-route navigation,
          a social feed, and an AR overlay — all wrapped in a dark, Apple Liquid Glass aesthetic.
        </p>
        <h4>Core principles</h4>
        <ul>
          <li>100% free, no paywalls, no "Rejn+" tier.</li>
          <li>Privacy-first: location and predictions stay on-device or in your account.</li>
          <li>Graceful degradation — if the LLM is down, you still get raw forecast data.</li>
        </ul>
      </>
    ),
  },
  {
    id: "quickstart",
    title: "Quick start",
    category: "Getting Started",
    icon: Zap,
    summary: "Land on the homepage, allow location, start predicting.",
    content: (
      <>
        <ol>
          <li>Open <a href="https://rainz.net">rainz.net</a> — there is no onboarding flow.</li>
          <li>Allow location access when prompted (one-time, persisted locally).</li>
          <li>Optionally sign up to save locations, predict the weather, and earn trophies.</li>
          <li>Tap any tab in the bottom bar: Weather, Predict, Social, Explore, DryRoutes.</li>
        </ol>
      </>
    ),
  },
  {
    id: "routing",
    title: "Path-based routing",
    category: "Architecture",
    icon: Globe,
    summary: "All pages live on rejn.app as standard paths.",
    content: (
      <>
        <p>
          Every page is served from the canonical apex <code>rejn.app</code> using
          standard paths. Legacy <code>*.rainz.net</code> and <code>*.rejn.app</code>
          subdomains 301-redirect to their equivalent path.
        </p>
        <h4>Top-level paths</h4>
        <ul>
          <li><code>rejn.app/predict</code> — Daily prediction game</li>
          <li><code>rejn.app/social</code> — Live community feed</li>
          <li><code>rejn.app/explore</code> — Discover other users and locations</li>
          <li><code>rejn.app/dryroutes</code> — Rain-free route planning</li>
          <li><code>rejn.app/widgets</code> — Embeddable weather widgets</li>
          <li><code>rejn.app/download</code> — PWA & native app installers</li>
          <li><code>rejn.app/airport</code> — Airport weather product</li>
          <li><code>rejn.app/docs</code> — This documentation</li>
          <li><code>rejn.app/articles</code> — Blog & articles</li>
          <li><code>rejn.app/api</code> — Public API landing</li>
        </ul>
        <h4>City pages</h4>
        <p>
          250+ cities each get their own page (e.g. <code>rejn.app/weather/oslo</code>,
          <code>rejn.app/weather/london</code>, <code>rejn.app/weather/berlin</code>).
        </p>
        <h4>Auth</h4>
        <p>
          Your Supabase session is stored in <code>localStorage</code> on the apex —
          one host, one cookie jar, no cross-subdomain complexity.
        </p>
      </>
    ),
  },
  {
    id: "predictions",
    title: "Prediction game",
    category: "Features",
    icon: Trophy,
    summary: "One prediction per day, points scaled by confidence multipliers.",
    content: (
      <>
        <p>
          You can submit one weather prediction per day per location. Each prediction has three
          components — temperature, precipitation, and condition — verified at 21:00 UTC against
          a normalized Celsius reading.
        </p>
        <h4>Scoring</h4>
        <ul>
          <li>Each correct component awards 100 base points.</li>
          <li>A 2.5× confidence multiplier can be applied via the predict dialog.</li>
          <li>Monthly winners receive a trophy on their profile.</li>
        </ul>
      </>
    ),
  },
  {
    id: "battles",
    title: "Battles",
    category: "Features",
    icon: Users,
    summary: "Head-to-head prediction duels with friends.",
    content: (
      <>
        <p>
          Challenge any user (or share a public link) to a head-to-head battle. Whoever's
          prediction is closest to the actual reading wins the pot.
        </p>
        <ul>
          <li>Winner: <strong>+100 points</strong></li>
          <li>Loser: <strong>−50 points</strong></li>
          <li>Battle invites use the format <code>predict.rainz.net/?accept_battle=&lt;id&gt;</code>.</li>
        </ul>
      </>
    ),
  },
  {
    id: "dryroutes",
    title: "DryRoutes",
    category: "Features",
    icon: Map,
    summary: "Plan a route that dodges the rain.",
    content: (
      <>
        <p>
          DryRoutes uses the MOTIS Transitous API combined with our precipitation ensemble to
          score multiple route candidates by how much rain you'd actually walk through. The
          full-screen experience lives on <code>dryroutes.rainz.net</code>.
        </p>
      </>
    ),
  },
  {
    id: "ensemble",
    title: "Multi-model ensemble",
    category: "How it works",
    icon: BarChart3,
    summary: "We aggregate 7 Open-Meteo models, Met.no and OpenWeatherMap.",
    content: (
      <>
        <p>
          Rather than trusting a single forecast provider, Rejn queries multiple numerical
          weather prediction models in parallel and aggregates them. Models that historically
          performed better in your region get weighted higher.
        </p>
        <ul>
          <li>ECMWF, GFS, ICON, GEM, Met.no, JMA, MetOffice (via Open-Meteo)</li>
          <li>OpenWeatherMap as an independent cross-check</li>
          <li>Live weather-station readings from WeatherAPI, Tomorrow.io, Open-Meteo</li>
        </ul>
      </>
    ),
  },
  {
    id: "ai",
    title: "AI weather companion (PAI)",
    category: "How it works",
    icon: Sparkles,
    summary: "Groq-powered LLM that explains the forecast in plain language.",
    content: (
      <>
        <p>
          Our AI layer runs on Groq with a Llama 3.3 → Mixtral → Llama 3.1 fallback chain,
          and degrades gracefully to raw API data when all LLMs are unavailable. It powers
          weather summaries, the morning email, brain teasers, and the Storyteller mode.
        </p>
      </>
    ),
  },
  {
    id: "morning-email",
    title: "Morning weather emails",
    category: "Features",
    icon: Bell,
    summary: "Personalized 2-sentence summary in your language at your chosen time.",
    content: (
      <>
        <p>
          Sent from <code>notify.rainz.net</code> via Resend. Templates are localized in EN, NO, SV,
          DA, DE, FR, and ES. Idempotency keys prevent duplicate sends.
        </p>
        <p>
          Manage delivery in <strong>Settings → Notifications</strong>, or unsubscribe at
          <a href={subdomainHref("/unsubscribe")}> /unsubscribe</a>.
        </p>
      </>
    ),
  },
  {
    id: "widgets",
    title: "Embeddable widgets",
    category: "Developers",
    icon: Code,
    summary: "Drop a Rejn weather widget into any site with one line of HTML.",
    content: (
      <>
        <p>Build a widget at <a href={subdomainHref("/widgets")}>widgets.rainz.net</a> and copy the iframe snippet:</p>
        <pre><code>{`<iframe src="https://rainz.net/embed?lat=55.6761&lon=12.5683"
        width="320" height="420"
        frameborder="0"></iframe>`}</code></pre>
      </>
    ),
  },
  {
    id: "api",
    title: "Public API",
    category: "Developers",
    icon: Database,
    summary: "Free /api/weather endpoint with umbrellaScore and edge caching.",
    content: (
      <>
        <p>
          Hit <code>https://rainz.net/api/weather?lat=…&amp;lon=…</code> for a JSON response with
          current conditions, 24-hour forecast, and our proprietary <code>umbrellaScore</code>.
        </p>
        <pre><code>{`curl "https://rainz.net/api/weather?lat=55.68&lon=12.57"`}</code></pre>
        <p>See <a href={subdomainHref("/api")}>api.rainz.net pricing & terms</a> for higher volumes.</p>
      </>
    ),
  },
  {
    id: "mcp",
    title: "MCP server",
    category: "Developers",
    icon: MessageSquare,
    summary: "Model Context Protocol endpoint for AI assistants.",
    content: (
      <>
        <p>
          Public MCP endpoint at <code>https://ohwtbkudpkfbakynikyj.supabase.co/functions/v1/rainz-mcp/mcp</code>.
          Use it to give ChatGPT, Claude, or any MCP-compatible client live access to Rejn weather data.
        </p>
        <p>Setup instructions at <a href={subdomainHref("/mcp")}>mcp.rainz.net</a>.</p>
      </>
    ),
  },
  {
    id: "auth",
    title: "Authentication",
    category: "Account",
    icon: Shield,
    summary: "Email + password, Google sign-in, password resets via Resend.",
    content: (
      <>
        <p>Sign in or sign up at <a href={subdomainHref("/auth")}>auth.rainz.net</a>.</p>
        <h4>Password requirements</h4>
        <ul>
          <li>At least 8 characters</li>
          <li>At least one uppercase, one lowercase, one number, one special character</li>
        </ul>
        <p>
          Sessions are stored in a <code>.rainz.net</code> cookie so you stay logged in across all
          subdomains.
        </p>
      </>
    ),
  },
  {
    id: "platforms",
    title: "Platforms",
    category: "Account",
    icon: Smartphone,
    summary: "Web, PWA, iOS, Android, macOS, Windows.",
    content: (
      <>
        <p>
          Rejn runs everywhere. Some features (Battles, AI Companion) are restricted to
          PWA/desktop installs because they require background sync.
        </p>
        <p>Get installers at <a href={subdomainHref("/download")}>download.rainz.net</a>.</p>
      </>
    ),
  },
  {
    id: "privacy",
    title: "Privacy & data",
    category: "Account",
    icon: Heart,
    summary: "What we store, what we don't, and how to delete it.",
    content: (
      <>
        <p>
          We store your saved locations, predictions, and a coarse usage profile (Amplitude
          session replay at 100% sample rate, anonymized). Read the full
          <a href={subdomainHref("/privacy")}> Privacy Policy</a> and manage your data at
          <a href={subdomainHref("/data-settings")}> /data-settings</a>.
        </p>
      </>
    ),
  },
];

const CATEGORIES = Array.from(new Set(SECTIONS.map((s) => s.category)));

export default function Docs() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string>(SECTIONS[0].id);
  const [navOpen, setNavOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!query.trim()) return SECTIONS;
    const q = query.toLowerCase();
    return SECTIONS.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.summary.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q)
    );
  }, [query]);

  const activeSection = SECTIONS.find((s) => s.id === active) || SECTIONS[0];

  return (
    <>
      <SEOHead
        title="Rejn Docs — Documentation, API, and developer guide"
        description="Complete documentation for Rejn Weather: subdomains, API, MCP server, embeddable widgets, prediction game rules, and more."
        keywords="Rejn docs, weather API docs, MCP server, weather widgets, Rejn developer guide"
      />

      <div className="min-h-screen bg-background text-foreground">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex h-14 items-center gap-3 px-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setNavOpen((o) => !o)}
              aria-label="Toggle navigation"
            >
              {navOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <Cloud className="h-5 w-5 text-primary" />
              <span>Rejn Docs</span>
            </Link>
            <Badge variant="secondary" className="ml-1 text-[10px]">
              v1.0
            </Badge>
            <div className="ml-auto flex items-center gap-2">
              <a
                href="https://rainz.net"
                className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline-flex items-center gap-1"
              >
                rainz.net <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="container mx-auto px-4 pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the docs…"
                className="h-9 pl-9"
              />
            </div>
          </div>
        </header>

        <div className="container mx-auto grid gap-8 px-4 py-8 md:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside
            className={`${
              navOpen ? "block" : "hidden"
            } md:block md:sticky md:top-32 md:max-h-[calc(100vh-9rem)]`}
          >
            <ScrollArea className="md:max-h-[calc(100vh-10rem)]">
              <nav className="space-y-6 pb-8">
                {CATEGORIES.map((cat) => {
                  const items = filtered.filter((s) => s.category === cat);
                  if (items.length === 0) return null;
                  return (
                    <div key={cat}>
                      <h4 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {cat}
                      </h4>
                      <ul className="space-y-1">
                        {items.map((s) => {
                          const Icon = s.icon;
                          const isActive = active === s.id;
                          return (
                            <li key={s.id}>
                              <button
                                onClick={() => {
                                  setActive(s.id);
                                  setNavOpen(false);
                                }}
                                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                                  isActive
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                }`}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span className="truncate">{s.title}</span>
                                {isActive && (
                                  <ChevronRight className="ml-auto h-3 w-3" />
                                )}
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="px-2 text-sm text-muted-foreground">
                    No results for "{query}".
                  </p>
                )}
              </nav>
            </ScrollArea>
          </aside>

          {/* Main */}
          <main className="min-w-0">
            <motion.article
              key={activeSection.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="prose prose-invert max-w-none dark:prose-invert"
            >
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2 text-primary">
                  <activeSection.icon className="h-6 w-6" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-1 text-[10px]">
                    {activeSection.category}
                  </Badge>
                  <h1 className="m-0 text-3xl font-bold tracking-tight">
                    {activeSection.title}
                  </h1>
                </div>
              </div>
              <p className="text-lg text-muted-foreground">{activeSection.summary}</p>
              <div className="mt-6 space-y-4 text-foreground/90 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm [&_h4]:mt-6 [&_h4]:font-semibold [&_li]:my-1 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6">
                {activeSection.content}
              </div>
            </motion.article>

            {/* Quick links footer */}
            <Card className="mt-12 p-6">
              <h3 className="mb-3 text-sm font-semibold">Useful links</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "API pricing", href: subdomainHref("/api") },
                  { label: "MCP setup", href: subdomainHref("/mcp") },
                  { label: "Articles & blog", href: "https://blog.rainz.net" },
                  { label: "Privacy policy", href: subdomainHref("/privacy") },
                  { label: "Terms of service", href: subdomainHref("/terms") },
                  { label: "Download apps", href: subdomainHref("/download") },
                ].map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-sm hover:bg-muted"
                  >
                    {link.label}
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </Card>
          </main>
        </div>
      </div>
    </>
  );
}
