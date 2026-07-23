import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View, useColorScheme } from 'react-native';

/**
 * Full-bleed underwater background photo behind a screen's content. The
 * photos are all deep-navy/moody by design (matching the dive-computer HUD
 * look), so the two themes need very different scrims on top:
 *  - dark mode: a dark translucent scrim -- the photo mostly shows through,
 *    matching the theme's own near-black background.
 *  - light mode: a light translucent scrim (the theme's own light
 *    background color, at high opacity) -- the photo shows through only
 *    faintly, as a tinted watermark, so it stays light enough for the
 *    theme's dark text to read clearly on top.
 */
export function ScreenBackground({ source }: { source: ImageSource }) {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={source} style={StyleSheet.absoluteFill} contentFit="cover" />
      <View style={[styles.scrim, { backgroundColor: isDark ? 'rgba(16, 22, 28, 0.55)' : 'rgba(238, 242, 244, 0.8)' }]} />
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
  },
});
