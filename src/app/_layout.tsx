import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useState } from 'react';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { WelcomeGate } from '@/components/welcome-gate';
import { AuthProvider, useAuth } from '@/lib/auth/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    // Species/site content is read-mostly; keep it around so the dex still
    // renders with no signal (boat, underwater, airplane mode).
    queries: { gcTime: Infinity, retry: 1 },
  },
});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AnimatedSplashOverlay />
          <AppShell />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function AppShell() {
  const { isLoading, user } = useAuth();
  // Skipping is remembered only for this app session (not persisted) -- the
  // gate nudges again on the next launch until the user actually signs in,
  // without nagging repeatedly while they're already using the app.
  const [hasSkipped, setHasSkipped] = useState(false);

  // While the session check resolves, render nothing rather than the tabs --
  // otherwise the Fish tab would flash briefly before swapping to the sign-in
  // gate, undercutting the "sign in first" intent.
  if (isSupabaseConfigured && isLoading) {
    return null;
  }

  if (isSupabaseConfigured && !user && !hasSkipped) {
    return <WelcomeGate onSkip={() => setHasSkipped(true)} />;
  }

  return (
    <Stack>
      {/*
        The (tabs) group owns the custom Tabs/TabSlot UI, which only knows
        how to render its own declared tab routes. Creature/site detail are
        shared screens outside the tab set, so they're pushed on top of the
        tabs as ordinary Stack screens (the standard expo-router pattern for
        "tabs + shared detail screens").
      */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="creature/[slug]" options={{ title: 'Creature' }} />
      <Stack.Screen name="site/[slug]" options={{ title: 'Dive Site' }} />
    </Stack>
  );
}
