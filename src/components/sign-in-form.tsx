import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthProvider';

export function SignInForm() {
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
    <ThemedView type="backgroundElement" style={styles.card}>
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
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleSendCode}
            disabled={isBusy}>
            <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
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
          <Pressable
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleVerifyCode}
            disabled={isBusy}>
            <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
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
  card: {
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
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
});
