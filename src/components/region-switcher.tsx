import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRegions } from '@/lib/data';
import { useActiveRegion, useSetActiveRegion } from '@/lib/region-context';

/**
 * Segmented pill control listing every region, highlighting the active one.
 * Renders on the four screens whose data is region-scoped (Fish, Sites, Map,
 * Collection). With a single region (today's reality until Eilat data lands)
 * it still renders -- just as one non-interactive-looking pill -- rather than
 * hiding entirely, so the control doesn't pop in/out of the layout the moment
 * a second region is added.
 */
export function RegionSwitcher() {
  const theme = useTheme();
  const { data: regions, isLoading } = useRegions();
  const activeRegion = useActiveRegion();
  const setActiveRegion = useSetActiveRegion();

  if (isLoading || !regions || regions.length === 0) return null;

  const single = regions.length === 1;

  return (
    <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      {regions.map((region) => {
        const selected = activeRegion?.id === region.id;
        return (
          <Pressable
            key={region.id}
            disabled={single}
            onPress={() => setActiveRegion(region.id)}
            style={[
              styles.pill,
              {
                backgroundColor: selected ? theme.accent : 'transparent',
                borderColor: selected ? theme.accent : theme.border,
              },
            ]}>
            <ThemedText type="mono" style={{ color: selected ? theme.accentContrast : theme.textSecondary }}>
              {region.name.toUpperCase()}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.medium,
    borderWidth: 1,
  },
});
