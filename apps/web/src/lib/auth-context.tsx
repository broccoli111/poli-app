'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from './supabase-browser';
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
  const supabase = getSupabaseBrowserClient();

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (!data) {
      await supabase.from('profiles').upsert({ id: userId, watched_categories: [] });
      const { data: newProfile } = await supabase.from('profiles').select('*').eq('id', userId).single();
      setProfile(newProfile);
    } else {
      setProfile(data);
    }
  }, [supabase]);

  const fetchAddress = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_primary', true)
      .maybeSingle();
    setAddress(data);
  }, [supabase]);

  const ensureNotificationPrefs = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('user_notification_prefs')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      await supabase.from('user_notification_prefs').insert({ user_id: userId });
    }
  }, [supabase]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchProfile(session.user.id);
        await fetchAddress(session.user.id);
        await ensureNotificationPrefs(session.user.id);
      } else {
        setProfile(null);
        setAddress(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
        fetchAddress(session.user.id);
        ensureNotificationPrefs(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile, fetchAddress, ensureNotificationPrefs]);

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
        user,
        session,
        profile,
        address,
        loading,
        signOut,
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
