import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { MessageSquare, Send } from "lucide-react";
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

export function WeatherReportForm({ location, currentCondition, locationData }: WeatherReportFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [accuracy, setAccuracy] = useState("");
  const [report, setReport] = useState("");
  const [actualCondition, setActualCondition] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user, profile } = useAuth();

  // Check if user can report weather (logged in and account at least 7 days old)
  const canReportWeather = () => {
    if (!user || !profile?.created_at) return false;
    
    const accountAge = new Date().getTime() - new Date(profile.created_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000; // 7 days
    return accountAge >= sevenDaysInMs;
  };

  const handleSubmit = async () => {
    if (!canReportWeather()) {
      toast({
        title: "Account too new",
        description: "You need to have an account for at least 3 months to report weather.",
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

  // Don't show the button if user can't report weather
  if (!user || !canReportWeather()) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Report Weather
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Weather Accuracy</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Location: {location}
            </label>
            <label className="text-sm text-muted-foreground mb-3 block">
              Reported condition: {currentCondition}
            </label>
          </div>
          
          <div>
            <label className="text-sm font-medium mb-2 block">
              How accurate is this forecast?
            </label>
            <Select value={accuracy} onValueChange={setAccuracy}>
              <SelectTrigger>
                <SelectValue placeholder="Select accuracy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="very-accurate">Very Accurate</SelectItem>
                <SelectItem value="mostly-accurate">Mostly Accurate</SelectItem>
                <SelectItem value="somewhat-accurate">Somewhat Accurate</SelectItem>
                <SelectItem value="not-accurate">Not Accurate</SelectItem>
              </SelectContent>
            </Select>
          </div>


          <div>
            <label className="text-sm font-medium mb-2 block">
              What is the actual condition?
            </label>
            <Select value={actualCondition} onValueChange={setActualCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Select actual condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Clear">Clear/Sunny</SelectItem>
                <SelectItem value="Partly Cloudy">Partly Cloudy</SelectItem>
                <SelectItem value="Cloudy">Cloudy</SelectItem>
                <SelectItem value="Overcast">Overcast</SelectItem>
                <SelectItem value="Light Rain">Light Rain</SelectItem>
                <SelectItem value="Rain">Rain</SelectItem>
                <SelectItem value="Heavy Rain">Heavy Rain</SelectItem>
                <SelectItem value="Light Snow">Light Snow</SelectItem>
                <SelectItem value="Snow">Snow</SelectItem>
                <SelectItem value="Heavy Snow">Heavy Snow</SelectItem>
                <SelectItem value="Drizzle">Drizzle</SelectItem>
                <SelectItem value="Thunderstorm">Thunderstorm</SelectItem>
                <SelectItem value="Foggy">Foggy</SelectItem>
                <SelectItem value="Windy">Windy</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">
              Additional details (optional)
            </label>
            <Textarea
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Describe the current weather conditions..."
              rows={3}
            />
          </div>


          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Send className="w-4 h-4 mr-2 animate-pulse" />
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