import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Get the auth header from the request
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseClient.auth.getUser(token);
      userId = user?.id || null;
    }

    const body = await req.json();
    
    // Handle both single event and batch events
    const events = body.events || [body];
    const results = [];

    // Extract request metadata (same for all events in batch)
    const userAgent = req.headers.get('user-agent') || null;
    const referrer = req.headers.get('referer') || null;
    
    // Get IP address from various headers (CloudFlare, standard forwarded headers)
    const cfConnectingIp = req.headers.get('cf-connecting-ip');
    const xForwardedFor = req.headers.get('x-forwarded-for');
    const xRealIp = req.headers.get('x-real-ip');
    const clientIp = cfConnectingIp || xForwardedFor?.split(',')[0] || xRealIp;

    // Get geolocation data if available from CloudFlare headers
    const cfCountry = req.headers.get('cf-ipcountry');
    const cfCity = req.headers.get('cf-ipcity');
    
    let country = cfCountry || null;
    let city = cfCity || null;

    // If CloudFlare headers not available, try to get geolocation from IP
    if (!country && clientIp && clientIp !== '127.0.0.1' && clientIp !== 'localhost') {
      try {
        const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}?fields=status,country,city`);
        if (geoResponse.ok) {
          const geoData = await geoResponse.json();
          if (geoData.status === 'success') {
            country = geoData.country;
            city = geoData.city;
          }
        }
      } catch (error) {
        console.error('Geolocation lookup failed:', error);
      }
    }

    // Process each event
    for (const event of events) {
      const { event_type, page_path, session_id, metadata } = event;
      
      console.log('Analytics event:', {
        event_type,
        page_path,
        user_id: userId,
        session_id,
        metadata,
        country,
        city,
        user_agent: userAgent,
        referrer,
      });

      // Insert analytics event
      const { error } = await supabaseClient
        .from('analytics_events')
        .insert({
          event_type,
          page_path: page_path || '/',
          user_id: userId,
          session_id,
          country,
          city,
          user_agent: userAgent,
          referrer,
          metadata: metadata || {},
        });

      if (error) {
        console.error('Error inserting analytics event:', error);
        results.push({ success: false, error: error.message });
      } else {
        results.push({ success: true });
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error in track-analytics function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
