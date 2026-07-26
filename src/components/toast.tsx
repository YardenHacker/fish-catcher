import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

const VISIBLE_MS = 2200;
const FADE_MS = 200;

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * App-wide "Saved" / "Marked as seen" style confirmation banner -- a small
 * bottom-anchored toast, not a native Alert (RN Web doesn't show those
 * reliably, and a toast doesn't block interaction the way an alert would).
 * Wrap the app once near the root; any screen calls useToast().showToast(...).
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string) => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      setMessage(text);
      Animated.timing(opacity, { toValue: 1, duration: FADE_MS, useNativeDriver: true }).start();
      hideTimer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: FADE_MS, useNativeDriver: true }).start(() => setMessage(null));
      }, VISIBLE_MS);
    },
    [opacity],
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.toast,
            { backgroundColor: theme.accent, opacity },
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
            {message}
          </ThemedText>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    left: Spacing.four,
    right: Spacing.four,
    bottom: 90,
    borderRadius: Radii.large,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    alignItems: 'center',
    zIndex: 1000,
  },
});
