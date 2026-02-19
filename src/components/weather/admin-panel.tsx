import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle2, XCircle, Clock, BarChart3, MessageSquare, Database,
  Gift, FileText, MapPin, Key, Tag, Lightbulb, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsDashboard } from './analytics-dashboard';
import { BroadcastMessage } from './broadcast-message';
import { ApiDataComparison } from './api-data-comparison';
import { AdminPremiumGrants } from './admin-premium-grants';
import { AdminBlogPosts } from './admin-blog-posts';
import { AdminLocationStats } from './admin-location-stats';
import { AdminApiToken } from './admin-api-token';
import { AdminShopOffers } from './admin-shop-offers';
import { AdminFeatureIdeas } from './admin-feature-ideas';

interface WeatherReport {
  id: string;
  location_name: string;
  latitude: number;
  longitude: number;
  report_date: string;
  reported_condition: string;
  actual_condition: string;
  accuracy: string;
  status: string;
  created_at: string;
  report_details: string | null;
}

// Reusable glass section wrapper
function AdminSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="glass-card rounded-2xl border border-border/30 overflow-hidden">
      <div className="px-5 py-4 border-b border-border/20">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function AdminPanel() {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => { loadReports(); }, []);

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from('weather_reports')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load weather reports', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, status: 'approved' | 'rejected') {
    try {
      const reportToUpdate = reports.find((r) => r.id === reportId);
      const { data, error } = await supabase
        .from('weather_reports').update({ status }).eq('id', reportId).select();
      if (error) throw error;
      if (status === 'approved' && reportToUpdate) await checkAndUpdateForecast(reportToUpdate);
      toast({ title: 'Success', description: `Report ${status} successfully` });
      await loadReports();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || `Failed to ${status} report`, variant: 'destructive' });
    }
  }

  async function checkAndUpdateForecast(report: WeatherReport) {
    try {
      const { data: approvedReports, error } = await supabase
        .from('weather_reports').select('actual_condition')
        .eq('location_name', report.location_name)
        .eq('report_date', report.report_date)
        .eq('status', 'approved');
      if (error) return;
      const conditionCounts: Record<string, number> = {};
      approvedReports?.forEach((r) => {
        const c = r.actual_condition?.toLowerCase() || '';
        conditionCounts[c] = (conditionCounts[c] || 0) + 1;
      });
      const majorityCondition = Object.entries(conditionCounts).find(([_, count]) => count >= 3);
      if (majorityCondition) {
        await supabase.from('weather_history')
          .update({ condition: majorityCondition[0] })
          .eq('location_name', report.location_name)
          .eq('date', report.report_date);
      }
    } catch { /* ignore */ }
  }

  const statusBadge = (status: string) => {
    if (status === 'approved') return <Badge className="bg-green-500/20 text-green-400 border border-green-500/30"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
    if (status === 'rejected') return <Badge className="bg-destructive/20 text-destructive border border-destructive/30"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
    return <Badge className="bg-muted/50 text-muted-foreground border border-border/40"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const TAB_ITEMS = [
    { value: 'ideas', label: 'Ideas', icon: <Lightbulb className="w-3.5 h-3.5" /> },
    { value: 'reports', label: 'Reports', icon: <ClipboardList className="w-3.5 h-3.5" /> },
    { value: 'location-stats', label: 'Locations', icon: <MapPin className="w-3.5 h-3.5" /> },
    { value: 'premium', label: 'Premium', icon: <Gift className="w-3.5 h-3.5" /> },
    { value: 'blog', label: 'Blog', icon: <FileText className="w-3.5 h-3.5" /> },
    { value: 'broadcast', label: 'Broadcast', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { value: 'analytics', label: 'Analytics', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { value: 'api-data', label: 'API Data', icon: <Database className="w-3.5 h-3.5" /> },
    { value: 'api-token', label: 'API Token', icon: <Key className="w-3.5 h-3.5" /> },
    { value: 'shop-offers', label: 'Shop', icon: <Tag className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card rounded-2xl border border-border/30 px-5 py-4">
        <h1 className="text-lg font-bold text-foreground">Admin Dashboard</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Rainz control panel</p>
      </div>

      <Tabs defaultValue="ideas" className="space-y-4">
        {/* Tabs bar */}
        <div className="glass-card rounded-2xl border border-border/30 p-1.5">
          <TabsList className="flex flex-wrap gap-1 h-auto bg-transparent p-0">
            {TAB_ITEMS.map((t) => (
              <TabsTrigger
                key={t.value}
                value={t.value}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm transition-all"
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        {/* Feature Ideas */}
        <TabsContent value="ideas">
          <AdminSection title="Feature Ideas 💡" description="Manage user-submitted feature requests. Pin, change status, or delete ideas.">
            <AdminFeatureIdeas />
          </AdminSection>
        </TabsContent>

        {/* Weather Reports */}
        <TabsContent value="reports">
          <AdminSection title="Weather Correction Reports" description="Review and approve or reject weather correction reports from users.">
            {loading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">Loading...</div>
            ) : (
              <div className="space-y-3">
                {reports.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-8">No reports found</p>
                ) : (
                  reports.map((report) => (
                    <div key={report.id} className="p-4 rounded-xl border border-border/30 bg-card/50 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{report.location_name}</p>
                          <p className="text-xs text-muted-foreground">{format(new Date(report.report_date), 'MMM dd, yyyy')}</p>
                        </div>
                        {statusBadge(report.status)}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div><span className="text-muted-foreground">Reported: </span><span className="text-foreground">{report.reported_condition}</span></div>
                        <div><span className="text-muted-foreground">Actual: </span><span className="text-foreground">{report.actual_condition}</span></div>
                        <div><span className="text-muted-foreground">Accuracy: </span><span className="text-foreground">{report.accuracy}</span></div>
                      </div>
                      {report.status === 'pending' && (
                        <div className="flex gap-2 pt-1">
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-green-500 border-green-500/30 hover:bg-green-500/10" onClick={() => updateReportStatus(report.id, 'approved')}>
                            <CheckCircle2 className="w-3 h-3 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs flex-1 text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => updateReportStatus(report.id, 'rejected')}>
                            <XCircle className="w-3 h-3 mr-1" />Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </AdminSection>
        </TabsContent>

        <TabsContent value="location-stats">
          <AdminSection title="Location Stats"><AdminLocationStats /></AdminSection>
        </TabsContent>

        <TabsContent value="premium">
          <AdminSection title="Premium Grants"><AdminPremiumGrants /></AdminSection>
        </TabsContent>

        <TabsContent value="blog">
          <AdminSection title="Blog Posts"><AdminBlogPosts /></AdminSection>
        </TabsContent>

        <TabsContent value="broadcast">
          <AdminSection title="Broadcast Messages"><BroadcastMessage /></AdminSection>
        </TabsContent>

        <TabsContent value="analytics">
          <AdminSection title="Analytics"><AnalyticsDashboard /></AdminSection>
        </TabsContent>

        <TabsContent value="api-data">
          <AdminSection title="API Data Comparison"><ApiDataComparison /></AdminSection>
        </TabsContent>

        <TabsContent value="api-token">
          <AdminSection title="API Token Management"><AdminApiToken /></AdminSection>
        </TabsContent>

        <TabsContent value="shop-offers">
          <AdminSection title="Shop Offers"><AdminShopOffers /></AdminSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
