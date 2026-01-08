import { Suspense, lazy, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/hooks/use-auth";
import { SubscriptionProvider } from "@/hooks/use-subscription";
import { PremiumSettingsProvider } from "@/hooks/use-premium-settings";
import { LanguageProvider } from "@/contexts/language-context";
import { TimeOfDayProvider, useTimeOfDayContext } from "@/contexts/time-of-day-context";
import { CookieConsentProvider } from "@/hooks/use-cookie-consent";
import { CookieConsentBanner } from "@/components/ui/cookie-consent-banner";
import { Footer } from "@/components/ui/footer";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { PWAInstallPopup } from "@/components/ui/pwa-install-popup";
import { useAnalytics } from "@/hooks/use-analytics";
import { useToast } from "@/hooks/use-toast";

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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // Cache for 5 minutes
      gcTime: 1000 * 60 * 10, // Keep in cache for 10 minutes
      retry: 1,
      retryDelay: 1000,
    },
  },
});

function AnalyticsTracker() {
  useAnalytics();
  return null;
}

function useOAuthErrorToast() {
  const { toast } = useToast();

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

    toast({
      variant: "destructive",
      title: "Google sign-in failed",
      description: description ? decodeURIComponent(description) : error,
    });

    // Clean URL so refresh doesn't re-toast.
    url.searchParams.delete("error");
    url.searchParams.delete("error_code");
    url.searchParams.delete("error_description");
    window.history.replaceState({}, document.title, url.pathname + url.search);
  }, [toast]);
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
            const { data: { user } } = await supabase.auth.getUser();
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

function AppContent() {
  const { isNightTime } = useTimeOfDayContext();
  usePrefetchSavedLocations();
  useOAuthErrorToast();

  const isBlogSubdomain = window.location.hostname === "blog.rainz.net";
  const isApiSubdomain = window.location.hostname === "api.rainz.net";

  return (
    <ThemeProvider defaultTheme="light" storageKey="weather-app-theme" isNightTime={isNightTime}>
      <LanguageProvider>
        <AuthProvider>
          <SubscriptionProvider>
            <PremiumSettingsProvider>
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
                        <Suspense fallback={<LoadingOverlay isOpen={true} />}>
                          {isApiSubdomain ? (
                            <Routes>
                              <Route path="/" element={<Navigate to="https://rainz.net" replace />} />
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          ) : isBlogSubdomain ? (
                            <Routes>
                              <Route path="/" element={<Articles />} />
                              <Route path="/articles" element={<Articles />} />
                              <Route path="/articles/:slug" element={<BlogPost />} />
                              <Route path="/:slug" element={<BlogPost />} />
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                          ) : (
                            <Routes>
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
                              <Route path="/weather" element={<Navigate to="/" replace />} />
                              <Route path="*" element={<NotFound />} />
                            </Routes>
                          )}
                        </Suspense>
                      </div>
                      <Footer />
                    </div>
                  </BrowserRouter>
                </TooltipProvider>
              </CookieConsentProvider>
            </PremiumSettingsProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TimeOfDayProvider>
      <AppContent />
    </TimeOfDayProvider>
  </QueryClientProvider>
);

export default App;
