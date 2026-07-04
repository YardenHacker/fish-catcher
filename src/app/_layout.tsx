import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider } from '@/lib/auth/AuthProvider';

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
          {/*
            The (tabs) group owns the custom Tabs/TabSlot UI, which only knows
            how to render its own declared tab routes. Creature/site detail are
            shared screens outside the tab set, so they're pushed on top of the
            tabs as ordinary Stack screens (the standard expo-router pattern for
            "tabs + shared detail screens").
          */}
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="creature/[slug]" options={{ title: 'Creature' }} />
            <Stack.Screen name="site/[slug]" options={{ title: 'Dive Site' }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
