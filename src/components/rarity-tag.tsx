import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';

/**
 * HUD-style rarity readout: a small monospace bracketed tag like `[RARE]`
 * rendered on a high-contrast chip, replacing the previous soft rounded pill
 * badge. The tier-to-hue mapping itself is unchanged (see
 * `RARITY_TIER_COLOR` in `src/lib/data/rarity.ts`) -- only the presentation
 * changes here.
 */
export function RarityTag({
  label,
  color,
  muted,
}: {
  /** Tag text without brackets, e.g. "RARE" or "???". */
  label: string;
  color: string;
  /** Locked/not-found state: dimmer chip, no glow. */
  muted?: boolean;
}) {
  return (
    <View
      style={[
        styles.chip,
        {
          backgroundColor: muted ? 'rgba(20, 26, 31, 0.55)' : `${color}26`,
          borderColor: muted ? 'rgba(255,255,255,0.25)' : color,
        },
      ]}>
      <ThemedText type="monoBold" style={[styles.text, { color: muted ? '#C7D3D9' : color }]}>
        [{label.toUpperCase()}]
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderRadius: Radii.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
