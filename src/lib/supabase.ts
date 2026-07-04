import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Fish Catcher runs fully offline on bundled mock data + on-device storage until a
 * free Supabase project is wired up. `isSupabaseConfigured` is the single
 * switch the data layer checks to decide mock vs. live queries.
 */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

// AsyncStorage's web implementation touches `window` directly. Expo Router
// server-renders the web app's initial HTML in a Node worker (no `window`),
// and the Supabase auth client calls into storage as soon as it's
// constructed -- so an unguarded AsyncStorage crashes every server-rendered
// request. Route storage calls through this no-op-on-the-server shim instead.
const ssrSafeStorage = {
  getItem: (key: string) => (typeof window === 'undefined' ? Promise.resolve(null) : AsyncStorage.getItem(key)),
  setItem: (key: string, value: string) =>
    typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => (typeof window === 'undefined' ? Promise.resolve() : AsyncStorage.removeItem(key)),
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        storage: ssrSafeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null;
