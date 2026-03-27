import { Link } from "react-router-dom";
import { SEOHead } from "@/components/seo/seo-head";
import { ChevronRight } from "lucide-react";

const faqs = [
  {
    question: "What is Rainz Weather?",
    answer:
      "Rainz Weather is a free AI-powered weather app that provides hyper-local forecasts using multi-model ensemble predictions from sources like ECMWF, GFS, Met.no, and more. It features pollen tracking, air quality monitoring, severe weather alerts, and gamified weather prediction games.",
  },
  {
    question: "Is Rainz Weather free to use?",
    answer:
      "Yes, Rainz Weather is completely free to use with all core features available at no cost. An optional Rainz+ premium subscription offers additional features like ad-free experience, 14-day forecasts, and AI Weather Companion.",
  },
  {
    question: "How accurate is Rainz Weather?",
    answer:
      "Rainz Weather uses multi-model ensemble forecasting combined with AI analysis to provide highly accurate hyper-local forecasts. By aggregating data from multiple meteorological sources including ECMWF and GFS, prediction errors are significantly reduced compared to single-source weather apps.",
  },
  {
    question: "Does Rainz Weather use AI?",
    answer:
      'Yes, Rainz Weather uses AI (specifically Groq\'s Llama models) to analyze and enhance weather predictions from multiple data sources. The AI processes raw forecast data to provide more accurate, personalized weather insights.',
  },
  {
    question: "Can I use Rainz Weather offline?",
    answer:
      "Yes, Rainz Weather is a Progressive Web App (PWA) with offline caching support. You can install it on your device and access cached weather data even without an internet connection.",
  },
  {
    question: "What is the AI Weather Companion in Rainz?",
    answer:
      "The AI Weather Companion (PAI) is an interactive chat assistant that can answer weather-related questions in natural language. It can provide weather insights, suggest outdoor activities, and interpret complex weather metrics.",
  },
  {
    question: "What weather data sources does Rainz use?",
    answer:
      "Rainz aggregates weather data from multiple sources including ECMWF (European Centre for Medium-Range Weather Forecasts), GFS (Global Forecast System), Met.no, WeatherAPI.com, Tomorrow.io, and Open-Meteo for comprehensive multi-model ensemble forecasts.",
  },
  {
    question: "How do weather prediction games work in Rainz?",
    answer:
      "Users can make daily predictions about tomorrow's weather (high temp, low temp, condition) and earn points based on accuracy. Scores range from +300 for all correct to -100 for all incorrect. Users can also challenge others to prediction battles and compete on leaderboards.",
  },
  {
    question: "How do I install Rainz as an app?",
    answer:
      "Visit rainz.net in your mobile or desktop browser and tap the 'Add to Home Screen' or 'Install' button. Rainz is a Progressive Web App so it works on iOS, Android, Windows, and macOS without downloading from an app store.",
  },
  {
    question: "Is Rainz affiliated with Rains (the fashion brand)?",
    answer:
      'No. Rainz Weather is completely independent and not affiliated with, endorsed by, or connected to Rains A/S or any of its subsidiaries. "Rains" is a registered trademark of Rains A/S.',
  },
];

export default function FAQ() {
  return (
    <>
      <SEOHead
        title="FAQ - Rainz Weather | Frequently Asked Questions"
        description="Find answers to common questions about Rainz Weather. Learn about AI-powered forecasts, weather predictions, offline support, and more."
        keywords="Rainz FAQ, weather app questions, Rainz help, weather forecast FAQ, AI weather questions"
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
            Everything you need to know about Rainz Weather — the free AI-powered weather app.
          </p>

          <div className="space-y-6">
            {faqs.map((faq, i) => (
              <article key={i} className="border-b border-border pb-6 last:border-0">
                <h2 className="text-lg font-semibold text-foreground mb-2">{faq.question}</h2>
                <p className="text-muted-foreground leading-relaxed">{faq.answer}</p>
              </article>
            ))}
          </div>

          {/* Internal links */}
          <section className="mt-12 pt-8 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4">Explore Rainz</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Link to="/about" className="text-sm text-primary hover:underline">About Rainz</Link>
              <Link to="/articles" className="text-sm text-primary hover:underline">Weather Blog</Link>
              <Link to="/download" className="text-sm text-primary hover:underline">Download App</Link>
              <Link to="/dryroutes" className="text-sm text-primary hover:underline">DryRoutes</Link>
              <Link to="/privacy" className="text-sm text-primary hover:underline">Privacy Policy</Link>
              <Link to="/terms" className="text-sm text-primary hover:underline">Terms of Service</Link>
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
