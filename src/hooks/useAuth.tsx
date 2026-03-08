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

  // ✅ MINIMAL: Just check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Fetch role
          const { data } = await supabase
            .from('user_roles')
            .select('role, restaurant_id')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          setRole((data?.role as AppRole) ?? null);
          setRestaurantId(data?.restaurant_id ?? null);

          // Fetch restaurant for subscription
          if (data?.restaurant_id && data.role !== 'super_admin') {
            const { data: restaurant } = await supabase
              .from('restaurants')
              .select('status, trial_end_date')
              .eq('id', data.restaurant_id)
              .maybeSingle();
            
            setSubscriptionStatus(computeSubscriptionStatus(restaurant));
            setTrialEndDate(restaurant?.trial_end_date ? new Date(restaurant.trial_end_date) : null);
          }
        }
      } catch (error) {
        console.error('Session check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription?.unsubscribe();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    console.log('🔐 Signing in with:', email);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error('❌ Sign in failed:', error.message);
        return { error: error.message, redirect: null };
      }

      console.log('✅ Sign in successful');
      
      // Get updated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { error: 'User not found after login', redirect: null };
      }

      // Get role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role, restaurant_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const userRole = roleData?.role as AppRole | undefined;
      console.log('✅ User role:', userRole);

      const redirectMap: Record<AppRole, string> = {
        kitchen: '/kitchen',
        billing: '/billing',
        owner: '/owner',
        super_admin: '/super-admin',
      };

      const redirect = userRole ? redirectMap[userRole] : '/';
      console.log('✅ Redirecting to:', redirect);

      return { error: null, redirect };
    } catch (err) {
      console.error('❌ Unexpected error:', err);
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