import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { version_id } = await req.json();

    if (!version_id) {
      return new Response(JSON.stringify({ error: "Missing version_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the version record
    const { data: versionData, error: versionErr } = await supabase
      .from("app_versions")
      .select("*")
      .eq("id", version_id)
      .single();

    if (versionErr || !versionData) {
      return new Response(JSON.stringify({ error: "Version not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { version, previous_version, changelog } = versionData;
    const changes = (changelog as string[]) || [];

    // Build notification body
    const changesText = changes
      .map((c: string, i: number) => `${i + 1}. ${c}`)
      .join(" ");

    const title = `🚀 V${version} is here!`;
    const body = previous_version
      ? `What's new compared to V${previous_version}: ${changesText}`
      : `What's new: ${changesText}`;

    // Get all unique user IDs from push_subscriptions
    const { data: subs } = await supabase
      .from("push_subscriptions")
      .select("user_id");

    const userIds = [...new Set((subs || []).map((s) => s.user_id))];

    let sent = 0;
    let failed = 0;

    // Send push + inbox notification to each user via send-push-notification
    // (which already creates an inbox entry)
    const batchSize = 20;
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((userId) =>
          supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title,
              body,
              data: { type: "version_update", version },
            },
          })
        )
      );
      results.forEach((r) => {
        if (r.status === "fulfilled" && !r.value.error) sent++;
        else failed++;
      });
    }

    // Also send inbox notifications to users WITHOUT push subscriptions
    // (so everyone sees it in their inbox)
    const { data: allProfiles } = await supabase
      .from("profiles")
      .select("user_id");

    const allUserIds = (allProfiles || []).map((p) => p.user_id);
    const pushUserSet = new Set(userIds);
    const nonPushUsers = allUserIds.filter((id) => !pushUserSet.has(id));

    if (nonPushUsers.length > 0) {
      const inboxRows = nonPushUsers.map((userId) => ({
        user_id: userId,
        type: "version_update",
        title,
        message: body,
        metadata: { version },
      }));

      // Insert in batches of 100
      for (let i = 0; i < inboxRows.length; i += 100) {
        await supabase
          .from("user_notifications")
          .insert(inboxRows.slice(i, i + 100));
      }
    }

    console.log(
      `Version ${version} notification: push sent=${sent}, failed=${failed}, inbox-only=${nonPushUsers.length}`
    );

    return new Response(
      JSON.stringify({ sent, failed, inboxOnly: nonPushUsers.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
