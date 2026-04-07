import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, queryPersister } from "@/lib/queryClient";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AnimatePresence } from "framer-motion";
import { PageTransition } from "@/components/ui/page-transition";
import { AuthProvider } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { PremiumSettingsProvider } from "@/hooks/use-premium-settings";
import { LanguageProvider } from "@/contexts/language-context";
import { TimeOfDayProvider, useTimeOfDayContext } from "@/contexts/time-of-day-context";
import { PredictionShareProvider } from "@/contexts/prediction-share-context";
import { AppleGlassProvider } from "@/hooks/use-apple-device";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { CookieConsentBanner } from "@/components/ui/cookie-consent-banner";
import { Footer } from "@/components/ui/footer";
import { WeatherPageSkeleton } from "@/components/weather/weather-page-skeleton";
import { PWAInstallPopup } from "@/components/ui/pwa-install-popup";
import { RuntimeErrorBoundary } from "@/components/ui/runtime-error-boundary";
import { useAnalytics } from "@/hooks/use-analytics";
import { useAmplitudeInstrumentation } from "@/hooks/use-amplitude-instrumentation";
import { useAmplitudeFunnels } from "@/hooks/use-amplitude-funnels";
import { useBroadcastListener } from "@/hooks/use-broadcast-listener";
import { toast as sonnerToast } from "sonner";


// Critical components - load immediately
import Weather from "./pages/Weather";
import Auth from "./pages/Auth";

