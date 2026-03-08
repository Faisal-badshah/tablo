import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'owner' | 'kitchen' | 'billing' | 'super_admin';

export type SubscriptionStatus = 'active' | 'trial' | 'trial_expired' | 'suspended' | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  restaurantId: string | null;
  subscriptionStatus: SubscriptionStatus;
  trialEndDate: Date | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; redirect: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('Must be inside AuthProvider');
  return ctx;
};

function computeSubscriptionStatus(restaurant: { status: string; trial_end_date: string | null } | null): SubscriptionStatus {
  if (!restaurant) return null;
  if (restaurant.status === 'suspended') return 'suspended';
  if (restaurant.status === 'active') return 'active';
  if (restaurant.status === 'trial') {
    if (restaurant.trial_end_date && new Date(restaurant.trial_end_date) < new Date()) {
      return 'trial_expired';
    }
    return 'trial';
  }
  return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>(null);
  const [trialEndDate, setTrialEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndSubscription = useCallback(async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role, restaurant_id')
        .eq('user_id', userId)
        .maybeSingle();
      
      const r = (data?.role as AppRole) ?? null;
      const rId = data?.restaurant_id ?? null;
      setRole(r);
      setRestaurantId(rId);

      // Super admins bypass subscription checks
      if (r === 'super_admin') {
        setSubscriptionStatus('active');
        setTrialEndDate(null);
        return;
      }

      if (rId) {
        const { data: restaurant } = await supabase
          .from('restaurants')
          .select('status, trial_end_date')
          .eq('id', rId)
          .maybeSingle();
        
        setSubscriptionStatus(computeSubscriptionStatus(restaurant));
        setTrialEndDate(restaurant?.trial_end_date ? new Date(restaurant.trial_end_date) : null);
      } else {
        setSubscriptionStatus(null);
        setTrialEndDate(null);
      }
    } catch (error) {
      console.error('Error fetching role and subscription:', error);
      setRole(null);
      setRestaurantId(null);
      setSubscriptionStatus(null);
      setTrialEndDate(null);
    }
  }, []);

  // ✅ SIMPLIFIED: Initialize on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchRoleAndSubscription(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchRoleAndSubscription(session.user.id);
      } else {
        setRole(null);
        setRestaurantId(null);
        setSubscriptionStatus(null);
        setTrialEndDate(null);
      }
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [fetchRoleAndSubscription]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        return { error: error.message, redirect: null };
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return { error: 'Login failed', redirect: null };
      }

      // Get user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, restaurant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const r = roleData?.role as AppRole | undefined;

      const redirectMap: Record<string, string> = {
        kitchen: '/kitchen',
        billing: '/billing',
        owner: '/owner',
        super_admin: '/super-admin',
      };

      return { error: null, redirect: r ? redirectMap[r] : '/' };
    } catch (err) {
      return { 
        error: err instanceof Error ? err.message : 'Login failed',
        redirect: null 
      };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setRestaurantId(null);
    setSubscriptionStatus(null);
    setTrialEndDate(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, role, restaurantId, subscriptionStatus, trialEndDate, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};