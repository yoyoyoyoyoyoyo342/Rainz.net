import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, excerpt, slug } = await req.json().catch(() => ({}));

    if (!title || !slug) {
      return new Response(JSON.stringify({ error: "title and slug are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: users, error: usersError } = await supabase
      .from("profiles")
      .select("user_id");

    if (usersError) throw usersError;

    if (!users || users.length === 0) {
      return new Response(JSON.stringify({ inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const message = `${excerpt || "Check out our latest article!"}\n\nRead the full article at https://rainz.net/articles/${slug}`;

    const notifications = users.map((user) => ({
      user_id: user.user_id,
      title: `New Article: ${title}`,
      message,
      type: "blog_post",
      metadata: { slug },
    }));

    const { error: notifyError } = await supabase
      .from("user_notifications")
      .insert(notifications);

    if (notifyError) throw notifyError;

    return new Response(JSON.stringify({ inserted: notifications.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in notify-blog-post:", error);
    return new Response(JSON.stringify({ error: error?.message || String(error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
