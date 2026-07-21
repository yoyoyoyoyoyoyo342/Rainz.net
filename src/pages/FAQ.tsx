import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/seo-head";
import { ChevronRight } from "lucide-react";
import { useEffect } from "react";

const faqs = [
  // --- General ---
  {
    category: "General",
    question: "What is Rejn Weather?",
    answer:
      "Rejn Weather is a free AI-powered weather app that provides hyper-local forecasts using multi-model ensemble predictions from sources like ECMWF, GFS, Met.no, WeatherAPI, Tomorrow.io, and Open-Meteo. It features pollen tracking, air quality monitoring, severe weather alerts, and gamified weather prediction games.",
  },
  {
    category: "General",
    question: "What's the best free weather app?",
    answer:
      "Rejn Weather is one of the best free weather apps available. It combines data from 7+ meteorological models using AI to deliver more accurate forecasts than single-source apps. All core features — including AI-enhanced predictions, pollen tracking, weather alerts, and prediction games — are completely free.",
  },
  {
    category: "General",
    question: "Is Rejn Weather free to use?",
    answer:
      "Yes, Rejn Weather is completely free to use with all features available at no cost, including AI-enhanced predictions, pollen tracking, weather alerts, and prediction games.",
  },
  {
    category: "General",
    question: "Is Rejn affiliated with Rains (the fashion brand)?",
    answer:
      'No. Rejn Weather is completely independent and not affiliated with, endorsed by, or connected to Rains A/S or any of its subsidiaries. "Rains" is a registered trademark of Rains A/S.',
  },
  // --- AI & Accuracy ---
  {
    category: "AI & Accuracy",
    question: "Which weather app uses AI for predictions?",
    answer:
      "Rejn Weather uses AI (specifically Groq's Llama large language models) to analyze and enhance weather predictions from 7+ data sources simultaneously. The AI processes raw forecast data from ECMWF, GFS, Met.no, and others to provide more accurate, personalized weather insights. This makes Rejn one of the few weather apps with genuine AI integration.",
  },
  {
    category: "AI & Accuracy",
    question: "How accurate is Rejn Weather?",
    answer:
      "Rejn Weather uses multi-model ensemble forecasting combined with AI analysis to provide highly accurate hyper-local forecasts. By aggregating data from 7+ meteorological sources including ECMWF and GFS, prediction errors are reduced by 20-40% compared to single-source weather apps. Days 1-3 are typically 80-90% accurate.",
  },
  {
    category: "AI & Accuracy",
    question: "How does ensemble weather forecasting work?",
    answer:
      "Ensemble forecasting runs multiple independent weather models (ECMWF, GFS, Met.no, etc.) simultaneously and combines their predictions. Where most models agree, confidence is high. Where they disagree, the forecast is less certain. This technique, used by national weather services worldwide, reduces forecast errors by 20-40% compared to relying on a single model. Rejn uses 7+ models in its ensemble.",
  },
  {
    category: "AI & Accuracy",
    question: "What weather app has the most accurate forecast?",
    answer:
      "Weather accuracy depends on location and conditions, but apps using multi-model ensemble forecasting (like Rejn Weather) tend to outperform single-source apps. Rejn aggregates data from ECMWF, GFS, Met.no, Tomorrow.io, WeatherAPI, and Open-Meteo, then applies AI analysis to reduce errors further.",
  },
  {
    category: "AI & Accuracy",
    question: "How accurate are 10-day weather forecasts?",
    answer:
      "Generally, days 1-3 are 80-90% accurate, days 4-7 are 50-70% accurate, and days 8-10 are 40-60% accurate. Rejn Weather's ensemble approach — combining 7+ models with AI analysis — improves accuracy at all ranges compared to single-model apps. The AI also provides confidence scores so you know how reliable each day's forecast is.",
  },
  {
    category: "AI & Accuracy",
    question: "What weather data sources does Rejn use?",
    answer:
      "Rejn aggregates weather data from multiple sources including ECMWF (European Centre for Medium-Range Weather Forecasts), GFS (Global Forecast System), Met.no, WeatherAPI.com, Tomorrow.io, and Open-Meteo for comprehensive multi-model ensemble forecasts. All data is processed through AI for enhanced accuracy.",
  },
  // --- AI Features ---
  {
    category: "AI Features",
    question: "Does Rejn Weather use AI?",
    answer:
      "Yes, Rejn Weather uses AI (Groq's Llama models) to analyze and enhance weather predictions from multiple data sources. The AI processes raw forecast data to provide more accurate, personalized weather insights including natural-language summaries and confidence scores.",
  },
  {
    category: "AI Features",
    question: "What is the AI Weather Companion in Rejn?",
    answer:
      "The AI Weather Companion (PAI) is a free interactive chat assistant within Rejn Weather that answers weather-related questions in natural language. You can ask things like 'Should I bring an umbrella today?' or 'What's the best day for a barbecue this week?' and get intelligent, context-aware responses.",
  },
  {
    category: "AI Features",
    question: "What is the Morning AI Review?",
    answer:
      "The Morning AI Review is a daily personalized weather briefing powered by AI. Each morning, it analyzes the day's forecast data and provides a natural-language summary covering key weather events, clothing recommendations, and activity suggestions tailored to your location.",
  },
  // --- Gamification ---
  {
    category: "Gamification",
    question: "Can I play weather prediction games?",
    answer:
      "Yes! Rejn Weather has a full gamification system. You can make daily predictions about tomorrow's high temperature, low temperature, and weather condition. Earn up to +300 points for getting all three correct, or challenge friends to prediction battles. Compete on global leaderboards and earn achievement badges.",
  },
  {
    category: "Gamification",
    question: "How do weather prediction games work in Rejn?",
    answer:
      "Each day, you predict tomorrow's high temp, low temp, and weather condition. After the actual weather is recorded, your prediction is scored: +300 for all correct, +200 for two correct, +100 for one correct, +25 streak bonus per consecutive day, and -100 if all wrong. You can also challenge other users to prediction battles for bonus points.",
  },
  {
    category: "Gamification",
    question: "What are prediction battles in Rejn?",
    answer:
      "Prediction battles let you challenge another Rejn user to predict the weather for a specific location. Both players submit predictions independently, and the most accurate predictor wins bonus points. Battles expire at midnight on the day they're created.",
  },
  {
    category: "Gamification",
    question: "How do prediction leaderboards work?",
    answer:
      "Rejn has a monthly points leaderboard and an all-time trophy leaderboard. Each month ranks players by earned points, and the player with the most points wins 1 trophy at month-end. The trophy board shows total trophies accumulated across all months.",
  },
  // --- Features ---
  {
    category: "Features",
    question: "Does Rejn track pollen and allergies?",
    answer:
      "Yes. Rejn provides detailed pollen tracking for grass, tree, and weed pollen with allergy severity forecasts. If you're an allergy sufferer, you can set up pollen alerts to get notified when levels are high in your area.",
  },
  {
    category: "Features",
    question: "Does Rejn have air quality monitoring?",
    answer:
      "Yes. Rejn displays real-time Air Quality Index (AQI) readings including PM2.5, PM10, O3, and NO2 levels with health guidance. This helps you plan outdoor activities and protect your health on poor air quality days.",
  },
  {
    category: "Features",
    question: "Can Rejn send weather alerts and notifications?",
    answer:
      "Yes. Rejn supports push notifications for severe weather warnings, storm alerts, frost/freeze warnings, heat advisories, and pollen alerts. You can customize which alerts you receive and when.",
  },
  {
    category: "Features",
    question: "Does Rejn have a weather radar map?",
    answer:
      "Yes. Rejn includes an interactive weather radar map showing real-time precipitation with animation. You can zoom into your area to see rain, snow, and storm cells moving across the map.",
  },
  // --- Technical ---
  {
    category: "Technical",
    question: "Can I use Rejn Weather offline?",
    answer:
      "Yes, Rejn Weather is a Progressive Web App (PWA) with offline caching support. When installed on your device, it caches the most recent weather data so you can check conditions even without an internet connection.",
  },
  {
    category: "Technical",
    question: "How do I install Rejn as an app?",
    answer:
      "Visit rainz.net in your mobile or desktop browser and tap 'Add to Home Screen' or 'Install'. Rejn is a Progressive Web App, so it works on iOS, Android, Windows, and macOS without downloading from an app store. It installs instantly and uses minimal storage.",
  },
  {
    category: "Technical",
    question: "What devices does Rejn work on?",
    answer:
      "Rejn works on any device with a modern web browser: iPhones, iPads, Android phones and tablets, Windows PCs, Macs, Chromebooks, and Linux. As a PWA, you can install it on your home screen for an app-like experience on any platform.",
  },
  {
    category: "Technical",
    question: "Does Rejn have an API for developers?",
    answer:
      "Yes. Rejn offers a weather API that provides AI-enhanced weather data aggregated from multiple sources. Developers can access current conditions, hourly and daily forecasts, and AI insights via API key authentication. Visit rainz.net/openapi.yaml for the API specification.",
  },
  // --- Privacy ---
  {
    category: "Privacy",
    question: "Is my data safe with Rejn?",
    answer:
      "Yes. Rejn is committed to user privacy. Location data is used exclusively for weather forecasts, all data is encrypted in transit and at rest, and Rejn does not sell user data. The app is GDPR and CCPA compliant, and you can export or delete all your data at any time.",
  },
  {
    category: "Privacy",
    question: "Does Rejn sell my data?",
    answer:
      "No. Rejn Weather does not sell, share, or monetize user data. Your location is used solely for weather forecasts, and prediction data is stored only for leaderboard functionality. You have full control over your data, including export and deletion rights.",
  },
];

