import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';

import { isSupabaseConfigured, supabase } from '../supabase';

/**
 * Supabase's free default email sender can't have its template customized
 * (that requires paid custom SMTP), so it only ever sends a magic link, not
 * a typeable code. Rather than requiring SMTP just to unlock a 6-digit code,
 * this makes the link itself complete sign-in: tapping it opens the app at
 * `emailRedirectTo` with a `?code=...` param, which is exchanged for a
 * session here. `verifyOtp` (manual code entry) stays available as a
 * fallback for whoever does have a code (e.g. once custom SMTP is added).
 */
function getEmailRedirectTo(): string {
  if (Platform.OS === 'web') {
    return typeof window !== 'undefined' ? window.location.origin : '';
  }
  return Linking.createURL('auth-callback');
}

async function completeSessionFromUrl(url: string | null) {
  if (!supabase || !url) return;
  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (typeof code !== 'string') return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) console.warn('Fish Catcher: sign-in link exchange failed', error);

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.history.replaceState({}, '', window.location.pathname);
  }
}

interface AuthContextValue {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  requestOtp: (email: string) => Promise<{ error: string | null }>;
  verifyOtp: (email: string, token: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    // The app may have been opened fresh by tapping the sign-in link.
    Linking.getInitialURL().then(completeSessionFromUrl);

    // Or it was already running and the link opened it (native deep link,
    // or a same-tab redirect back on web).
    const subscription = Linking.addEventListener('url', ({ url }) => {
      completeSessionFromUrl(url);
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (!supabase || !session?.user) return;
    // Best-effort: make sure a profile row exists for this user. Never blocks the UI.
    supabase
      .from('profiles')
      .upsert({ user_id: session.user.id }, { onConflict: 'user_id', ignoreDuplicates: true })
      .then(({ error }) => {
        if (error) console.warn('Fish Catcher: profile upsert failed', error);
      });
  }, [session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      async requestOtp(email: string) {
        if (!supabase) return { error: 'Supabase is not configured.' };
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true, emailRedirectTo: getEmailRedirectTo() },
        });
        return { error: error?.message ?? null };
      },
      async verifyOtp(email: string, token: string) {
        if (!supabase) return { error: 'Supabase is not configured.' };
        const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
        return { error: error?.message ?? null };
      },
      async signOut() {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [isLoading, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
