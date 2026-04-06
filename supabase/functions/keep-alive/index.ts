import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Lightweight query to keep the database active
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  const timestamp = new Date().toISOString();

  if (error) {
    console.log(`[${timestamp}] Keep-alive ping failed:`, error.message);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  console.log(`[${timestamp}] Keep-alive ping OK — ${count} profiles`);
  return new Response(
    JSON.stringify({ ok: true, timestamp, profiles: count }),
    { headers: { "Content-Type": "application/json" } }
  );
});
