import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Address } from '@poli/types';

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  address: Address | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshAddress: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  profile: null,
  address: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
  refreshAddress: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [address, setAddress] = useState<Address | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!data) {
      await supabase.from('profiles').upsert({ id: userId, watched_categories: [] });
      const { data: np } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(np);
    } else {
      setProfile(data);
    }
  }, []);

  const fetchAddress = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();
    setAddress(data);
  }, []);

  const ensureNotifPrefs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_notification_prefs')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) await supabase.from('user_notification_prefs').insert({ user_id: userId });
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        await fetchProfile(sess.user.id);
        await fetchAddress(sess.user.id);
        await ensureNotifPrefs(sess.user.id);
      } else {
        setProfile(null);
        setAddress(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        fetchProfile(sess.user.id);
        fetchAddress(sess.user.id);
        ensureNotifPrefs(sess.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile, fetchAddress, ensureNotifPrefs]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setAddress(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user, session, profile, address, loading, signOut,
        refreshProfile: async () => { if (user) await fetchProfile(user.id); },
        refreshAddress: async () => { if (user) await fetchAddress(user.id); },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
