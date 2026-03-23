import { createClient } from "https://esm.sh/@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();

    const { email, password, full_name, organization_id } = body;

    if (!email || !password || !full_name || !organization_id) {
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!   // ⚠️ الاسم الصحيح
    );

    // 1. Create user
    const { data: userData, error: userError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError) throw userError;

    // 2. Insert profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: userData.user.id,
        full_name,
        role: "coach",
        organization_id,
      });

    if (profileError) throw profileError;

    return new Response(JSON.stringify({ success: true }), {
      headers: corsHeaders,
    });

  } catch (err: any) {
    console.error("Function error:", err);

    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
