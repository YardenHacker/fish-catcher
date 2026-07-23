import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View, useColorScheme } from 'react-native';

/**
 * Full-bleed underwater background photo behind a screen's content, with a
 * dark scrim on top so cards/text stay legible. Dark-mode only: the photos
 * are all deep-navy/moody by design (matching the dive-computer HUD look),
 * which would clash with light mode's inverted (light background/dark text)
 * expectation -- light mode falls back to ThemedView's plain flat color.
 */
export function ScreenBackground({ source }: { source: ImageSource }) {
  const scheme = useColorScheme();
  if (scheme !== 'dark') return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={styles.scrim} />
    </View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(16, 22, 28, 0.55)',
  },
});
