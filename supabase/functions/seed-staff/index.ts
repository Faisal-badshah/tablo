import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find(u => u.email === staff.email);

      let userId: string;

      if (existing) {
        userId = existing.id;
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

      // Upsert role
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .upsert({ user_id: userId, role: staff.role }, { onConflict: 'user_id,role' });

      if (roleError) {
        results.push({ email: staff.email, roleStatus: 'error', error: roleError.message });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
