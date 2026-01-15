import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { MessageSquare, Send, MapPin, ThermometerSun, CheckCircle2, XCircle, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

interface WeatherReportFormProps {
  location: string;
  currentCondition: string;
  locationData?: {
    latitude: number;
    longitude: number;
  };
}

const ACCURACY_OPTIONS = [
  { value: "very-accurate", label: "Very Accurate", icon: CheckCircle2, color: "text-green-600" },
  { value: "mostly-accurate", label: "Mostly Accurate", icon: CheckCircle2, color: "text-blue-600" },
  { value: "somewhat-accurate", label: "Somewhat Accurate", icon: AlertCircle, color: "text-amber-600" },
  { value: "not-accurate", label: "Not Accurate", icon: XCircle, color: "text-red-600" },
];

const CONDITION_OPTIONS = [
  { value: "Clear", label: "Clear/Sunny", emoji: "☀️" },
  { value: "Partly Cloudy", label: "Partly Cloudy", emoji: "⛅" },
  { value: "Cloudy", label: "Cloudy", emoji: "☁️" },
  { value: "Overcast", label: "Overcast", emoji: "🌥️" },
  { value: "Light Rain", label: "Light Rain", emoji: "🌦️" },
  { value: "Rain", label: "Rain", emoji: "🌧️" },
  { value: "Heavy Rain", label: "Heavy Rain", emoji: "⛈️" },
  { value: "Light Snow", label: "Light Snow", emoji: "🌨️" },
  { value: "Snow", label: "Snow", emoji: "❄️" },
  { value: "Heavy Snow", label: "Heavy Snow", emoji: "🌨️" },
  { value: "Drizzle", label: "Drizzle", emoji: "🌧️" },
  { value: "Thunderstorm", label: "Thunderstorm", emoji: "⛈️" },
  { value: "Foggy", label: "Foggy", emoji: "🌫️" },
  { value: "Windy", label: "Windy", emoji: "💨" },
];

export function WeatherReportForm({ location, currentCondition, locationData }: WeatherReportFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [accuracy, setAccuracy] = useState("");
  const [report, setReport] = useState("");
  const [actualCondition, setActualCondition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const canReportWeather = () => {
    if (!user || !profile?.created_at) return false;
    const accountAge = new Date().getTime() - new Date(profile.created_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    return accountAge >= sevenDaysInMs;
  };

  const handleSubmit = async () => {
    if (!canReportWeather()) {
      toast({
        title: "Account too new",
        description: "You need to have an account for at least 7 days to report weather.",
        variant: "destructive",
      });
      return;
    }

    if (!accuracy || !actualCondition) {
      toast({
        title: "Please fill all fields",
        description: "Accuracy rating and actual condition are required.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase
        .from('weather_reports')
        .insert({
          user_id: user!.id,
          location_name: location,
          latitude: locationData?.latitude || 0,
          longitude: locationData?.longitude || 0,
          reported_condition: currentCondition,
          actual_condition: actualCondition,
          accuracy: accuracy,
          report_details: report,
        });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Thank you for helping improve weather accuracy!",
      });
      
      setIsOpen(false);
      setAccuracy("");
      setReport("");
      setActualCondition("");
    } catch (error) {
      console.error('Error submitting report:', error);
      toast({
        title: "Error submitting report",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user || !canReportWeather()) {
    return null;
  }

  const selectedAccuracy = ACCURACY_OPTIONS.find(opt => opt.value === accuracy);
  const selectedCondition = CONDITION_OPTIONS.find(opt => opt.value === actualCondition);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Report Weather
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="bg-primary/5 border-b border-border p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <ThermometerSun className="w-5 h-5 text-primary" />
              Report Weather Accuracy
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Help us improve forecasts by sharing what you're actually seeing
            </DialogDescription>
          </DialogHeader>
          
          <div className="mt-4 flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{location}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{currentCondition}</span>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Accuracy Rating */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How accurate is the forecast?</Label>
            <div className="grid grid-cols-2 gap-2">
              {ACCURACY_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = accuracy === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccuracy(option.value)}
                    className={`flex items-center gap-2 p-3 rounded-lg border text-left transition-all ${
                      isSelected 
                        ? 'border-primary bg-primary/5 ring-1 ring-primary' 
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${option.color}`} />
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actual Condition */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">What's the actual condition?</Label>
            <Select value={actualCondition} onValueChange={setActualCondition}>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Select actual condition">
                  {selectedCondition && (
                    <span className="flex items-center gap-2">
                      <span>{selectedCondition.emoji}</span>
                      <span>{selectedCondition.label}</span>
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                {CONDITION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className="flex items-center gap-2">
                      <span>{option.emoji}</span>
                      <span>{option.label}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Additional Details */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Additional details <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Describe current conditions, temperature feel, visibility..."
              rows={3}
              className="resize-none"
            />
          </div>

          {/* Submit Button */}
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || !accuracy || !actualCondition}
            className="w-full h-11 font-medium"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Submit Report
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
