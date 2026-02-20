import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sunrise, Droplets, Wind, AlertTriangle, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/language-context";

interface MorningWeatherReviewProps {
  weatherData: any;
  location: string;
  isImperial: boolean;
  userId?: string;
}

interface MorningReviewData {
  summary: string;
  outfit: string;
  pollenAlerts: string[];
  activityRecommendation: string;
  keyInsight: string;
}

export function MorningWeatherReview({ 
  weatherData, 
  location, 
  isImperial,
  userId 
}: MorningWeatherReviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isDismissed, setIsDismissed] = useState(false);
  const [reviewData, setReviewData] = useState<MorningReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const isMorningTime = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 12;
  };

  useEffect(() => {
    const dismissedDate = localStorage.getItem('morning-review-dismissed');
    const today = new Date().toDateString();
    if (dismissedDate === today) {
      setIsDismissed(true);
    }
  }, []);

  useEffect(() => {
    if (isMorningTime() && !isDismissed && weatherData && !reviewData) {
      fetchMorningReview();
    }
  }, [weatherData, isDismissed]);

  const fetchMorningReview = async () => {
    if (!weatherData) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-weather-insights', {
        body: { type: 'morning_review', weatherData, location, isImperial, language }
      });

      if (error) throw error;

      if (data?.review) {
        setReviewData(data.review);
      } else {
        throw new Error('No review data received');
      }
    } catch (error) {
      console.error('Error fetching morning review:', error);
      const temp = weatherData?.currentWeather?.temperature || 0;
      const condition = weatherData?.currentWeather?.condition || "Unknown";
      setReviewData({
        summary: `Good morning! It's ${temp}°${isImperial ? 'F' : 'C'} and ${condition.toLowerCase()} in ${location}.`,
        outfit: "Dress appropriately for the conditions.",
        pollenAlerts: [],
        activityRecommendation: "Check the full forecast for activity planning.",
        keyInsight: "Have a great day!"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    const today = new Date().toDateString();
    localStorage.setItem('morning-review-dismissed', today);
    setIsDismissed(true);
  };

  if (!isMorningTime() || isDismissed || !weatherData) return null;

  const temp = weatherData?.currentWeather?.temperature || 0;
  const displayTemp = isImperial ? temp : Math.round((temp - 32) * 5/9);

  return (
    <Card className="mb-4 glass-card border border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sunrise className="w-5 h-5 text-orange-500" />
            <CardTitle className="text-lg">{t('morning.title')}</CardTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)} className="h-7 w-7 p-0">
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDismiss} className="h-7 px-2 text-xs">
              {t('time.dismiss')}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-3">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold">{displayTemp}°</span>
              <span className="text-muted-foreground">{isImperial ? 'F' : 'C'}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Droplets className="w-4 h-4" />
              <span>{weatherData?.currentWeather?.humidity}%</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Wind className="w-4 h-4" />
              <span>
                {isImperial 
                  ? `${weatherData?.currentWeather?.windSpeed} mph`
                  : `${Math.round((weatherData?.currentWeather?.windSpeed || 0) * 1.609)} km/h`
                }
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="text-center py-4">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">{t('morning.generating')}</p>
            </div>
          ) : reviewData ? (
            <div className="space-y-3">
              <p className="text-sm font-medium">{reviewData.summary}</p>
              
              {reviewData.outfit && (
                <div className="bg-background/50 rounded-lg p-3">
                  <p className="text-sm"><span className="font-semibold">👔 {t('morning.outfit')}</span> {reviewData.outfit}</p>
                </div>
              )}

              {reviewData.pollenAlerts && reviewData.pollenAlerts.length > 0 && (
                <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-yellow-900 dark:text-yellow-100">{t('morning.pollenAlerts')}</p>
                      {reviewData.pollenAlerts.map((alert, idx) => (
                        <p key={idx} className="text-xs text-yellow-800 dark:text-yellow-200">• {alert}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {reviewData.activityRecommendation && (
                <div className="bg-background/50 rounded-lg p-3">
                  <p className="text-sm"><span className="font-semibold">🏃 {t('morning.activities')}</span> {reviewData.activityRecommendation}</p>
                </div>
              )}

              {reviewData.keyInsight && (
                <div className="bg-primary/10 rounded-lg p-3 border border-primary/20">
                  <p className="text-sm"><span className="font-semibold">💡 {t('morning.keyInsight')}</span> {reviewData.keyInsight}</p>
                </div>
              )}
            </div>
          ) : (
            <Button onClick={fetchMorningReview} variant="outline" size="sm" className="w-full">
              <Sparkles className="w-4 h-4 mr-2" />
              {t('morning.generate')}
            </Button>
          )}
        </CardContent>
      )}
    </Card>
  );
}
