// src/integrations/supabase/client.ts
// ✅ PRODUCTION-READY Supabase Client Configuration

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY'
  )
}

// ✅ CRITICAL: Enable session persistence and auto-refresh
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // ✅ MUST BE TRUE: Persist session to localStorage
    persistSession: true,
    
    // ✅ MUST BE TRUE: Automatically refresh token before expiry
    autoRefreshToken: true,
    
    // ✅ MUST BE TRUE: Detect session from URL (for redirects)
    detectSessionInUrl: true,
    
    // ✅ OPTIONAL: Custom storage (default is localStorage)
    // You can use sessionStorage or custom implementation if needed
    // storage: window.sessionStorage,
  },
})

// ✅ Optional: Add debug logging in development
if (import.meta.env.DEV) {
  supabase.auth.onAuthStateChange((event, session) => {
    console.debug('Auth state changed:', { event, user: session?.user?.email })
  })
}