import { useState } from 'react';
import { Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthProvider';

export function SignInForm() {
  const { signIn, signUp } = useAuth();
  const theme = useTheme();

  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function handleSubmit() {
    if (!email.trim() || !password) return;
    setIsBusy(true);
    setMessage(null);
    const { error } = await (mode === 'signIn' ? signIn(email.trim(), password) : signUp(email.trim(), password));
    setIsBusy(false);
    if (error) setMessage(error);
  }

  const inputStyle = [
    styles.input,
    { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <ThemedText type="default">
        {mode === 'signIn'
          ? 'Sign in to sync your finds, photos, and ratings across devices.'
          : 'Create an account to sync your finds, photos, and ratings across devices.'}
      </ThemedText>

      <TextInput
        style={inputStyle}
        placeholder="you@example.com"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={inputStyle}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
      />

      <Pressable style={[styles.primaryButton, { backgroundColor: theme.accent }]} onPress={handleSubmit} disabled={isBusy}>
        <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
          {isBusy ? 'Please wait…' : mode === 'signIn' ? 'Sign in' : 'Create account'}
        </ThemedText>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}>
        <ThemedText type="link" themeColor="textSecondary">
          {mode === 'signIn' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </ThemedText>
      </Pressable>

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
