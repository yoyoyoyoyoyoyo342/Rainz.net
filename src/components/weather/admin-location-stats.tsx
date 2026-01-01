import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  Search, 
  TrendingUp, 
  Calendar, 
  Users, 
  Eye,
  Gamepad2,
  MessageSquare,
  Bell,
  Share2,
  Cake,
  Sparkles
} from 'lucide-react';
import { format, differenceInDays, parseISO } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface LocationStat {
  location_name: string;
  latitude: string;
  longitude: string;
  search_count: number;
  unique_sessions: number;
  last_searched: string;
}

interface EventStat {
  event_type: string;
  count: number;
}

interface DailyStats {
  date: string;
  pageviews: number;
  searches: number;
  predictions: number;
  games: number;
}

const BIRTHDAY = new Date('2025-08-08');
const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function AdminLocationStats() {
  const [locationStats, setLocationStats] = useState<LocationStat[]>([]);
  const [eventStats, setEventStats] = useState<EventStat[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalSearches: 0,
    totalPredictions: 0,
    totalGames: 0,
    totalAIChats: 0,
    totalNotifications: 0,
    totalShares: 0,
    totalUsers: 0,
    totalPWAInstalls: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const daysUntilBirthday = differenceInDays(BIRTHDAY, new Date());
  const isBirthday = daysUntilBirthday <= 0 && daysUntilBirthday >= -1;

  useEffect(() => {
    loadStats();
  }, [timeRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Calculate date range
      let startDate: Date;
      const now = new Date();
      
      switch (timeRange) {
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case '90d':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
        default:
          startDate = new Date('2024-08-08'); // App launch date
          break;
      }

      // Fetch location search stats
      const { data: locationData } = await supabase
        .from('analytics_events')
        .select('*')
        .eq('event_type', 'location_search')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: false });

      // Process location data
      const locationMap = new Map<string, LocationStat>();
      locationData?.forEach((event: any) => {
        const metadata = event.metadata || {};
        const key = metadata.location_name || 'Unknown';
        const existing = locationMap.get(key);
        
        if (existing) {
          existing.search_count++;
          if (!existing.last_searched || event.created_at > existing.last_searched) {
            existing.last_searched = event.created_at;
          }
        } else {
          locationMap.set(key, {
            location_name: key,
            latitude: metadata.latitude?.toString() || '',
            longitude: metadata.longitude?.toString() || '',
            search_count: 1,
            unique_sessions: 1,
            last_searched: event.created_at,
          });
        }
      });

      const sortedLocations = Array.from(locationMap.values())
        .sort((a, b) => b.search_count - a.search_count)
        .slice(0, 20);
      
      setLocationStats(sortedLocations);

      // Fetch all event types for stats
      const { data: allEvents } = await supabase
        .from('analytics_events')
        .select('event_type, created_at')
        .gte('created_at', startDate.toISOString());

      // Process event stats
      const eventMap = new Map<string, number>();
      const dailyMap = new Map<string, { pageviews: number; searches: number; predictions: number; games: number }>();
      
      allEvents?.forEach((event: any) => {
        const count = eventMap.get(event.event_type) || 0;
        eventMap.set(event.event_type, count + 1);

        // Daily stats
        const date = format(parseISO(event.created_at), 'yyyy-MM-dd');
        const daily = dailyMap.get(date) || { pageviews: 0, searches: 0, predictions: 0, games: 0 };
        
        if (event.event_type === 'pageview') daily.pageviews++;
        if (event.event_type === 'location_search') daily.searches++;
        if (event.event_type === 'prediction_made') daily.predictions++;
        if (event.event_type === 'game_played') daily.games++;
        
        dailyMap.set(date, daily);
      });

      const eventStatsArray = Array.from(eventMap.entries())
        .map(([event_type, count]) => ({ event_type, count }))
        .sort((a, b) => b.count - a.count);
      
      setEventStats(eventStatsArray);

      const dailyStatsArray = Array.from(dailyMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      setDailyStats(dailyStatsArray);

      // Calculate totals
      setTotalStats({
        totalSearches: eventMap.get('location_search') || 0,
        totalPredictions: eventMap.get('prediction_made') || 0,
        totalGames: eventMap.get('game_played') || 0,
        totalAIChats: eventMap.get('ai_chat_message') || 0,
        totalNotifications: eventMap.get('notification_enabled') || 0,
        totalShares: eventMap.get('share_weather') || 0,
        totalUsers: new Set(allEvents?.map((e: any) => e.session_id).filter(Boolean)).size,
        totalPWAInstalls: eventMap.get('pwa_installed') || 0,
      });

    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'location_search': return <Search className="w-4 h-4" />;
      case 'weather_view': return <Eye className="w-4 h-4" />;
      case 'prediction_made': return <TrendingUp className="w-4 h-4" />;
      case 'game_played': return <Gamepad2 className="w-4 h-4" />;
      case 'ai_chat_message': return <MessageSquare className="w-4 h-4" />;
      case 'notification_enabled': return <Bell className="w-4 h-4" />;
      case 'share_weather': return <Share2 className="w-4 h-4" />;
      default: return <Eye className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Birthday Countdown Card */}
      <Card className="bg-gradient-to-r from-primary/20 via-purple-500/20 to-pink-500/20 border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isBirthday ? (
              <>
                <Sparkles className="w-6 h-6 text-yellow-500" />
                Happy 1st Birthday Rainz! 🎂
              </>
            ) : (
              <>
                <Cake className="w-6 h-6 text-pink-500" />
                Rainz 1st Birthday Countdown
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isBirthday ? (
            <div className="text-center py-4">
              <p className="text-2xl font-bold text-primary mb-2">🎉 It's our birthday! 🎉</p>
              <p className="text-muted-foreground">August 8th, 2025 - 1 Year of Weather Predictions!</p>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-4xl font-bold text-primary">{daysUntilBirthday}</p>
                <p className="text-sm text-muted-foreground">days until August 8th, 2025</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Anniversary Stats Ready</p>
                <Badge variant="secondary">Track Everything</Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Time Range Selector */}
      <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as any)}>
        <TabsList>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
          <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          <TabsTrigger value="all">All Time</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalSearches.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Location Searches</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalPredictions.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Predictions Made</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalGames.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Games Played</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Unique Sessions</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Activity Over Time Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Activity Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="date" 
                  className="text-xs"
                  tickFormatter={(value) => format(parseISO(value), 'MMM d')}
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))' 
                  }}
                  labelFormatter={(value) => format(parseISO(value as string), 'MMM d, yyyy')}
                />
                <Line type="monotone" dataKey="pageviews" stroke="hsl(var(--primary))" name="Pageviews" strokeWidth={2} />
                <Line type="monotone" dataKey="searches" stroke="hsl(var(--chart-2))" name="Searches" strokeWidth={2} />
                <Line type="monotone" dataKey="predictions" stroke="hsl(var(--chart-3))" name="Predictions" strokeWidth={2} />
                <Line type="monotone" dataKey="games" stroke="hsl(var(--chart-4))" name="Games" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Searched Locations */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Top Searched Locations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {locationStats.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No location searches tracked yet</p>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {locationStats.map((loc, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div>
                        <p className="font-medium truncate max-w-[200px]">{loc.location_name}</p>
                        <p className="text-xs text-muted-foreground">
                          Last searched {format(parseISO(loc.last_searched), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-primary">{loc.search_count}</p>
                      <p className="text-xs text-muted-foreground">searches</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Types Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Event Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventStats.slice(0, 5)}
                    dataKey="count"
                    nameKey="event_type"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }) => `${name.replace(/_/g, ' ')} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {eventStats.slice(0, 5).map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))' 
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {eventStats.slice(0, 8).map((stat, index) => (
                <div key={stat.event_type} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getEventIcon(stat.event_type)}
                    <span className="capitalize">{stat.event_type.replace(/_/g, ' ')}</span>
                  </div>
                  <Badge variant="secondary">{stat.count.toLocaleString()}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-cyan-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalAIChats.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">AI Chat Messages</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalNotifications.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Notifications Enabled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Share2 className="w-5 h-5 text-pink-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalShares.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Weather Shares</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{totalStats.totalPWAInstalls.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">PWA Installs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
