import { useState } from 'react';
import { Pressable, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.identity}>
            <ThemedText type="title">Fish Catcher</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Your dive companion for Sharm el Sheikh, Ras Mohammed & the Straits of Tiran.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Data & Sync</ThemedText>
            <SyncSection />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">About</ThemedText>
            <ThemedView type="backgroundElement" style={styles.aboutCard}>
              <ThemedText type="default" themeColor="textSecondary">
                Fish Catcher catalogs real marine species found around Sharm el Sheikh dive sites, including Ras
                Mohammed, the Straits of Tiran, and the local house reefs. Mark species as found as you spot
                them, upload your own photos to build a personal gallery, and rate and annotate the dive
                sites you explore.
              </ThemedText>
            </ThemedView>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function SyncSection() {
  const { isLoading, user, signOut } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <ThemedView type="backgroundElement" style={styles.statusRow}>
        <View style={[styles.statusDot, styles.statusDotOffline]} />
        <View style={styles.statusTextGroup}>
          <ThemedText type="default">Offline mode</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Using on-device data. Your finds, photos, and ratings are saved on this device.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoading) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Checking sign-in status…
      </ThemedText>
    );
  }

  if (user) {
    return (
      <View style={{ gap: Spacing.two }}>
        <ThemedView type="backgroundElement" style={styles.statusRow}>
          <View style={[styles.statusDot, styles.statusDotOnline]} />
          <View style={styles.statusTextGroup}>
            <ThemedText type="default">Synced as {user.email}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your finds, photos, and ratings are backed up to the cloud and follow you across devices.
            </ThemedText>
          </View>
        </ThemedView>
        <Pressable style={styles.secondaryButton} onPress={() => signOut()}>
          <ThemedText type="smallBold">Sign out</ThemedText>
        </Pressable>
      </View>
    );
  }

  return <SignInForm />;
}

function SignInForm() {
  const { requestOtp, verifyOtp } = useAuth();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSendCode() {
    if (!email.trim()) return;
    setIsBusy(true);
    setMessage(null);
    const { error } = await requestOtp(email.trim());
    setIsBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    setStep('code');
    setMessage(`Check ${email.trim()} for a 6-digit code.`);
  }

  async function handleVerifyCode() {
    if (!code.trim()) return;
    setIsBusy(true);
    setMessage(null);
    const { error } = await verifyOtp(email.trim(), code.trim());
    setIsBusy(false);
    if (error) setMessage(error);
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.signInCard}>
      <ThemedText type="default">Sign in to sync your finds, photos, and ratings across devices.</ThemedText>

      {step === 'email' ? (
        <>
          <TextInput
            style={inputStyle}
            placeholder="you@example.com"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Pressable style={styles.primaryButton} onPress={handleSendCode} disabled={isBusy}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {isBusy ? 'Sending…' : 'Send code'}
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <TextInput
            style={inputStyle}
            placeholder="6-digit code"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            value={code}
            onChangeText={setCode}
          />
          <Pressable style={styles.primaryButton} onPress={handleVerifyCode} disabled={isBusy}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              {isBusy ? 'Verifying…' : 'Verify & sign in'}
            </ThemedText>
          </Pressable>
          <Pressable onPress={() => setStep('email')}>
            <ThemedText type="link" themeColor="textSecondary">
              Use a different email
            </ThemedText>
          </Pressable>
        </>
      )}

      {message && (
        <ThemedText type="small" themeColor="textSecondary">
          {message}
        </ThemedText>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.five,
  },
  identity: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.one,
  },
  statusDotOnline: {
    backgroundColor: '#2E9E5B',
  },
  statusDotOffline: {
    backgroundColor: '#2E7DD1',
  },
  statusTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  aboutCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  signInCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  input: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.two,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#2E7DD1',
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
  },
  secondaryButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
