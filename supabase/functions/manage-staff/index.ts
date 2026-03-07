import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    
    // Get caller's role and restaurant_id
    const { data: callerRole } = await adminClient.from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", caller.id)
      .eq("role", "owner")
      .maybeSingle();
    
    if (!callerRole) {
      return new Response(JSON.stringify({ error: "Only owners can manage staff" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { action } = body;

    if (action === "create") {
      const { email, password, role } = body;
      if (!email || !password || !role || !["kitchen", "billing"].includes(role)) {
        return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createError) {
        return new Response(JSON.stringify({ error: createError.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await adminClient.from("user_roles").insert({ 
        user_id: newUser.user.id, 
        role, 
        restaurant_id: callerRole.restaurant_id 
      });
      return new Response(JSON.stringify({ success: true, user_id: newUser.user.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "list") {
      const { data: roles } = await adminClient.from("user_roles")
        .select("*")
        .eq("restaurant_id", callerRole.restaurant_id);
      if (!roles) return new Response(JSON.stringify({ staff: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const staffList = [];
      for (const r of roles) {
        const { data: { user } } = await adminClient.auth.admin.getUserById(r.user_id);
        if (user) staffList.push({ id: r.id, user_id: r.user_id, email: user.email, role: r.role });
      }
      return new Response(JSON.stringify({ staff: staffList }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete") {
      const { user_id } = body;
      if (!user_id || user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot delete yourself" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Ensure target user belongs to same restaurant
      const { data: targetRole } = await adminClient.from("user_roles")
        .select("restaurant_id")
        .eq("user_id", user_id)
        .eq("restaurant_id", callerRole.restaurant_id)
        .maybeSingle();
      
      if (!targetRole) {
        return new Response(JSON.stringify({ error: "Staff not found in your restaurant" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.auth.admin.deleteUser(user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