// Lazy load non-critical routes for faster initial load
const NotFound = lazy(() => import("./pages/NotFound"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Blog = lazy(() => import("./pages/Blog"));
const BlogPost = lazy(() => import("./pages/BlogPost"));
const Articles = lazy(() => import("./pages/Articles"));

const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const DataSettings = lazy(() => import("./pages/DataSettings"));
const About = lazy(() => import("./pages/About"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const SubscriptionCancel = lazy(() => import("./pages/SubscriptionCancel"));
const Affiliate = lazy(() => import("./pages/Affiliate"));
const AffiliatePolicy = lazy(() => import("./pages/AffiliatePolicy"));
const Download = lazy(() => import("./pages/Download"));
const PwaDownload = lazy(() => import("./pages/PwaDownload"));
const AppDownload = lazy(() => import("./pages/AppDownload"));
const Widgets = lazy(() => import("./pages/Widgets"));
const Widget = lazy(() => import("./pages/Widget"));
const Embed = lazy(() => import("./pages/Embed"));
const Info = lazy(() => import("./pages/Info"));
const DryRoutes = lazy(() => import("./pages/DryRoutes"));
const CityWeather = lazy(() => import("./pages/CityWeather"));
const MCP = lazy(() => import("./pages/MCP"));
const FAQ = lazy(() => import("./pages/FAQ"));
const MarketReport = lazy(() => import("./pages/MarketReport"));
const AirportLayout = lazy(() => import("./pages/airport/AirportLayout"));
const AirportLanding = lazy(() => import("./pages/airport/AirportLanding"));
const AirportFeatures = lazy(() => import("./pages/airport/AirportFeatures"));
const AirportProduct = lazy(() => import("./pages/airport/AirportProduct"));
const AirportContact = lazy(() => import("./pages/airport/AirportContact"));

function AnalyticsTracker() {
  useAnalytics();
  useAmplitudeInstrumentation();
  useAmplitudeFunnels();
  useBroadcastListener();
  return null;
}

function useOAuthErrorToast() {
  useEffect(() => {
    const url = new URL(window.location.href);

    const queryError = url.searchParams.get("error") || url.searchParams.get("error_code");
    const queryDesc = url.searchParams.get("error_description");

    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    const hashError = hashParams.get("error") || hashParams.get("error_code");
    const hashDesc = hashParams.get("error_description");

    const error = queryError || hashError;
    const description = queryDesc || hashDesc;

    if (!error) return;

    sonnerToast.error("Google sign-in failed", {
      description: description ? decodeURIComponent(description) : error,
    });

    // Clean URL so refresh doesn't re-toast.
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }, []);
}

// Prefetch saved locations for faster loading
function usePrefetchSavedLocations() {
  useEffect(() => {
    const prefetchData = async () => {
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        await queryClient.prefetchQuery({
          queryKey: ["saved-locations"],
          queryFn: async () => {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (!user) return [];

            const { data } = await supabase
              .from("saved_locations")
              .select("*")
              .order("is_primary", { ascending: false })
              .order("name");

            return data || [];
          },
        });
      } catch (error) {
        console.log("Prefetch saved locations failed", error);
      }
    };

    prefetchData();
  }, []);
}

function AnimatedRoutes({ isApiSubdomain, isBlogSubdomain }: { isApiSubdomain: boolean; isBlogSubdomain: boolean }) {
  const location = useLocation();

  return (
    <Suspense fallback={<div className="min-h-screen bg-background p-4"><WeatherPageSkeleton /></div>}>
      <AnimatePresence mode="wait">
        <PageTransition key={location.pathname}>
          {isApiSubdomain ? (
            <Routes location={location}>
              <Route path="/" element={<Navigate to="https://rainz.net" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : isBlogSubdomain ? (
            <Routes location={location}>
              <Route path="/" element={<Articles />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<BlogPost />} />
              <Route path="/:slug" element={<BlogPost />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          ) : (
            <Routes location={location}>
              <Route path="/" element={<Weather />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/admin" element={<AdminPanel />} />
              <Route path="/articles" element={<Articles />} />
              <Route path="/articles/:slug" element={<BlogPost />} />
              <Route path="/blog" element={<Navigate to="/articles" replace />} />
              <Route path="/blog/:slug" element={<Navigate to="/articles" replace />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/data-settings" element={<DataSettings />} />
              <Route path="/about" element={<About />} />
              <Route path="/profile/:userId" element={<UserProfile />} />
              <Route path="/subscription-success" element={<SubscriptionSuccess />} />
              <Route path="/subscription-cancel" element={<SubscriptionCancel />} />
              <Route path="/affiliate" element={<Affiliate />} />
              <Route path="/affiliate-policy" element={<AffiliatePolicy />} />
              <Route path="/download" element={<Download />} />
              <Route path="/pwadownload" element={<PwaDownload />} />
              <Route path="/appdownload" element={<AppDownload />} />
              <Route path="/widgets" element={<Widgets />} />
              <Route path="/widget" element={<Widget />} />
              <Route path="/embed" element={<Embed />} />
              <Route path="/info" element={<Info />} />
              <Route path="/dryroutes" element={<DryRoutes />} />
              <Route path="/weather/:citySlug" element={<CityWeather />} />
              <Route path="/weather" element={<Navigate to="/" replace />} />
              <Route path="/mcp" element={<MCP />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/airport" element={<AirportLayout />}>
                <Route index element={<AirportLanding />} />
                <Route path="features" element={<AirportFeatures />} />
                <Route path="product" element={<AirportProduct />} />
                <Route path="contact" element={<AirportContact />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Routes>
          )}
        </PageTransition>
      </AnimatePresence>
    </Suspense>
  );
}

function AppContent() {
  const { isNightTime } = useTimeOfDayContext();
  usePrefetchSavedLocations();
  useOAuthErrorToast();

  const isBlogSubdomain = window.location.hostname === "blog.rainz.net";
  const isApiSubdomain = window.location.hostname === "api.rainz.net";
  const isEmbedRoute = window.location.pathname === "/embed";

  // Embed route renders without app chrome
  if (isEmbedRoute) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="weather-app-theme" isNightTime={false}>
        <LanguageProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen bg-background p-4"><WeatherPageSkeleton /></div>}>
                <Routes>
                  <Route path="/embed" element={<Embed />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark" storageKey="weather-app-theme" isNightTime={isNightTime}>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PremiumSettingsProvider>
               <PredictionShareProvider>
                   <CookieConsentProvider>
                  <TooltipProvider>
                    <Toaster />
                    <Sonner />
                    <CookieConsentBanner />
                    <PWAInstallPopup />
                     <BrowserRouter>
                        <div className="flex flex-col min-h-screen">
                          <div className="flex-1">
                            <AnalyticsTracker />
                            <AnimatedRoutes
                              isApiSubdomain={isApiSubdomain}
                              isBlogSubdomain={isBlogSubdomain}
                            />
                          </div>
                          {window.location.pathname !== '/dryroutes' && (
                         <Footer />
                          )}
                       </div>
                    </BrowserRouter>
                  </TooltipProvider>
                   </CookieConsentProvider>
              </PredictionShareProvider>
            </PremiumSettingsProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

// App root - analytics handled by AnalyticsTracker + Supabase SW
const App = () => (
  <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: queryPersister, maxAge: 1000 * 60 * 60 * 24 }}>
    <AppleGlassProvider>
      <TimeOfDayProvider>
        <RuntimeErrorBoundary>
          <AppContent />
        </RuntimeErrorBoundary>
      </TimeOfDayProvider>
    </AppleGlassProvider>
  </PersistQueryClientProvider>
);

export default App;
