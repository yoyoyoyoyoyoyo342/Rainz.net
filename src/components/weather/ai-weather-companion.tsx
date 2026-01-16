import { useState, useRef, useEffect } from "react";
import { Send, Bot, TrendingUp, Brain, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { WeatherSource } from "@/types/weather";
import { useAuth } from "@/hooks/use-auth";
import { useLanguage } from "@/contexts/language-context";
import rainzLogo from "@/assets/rainz-logo-new.png";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  insights?: string[];
}

interface AIWeatherCompanionProps {
  weatherData: WeatherSource;
  location: string;
  isImperial: boolean;
}

export function AIWeatherCompanion({ weatherData, location, isImperial }: AIWeatherCompanionProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: `👋 Hi! I'm PAI, your personal weather assistant. I've analyzed the weather in ${location} and I'm ready to provide personalized insights, recommendations, and answer any weather-related questions you have!`,
      role: 'assistant',
      timestamp: new Date(),
      insights: ['Smart Recommendations', 'Personalized Insights', 'Proactive Alerts']
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userRoutines, setUserRoutines] = useState<any[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const { language } = useLanguage();

  // Fetch user routines
  useEffect(() => {
    const fetchRoutines = async () => {
      if (!user) return;
      try {
        const { data } = await supabase
          .from('user_routines' as any)
          .select('*')
          .eq('user_id', user.id);
        if (data) setUserRoutines(data);
      } catch (error) {
        console.error('Error fetching routines:', error);
      }
    };
    fetchRoutines();
  }, [user]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({
        top: scrollAreaRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // Generate proactive insights when weather data changes
  useEffect(() => {
    if (weatherData) {
      generateProactiveInsights();
    }
  }, [weatherData, location]);

  const generateProactiveInsights = async () => {
    try {
      const response = await supabase.functions.invoke('ai-weather-insights', {
        body: {
          type: 'proactive_insights',
          weatherData,
          location,
          isImperial,
          userRoutines,
          language
        }
      });

      if (response.data?.insights && response.data.insights.length > 0) {
        const insightMessage: Message = {
          id: Date.now().toString(),
          content: "💡 Here are some personalized insights for today:",
          role: 'assistant',
          timestamp: new Date(),
          insights: response.data.insights
        };
        
        setMessages(prev => [...prev.slice(0, 1), insightMessage, ...prev.slice(1)]);
      }
    } catch (error) {
      console.error('Error generating proactive insights:', error);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await supabase.functions.invoke('ai-weather-insights', {
        body: {
          type: 'chat',
          message: input,
          weatherData,
          location,
          isImperial,
          conversationHistory: messages.slice(-5), // Last 5 messages for context
          userRoutines,
          language
        }
      });

      if (response.error) {
        console.error('Supabase function error:', response.error);
        throw new Error(response.error.message || 'AI function error');
      }

      // Handle fallback response (when AI fails)
      if (response.data?.fallback && !response.data?.response) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: response.data.fallback,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        return;
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: response.data?.response || "I'm having trouble responding right now. Please try again.",
        role: 'assistant',
        timestamp: new Date(),
        insights: response.data?.recommendations
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        role: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex-shrink-0 bg-card">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center p-1.5 overflow-hidden">
            <img 
              src={rainzLogo} 
              alt="Rainz AI" 
              className={`w-full h-full object-contain rounded-lg ${isLoading ? 'animate-pulse' : ''}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-foreground">Rainz AI</h3>
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-500' : 'bg-green-500'}`}></span>
              <p className="text-xs text-muted-foreground">{isLoading ? "Thinking..." : "Online"}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Beta
          </Badge>
        </div>
      </div>
      
      {/* Messages Area - iMessage style */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" ref={scrollAreaRef}>
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-2 max-w-[75%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar - only show for assistant */}
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 self-end p-1 overflow-hidden">
                  <img src={rainzLogo} alt="Rainz AI" className="w-full h-full object-contain rounded" />
                </div>
              )}
              
              {/* Message Bubble */}
              <div className={`rounded-2xl px-4 py-2 ${
                message.role === 'user' 
                  ? 'bg-primary text-primary-foreground rounded-tr-sm' 
                  : 'bg-muted text-foreground rounded-tl-sm'
              }`}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.content}</p>
                
                {/* Insights */}
                {message.insights && message.insights.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.insights.map((insight, index) => (
                      <div key={index} className="flex items-start gap-2 p-2 bg-background/50 rounded-lg">
                        <TrendingUp className="w-3 h-3 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-xs">{insight}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex gap-2 max-w-[75%]">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 self-end p-1 overflow-hidden">
                <img src={rainzLogo} alt="Rainz AI thinking" className="w-full h-full object-contain rounded animate-pulse" />
              </div>
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex space-x-1.5">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border flex-shrink-0 bg-card">
        <div className="flex gap-2 items-center">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message..."
            className="flex-1 rounded-full bg-muted border-0 h-10 text-sm px-4"
            disabled={isLoading}
          />
          <Button 
            onClick={sendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="rounded-full h-10 w-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}