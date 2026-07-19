import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Megaphone } from 'lucide-react';

interface Row {
  source: string;
  count: number;
}

const LABELS: Record<string, string> = {
  google: 'Google',
  friend: 'Friend / Word of mouth',
  social: 'Social media',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  appstore: 'App / Play store',
  news: 'News / Blog',
  other: 'Other',
};

export function AdminAcquisitionSources() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('acquisition_source')
          .not('acquisition_source', 'is', null);
        if (error) throw error;
        const counts: Record<string, number> = {};
        (data || []).forEach((r: any) => {
          const key = String(r.acquisition_source || 'other').toLowerCase();
          counts[key] = (counts[key] || 0) + 1;
        });
        const list = Object.entries(counts)
          .map(([source, count]) => ({ source: LABELS[source] || source, count }))
          .sort((a, b) => b.count - a.count);
        setRows(list);
        setTotal(list.reduce((s, r) => s + r.count, 0));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Megaphone className="w-4 h-4" /> How did you hear about us?
        </CardTitle>
        <CardDescription>
          {loading ? 'Loading…' : `${total} responses from onboarding`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No responses yet.</p>
        ) : (
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rows} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis type="number" allowDecimals={false} />
                <YAxis type="category" dataKey="source" width={140} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
