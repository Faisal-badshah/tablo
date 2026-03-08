import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS", // ✅ FIX #1: Added missing methods header
};

serve(async (req) => {
  // ✅ FIX #2: Proper CORS preflight handling
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ✅ FIX #3: Validate Bearer token format
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization header format" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller } } = await callerClient.auth.getUser();
    if (!caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Get caller's role and restaurant_id
    const { data: callerRole } = await adminClient
      .from("user_roles")
      .select("role, restaurant_id")
      .eq("user_id", caller.id)
      .eq("role", "owner")
      .maybeSingle();

    if (!callerRole) {
      return new Response(
        JSON.stringify({ error: "Only owners can manage staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ===== CREATE STAFF ACTION =====
    if (action === "create") {
      const { email, password, role } = body;
      if (!email || !password || !role || !["kitchen", "billing"].includes(role)) {
        return new Response(
          JSON.stringify({ error: "Invalid input" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check if email already exists
      const { data: existingUser } = await adminClient
        .from("auth.users")
        .select("id")
        .eq("email", email)
        .maybeSingle();

      if (existingUser) {
        return new Response(
          JSON.stringify({ error: "An account with this email already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await adminClient.from("user_roles").insert({
        user_id: newUser.user.id,
        role,
        restaurant_id: callerRole.restaurant_id,
      });

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id, email }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== LIST STAFF ACTION =====
    if (action === "list") {
      // ✅ FIX #4: Optimized query - join instead of N+1 queries
      const { data: staffData } = await adminClient
        .from("user_roles")
        .select("id, user_id, role")
        .eq("restaurant_id", callerRole.restaurant_id);

      if (!staffData || staffData.length === 0) {
        return new Response(
          JSON.stringify({ staff: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get all user emails in one query instead of looping
      const userIds = staffData.map(r => r.user_id);
      const { data: users } = await adminClient
        .from("auth.users")
        .select("id, email")
        .in("id", userIds);

      const userMap = new Map(users?.map(u => [u.id, u.email]) || []);

      const staff = staffData.map(r => ({
        id: r.id,
        user_id: r.user_id,
        email: userMap.get(r.user_id) || "unknown",
        role: r.role,
      }));

      return new Response(
        JSON.stringify({ staff }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== DELETE STAFF ACTION =====
    if (action === "delete") {
      const { user_id } = body;
      if (!user_id || user_id === caller.id) {
        return new Response(
          JSON.stringify({ error: "Cannot delete yourself" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure target user belongs to same restaurant
      const { data: targetRole } = await adminClient
        .from("user_roles")
        .select("restaurant_id")
        .eq("user_id", user_id)
        .eq("restaurant_id", callerRole.restaurant_id)
        .maybeSingle();

      if (!targetRole) {
        return new Response(
          JSON.stringify({ error: "Staff not found in your restaurant" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Delete role and auth user
      await adminClient.from("user_roles").delete().eq("user_id", user_id);
      await adminClient.auth.admin.deleteUser(user_id);

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    // ✅ FIX #5: Better error handling
    console.error("MANAGE STAFF ERROR:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});