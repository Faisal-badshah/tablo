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
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchRoleAndSubscription(session.user.id), 0);
      } else {
        setRole(null);
        setRestaurantId(null);
        setSubscriptionStatus(null);
        setTrialEndDate(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleAndSubscription(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchRoleAndSubscription]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, redirect: null };

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Login failed', redirect: null };

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role, restaurant_id')
      .eq('user_id', user.id)
      .maybeSingle();

    const r = roleData?.role as AppRole | undefined;
    setRole(r ?? null);
    setRestaurantId(roleData?.restaurant_id ?? null);

    // Fetch subscription for non-super-admins
    if (r && r !== 'super_admin' && roleData?.restaurant_id) {
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('status, trial_end_date')
        .eq('id', roleData.restaurant_id)
        .maybeSingle();
      setSubscriptionStatus(computeSubscriptionStatus(restaurant));
      setTrialEndDate(restaurant?.trial_end_date ? new Date(restaurant.trial_end_date) : null);
    }

    const redirectMap: Record<string, string> = {
      kitchen: '/kitchen',
      billing: '/billing',
      owner: '/owner',
      super_admin: '/super-admin',
    };

    return { error: null, redirect: r ? redirectMap[r] : '/' };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
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
