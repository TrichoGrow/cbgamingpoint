import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const timestamp = new Date().toISOString();

  if (error) {
    console.log(`[${timestamp}] Keep-alive ping failed:`, error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`[${timestamp}] Keep-alive ping OK — ${count} profiles`);
  return new Response(
    JSON.stringify({ ok: true, timestamp, profiles: count }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
