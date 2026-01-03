import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle2, XCircle, Clock, BarChart3, MessageSquare, Database, Gift, FileText, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { AnalyticsDashboard } from './analytics-dashboard';
import { BroadcastMessage } from './broadcast-message';
import { ApiDataComparison } from './api-data-comparison';
import { AdminPremiumGrants } from './admin-premium-grants';
import { AdminBlogPosts } from './admin-blog-posts';
import { AdminLocationStats } from './admin-location-stats';

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

export function AdminPanel() {
  const [reports, setReports] = useState<WeatherReport[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from('weather_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error loading reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load weather reports',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  async function updateReportStatus(reportId: string, status: 'approved' | 'rejected') {
    try {
      console.log(`Updating report ${reportId} to ${status}`);
      
      // Find the report we're updating
      const reportToUpdate = reports.find(r => r.id === reportId);
      
      // Simple update without updated_at since the column doesn't exist
      const { data, error } = await supabase
        .from('weather_reports')
        .update({ status })
        .eq('id', reportId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Update result:', data);

      // If approved, check if we should auto-update the forecast
      if (status === 'approved' && reportToUpdate) {
        await checkAndUpdateForecast(reportToUpdate);
      }

      toast({
        title: 'Success',
        description: `Report ${status} successfully`,
      });

      await loadReports();
    } catch (error: any) {
      console.error('Error updating report:', error);
      toast({
        title: 'Error',
        description: error.message || `Failed to ${status} report`,
        variant: 'destructive',
      });
    }
  }

  // Check if 3+ approved reports agree on the same condition for a location and update weather_history
  async function checkAndUpdateForecast(report: WeatherReport) {
    try {
      // Get all approved reports for this location and date
      const { data: approvedReports, error } = await supabase
        .from('weather_reports')
        .select('actual_condition')
        .eq('location_name', report.location_name)
        .eq('report_date', report.report_date)
        .eq('status', 'approved');

      if (error) {
        console.error('Error fetching approved reports:', error);
        return;
      }

      // Count conditions
      const conditionCounts: Record<string, number> = {};
      approvedReports?.forEach(r => {
        const condition = r.actual_condition?.toLowerCase() || '';
        conditionCounts[condition] = (conditionCounts[condition] || 0) + 1;
      });

      // Find conditions with 3+ reports
      const majorityCondition = Object.entries(conditionCounts).find(([_, count]) => count >= 3);

      if (majorityCondition) {
        console.log(`Auto-updating forecast: ${majorityCondition[0]} has ${majorityCondition[1]} agreeing reports`);
        
        // Update weather_history if it exists - use 'condition' column (not 'actual_condition')
        const { error: historyError } = await supabase
          .from('weather_history')
          .update({ 
            condition: majorityCondition[0]
          })
          .eq('location_name', report.location_name)
          .eq('date', report.report_date);

        if (historyError) {
          console.error('Error updating weather history:', historyError);
        } else {
          toast({
            title: 'Forecast Updated',
            description: `Weather history updated to "${majorityCondition[0]}" based on ${majorityCondition[1]} matching reports`,
          });
        }
      }
    } catch (error) {
      console.error('Error in checkAndUpdateForecast:', error);
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Tabs defaultValue="reports" className="space-y-4">
      <TabsList className="flex-wrap h-auto gap-1">
        <TabsTrigger value="reports">Weather Reports</TabsTrigger>
        <TabsTrigger value="location-stats">
          <MapPin className="w-4 h-4 mr-2" />
          Location Stats
        </TabsTrigger>
        <TabsTrigger value="premium">
          <Gift className="w-4 h-4 mr-2" />
          Premium
        </TabsTrigger>
        <TabsTrigger value="blog">
          <FileText className="w-4 h-4 mr-2" />
          Blog
        </TabsTrigger>
        <TabsTrigger value="broadcast">
          <MessageSquare className="w-4 h-4 mr-2" />
          Broadcast
        </TabsTrigger>
        <TabsTrigger value="analytics">
          <BarChart3 className="w-4 h-4 mr-2" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="api-data">
          <Database className="w-4 h-4 mr-2" />
          API Data
        </TabsTrigger>
      </TabsList>

      <TabsContent value="reports">
        <Card>
          <CardHeader>
            <CardTitle>Weather Correction Reports</CardTitle>
            <CardDescription>Review and approve/reject weather correction reports</CardDescription>
          </CardHeader>
          <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Location</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Reported</TableHead>
              <TableHead>Actual</TableHead>
              <TableHead>Accuracy</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  No reports found
                </TableCell>
              </TableRow>
            ) : (
              reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.location_name}</TableCell>
                  <TableCell>{format(new Date(report.report_date), 'MMM dd, yyyy')}</TableCell>
                  <TableCell>{report.reported_condition}</TableCell>
                  <TableCell>{report.actual_condition}</TableCell>
                  <TableCell>{report.accuracy}</TableCell>
                  <TableCell>{getStatusBadge(report.status)}</TableCell>
                  <TableCell>
                    {report.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, 'approved')}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateReportStatus(report.id, 'rejected')}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
              )}
            </TableBody>
          </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="location-stats">
        <AdminLocationStats />
      </TabsContent>

      <TabsContent value="premium">
        <AdminPremiumGrants />
      </TabsContent>

      <TabsContent value="blog">
        <AdminBlogPosts />
      </TabsContent>

      <TabsContent value="broadcast">
        <BroadcastMessage />
      </TabsContent>

      <TabsContent value="analytics">
        <AnalyticsDashboard />
      </TabsContent>

      <TabsContent value="api-data">
        <ApiDataComparison />
      </TabsContent>
    </Tabs>
  );
}
