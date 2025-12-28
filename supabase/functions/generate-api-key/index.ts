import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-API-KEY] ${step}${detailsStr}`);
};

// Generate a secure API key
function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const prefix = 'rz_';
  let key = prefix;
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    key += chars[array[i] % chars.length];
  }
  return key;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const { name = 'Default', stripe_subscription_id } = await req.json().catch(() => ({}));

    // Generate unique API key
    let apiKey = generateApiKey();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseClient
        .from('api_keys')
        .select('id')
        .eq('api_key', apiKey)
        .single();

      if (!existing) break;
      apiKey = generateApiKey();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Failed to generate unique API key");
    }

    // Insert the new API key
    const { data: newKey, error: insertError } = await supabaseClient
      .from('api_keys')
      .insert({
        user_id: user.id,
        api_key: apiKey,
        name: name,
        stripe_subscription_id: stripe_subscription_id || null
      })
      .select()
      .single();

    if (insertError) throw insertError;

    logStep("API key created", { keyId: newKey.id, name });

    return new Response(JSON.stringify({ 
      api_key: apiKey,
      id: newKey.id,
      name: newKey.name,
      created_at: newKey.created_at
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});