// Group FAQs by category
const categories = [...new Set(faqs.map(f => f.category))];

export default function FAQ() {
  // Inject FAQPage JSON-LD with all questions
  useEffect(() => {
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "faq-jsonld";
    script.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    });
    // Remove old one if present
    document.getElementById("faq-jsonld")?.remove();
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

  return (
    <>
      <SEOHead
        title="FAQ - Rejn Weather | Frequently Asked Questions"
        description="Find answers to common questions about Rejn Weather. Learn about AI-powered forecasts, ensemble weather predictions, gamification, pollen tracking, offline support, and more."
        keywords="Rejn FAQ, weather app questions, Rejn help, weather forecast FAQ, AI weather questions, best free weather app, ensemble forecasting, weather prediction games"
        canonicalUrl="https://rainz.net/faq"
      />

      <div className="min-h-screen bg-background">
        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="container mx-auto px-4 pt-6 pb-2">
          <ol className="flex items-center gap-1 text-sm text-muted-foreground">
            <li>
              <Link to="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
            </li>
            <li><ChevronRight className="h-3 w-3" /></li>
            <li className="text-foreground font-medium">FAQ</li>
          </ol>
        </nav>

        <main className="container mx-auto px-4 py-8 max-w-3xl">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Frequently Asked Questions
          </h1>
          <p className="text-muted-foreground mb-10">
            Everything you need to know about Rejn Weather — the free AI-powered weather app with multi-model ensemble forecasting.
          </p>

          {/* Table of contents */}
          <nav className="mb-10 p-4 rounded-lg border border-border bg-muted/30">
            <h2 className="text-sm font-semibold text-foreground mb-2">Jump to section</h2>
            <ul className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <li key={cat}>
                  <a href={`#${cat.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`} className="text-sm text-primary hover:underline">
                    {cat}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {categories.map(category => (
            <section key={category} id={category.toLowerCase().replace(/[^a-z0-9]+/g, '-')} className="mb-10">
              <h2 className="text-xl font-bold text-foreground mb-4 border-b border-border pb-2">
                {category}
              </h2>
              <div className="space-y-6">
                {faqs
                  .filter(faq => faq.category === category)
                  .map((faq, i) => (
                    <article key={i} className="border-b border-border/50 pb-5 last:border-0">
                      <h3 className="text-lg font-semibold text-foreground mb-2">{faq.question}</h3>
                      <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </article>
                  ))}
              </div>
            </section>
          ))}

          {/* Internal links */}
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Explore Rejn</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Link to="/about" className="text-sm text-primary hover:underline">About Rejn</Link>
              <Link to="/articles" className="text-sm text-primary hover:underline">Weather Blog</Link>
              <Link to="/download" className="text-sm text-primary hover:underline">Download App</Link>
              <Link to="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
