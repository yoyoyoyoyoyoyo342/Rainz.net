import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  username?: string;
  display_name?: string;
  avatar_url?: string;
  bio?: string;
  notification_enabled: boolean;
  notification_time: string;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error loading profile:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile loading to prevent deadlocks
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        setTimeout(() => {
          loadUserProfile(session.user.id);
        }, 0);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      // Clean up auth state from localStorage
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });

      // Clean up cross-subdomain auth cookies on .rejn.app and legacy .rainz.net
      const host = window.location.hostname;
      const onRejn = host === 'rejn.app' || host.endsWith('.rejn.app');
      const onRainz = host === 'rainz.net' || host.endsWith('.rainz.net');
      const cookieDomains: string[] = [];
      if (onRejn) cookieDomains.push('.rejn.app');
      if (onRainz) cookieDomains.push('.rainz.net');
      if (cookieDomains.length) {
        document.cookie.split('; ').forEach((c) => {
          const name = c.split('=')[0];
          if (name.startsWith('sb-') || name.includes('sb-') || name.startsWith('supabase.auth')) {
            for (const domain of cookieDomains) {
              document.cookie = `${name}=; Max-Age=0; Path=/; Domain=${domain}; Secure; SameSite=Lax`;
            }
            document.cookie = `${name}=; Max-Age=0; Path=/`;
          }
        });
      }

      // Attempt global sign out
      await supabase.auth.signOut({ scope: 'global' });

      // Redirect to www.rejn.app/auth on production rejn host, /auth elsewhere
      window.location.href = (onRejn || onRainz) ? 'https://www.rejn.app/auth' : '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      const host = window.location.hostname;
      const onProd = host === 'rejn.app' || host.endsWith('.rejn.app') || host === 'rainz.net' || host.endsWith('.rainz.net');
      window.location.href = onProd ? 'https://www.rejn.app/auth' : '/auth';
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) throw error;

      setProfile(data);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signOut,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}