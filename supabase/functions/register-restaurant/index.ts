import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 50);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { restaurant_name, owner_name, email, phone, password } = await req.json();

    if (!restaurant_name || !email || !password || password.length < 6) {
      return new Response(
        JSON.stringify({ error: "Missing required fields or password too short" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUser } = await adminClient.auth.admin.getUserByEmail(email);
    if (existingUser?.user) {
      return new Response(
        JSON.stringify({ error: "An account with this email already exists" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check duplicate phone
    if (phone) {
      const { data: phoneCheck } = await adminClient
        .from("restaurants")
        .select("id")
        .eq("owner_phone", phone)
        .maybeSingle();

      if (phoneCheck) {
        return new Response(
          JSON.stringify({ error: "A restaurant with this phone already exists" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Generate unique slug
    let baseSlug = generateSlug(restaurant_name);
    let slug = baseSlug;
    let attempt = 0;

    while (true) {
      const { data: existing } = await adminClient
        .from("restaurants")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!existing) break;

      attempt++;
      slug = `${baseSlug}-${attempt}`;
    }

    // Create auth user
    const { data: newUser, error: userError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (userError) {
      return new Response(JSON.stringify({ error: userError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create restaurant
    const { data: restaurant, error: restError } = await adminClient
      .from("restaurants")
      .insert({
        name: restaurant_name,
        slug,
        owner_name: owner_name || "",
        owner_email: email,
        owner_phone: phone || "",
        status: "trial",
      })
      .select()
      .single();

    if (restError) {
      await adminClient.auth.admin.deleteUser(newUser.user.id);

      return new Response(JSON.stringify({ error: restError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Assign owner role
    const { error: roleError } = await adminClient
      .from("user_roles")
      .insert({
        user_id: newUser.user.id,
        role: "owner",
        restaurant_id: restaurant.id,
      });

    if (roleError) {
      await adminClient.from("restaurants").delete().eq("id", restaurant.id);
      await adminClient.auth.admin.deleteUser(newUser.user.id);

      return new Response(JSON.stringify({ error: roleError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create default tables
    const defaultTables = [1, 2, 3, 4, 5].map((n) => ({
      table_number: n,
      restaurant_id: restaurant.id,
      status: "available",
    }));

    await adminClient.from("restaurant_tables").insert(defaultTables);

    return new Response(
      JSON.stringify({
        success: true,
        restaurant_id: restaurant.id,
        user_id: newUser.user.id,
        slug,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});