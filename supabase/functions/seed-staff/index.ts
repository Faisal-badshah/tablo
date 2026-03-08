import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // ✅ FIX #1: Handle OPTIONS for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const staffAccounts = [
      { email: 'kitchen@spicehouse.com', password: 'password123', role: 'kitchen' },
      { email: 'billing@spicehouse.com', password: 'password123', role: 'billing' },
      { email: 'owner@spicehouse.com', password: 'password123', role: 'owner' },
      { email: 'faisalbadshah46@gmail.com', password: 'password123', role: 'super_admin' },
    ];

    const results = [];

    for (const staff of staffAccounts) {
      // ✅ FIX #2: Query auth.users table directly instead of listUsers()
      const { data: existingUser } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .eq('email', staff.email)
        .maybeSingle();

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
        results.push({ email: staff.email, status: 'already exists', userId });
      } else {
        const { data: newUser, error } = await supabaseAdmin.auth.admin.createUser({
          email: staff.email,
          password: staff.password,
          email_confirm: true,
        });

        if (error) {
          results.push({ email: staff.email, status: 'error', error: error.message });
          continue;
        }
        userId = newUser.user.id;
        results.push({ email: staff.email, status: 'created', userId });
      }

      // ✅ FIX #3: Correct onConflict syntax - should be an array
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert(
          { user_id: userId, role: staff.role },
          { onConflict: 'user_id,role' }  // This is correct for Supabase
        );

      if (roleError) {
        results.push({ email: staff.email, roleStatus: 'error', error: roleError.message });
      } else {
        results.push({ email: staff.email, roleStatus: 'success' });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('SEED STAFF ERROR:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});