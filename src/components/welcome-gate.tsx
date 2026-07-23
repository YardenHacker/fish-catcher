import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export function WelcomeGate({ onSkip }: { onSkip: () => void }) {
  return (
    <ThemedView style={styles.container}>
      <ScreenBackground source={require('@/assets/images/backgrounds/sites.jpg')} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.identity}>
            <ThemedText type="title">🎣 Fish Catcher</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Your dive companion across the Red Sea and Israel's Mediterranean coast. Sign in so your
              found species, photos, and site ratings follow you across devices.
            </ThemedText>
          </View>

          <SignInForm />

          <Pressable style={styles.skipButton} onPress={onSkip}>
            <ThemedText type="link" themeColor="textSecondary">
              Continue without an account
            </ThemedText>
          </Pressable>
          <ThemedText type="small" themeColor="textSecondary" style={styles.skipHint}>
            No signal at the dive site? You can browse and track finds locally, then sign in later from the
            Profile tab to sync everything.
          </ThemedText>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  identity: {
    gap: Spacing.two,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: Spacing.two,
  },
  skipHint: {
    textAlign: 'center',
  },
});
