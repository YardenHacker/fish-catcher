import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useActiveRegion } from '@/lib/region-context';

import { ThemedText } from './themed-text';

/**
 * Read-only "you're viewing X" indicator -- replaces the old inline
 * RegionSwitcher pills. Switching areas now only happens on the dedicated
 * Area tab, so every other region-scoped screen needs some way to show
 * which area is currently active; tapping this jumps straight to that tab.
 */
export function AreaBadge() {
  const theme = useTheme();
  const activeRegion = useActiveRegion();

  if (!activeRegion) return null;

  return (
    <Link href="/area" asChild>
      <Pressable
        style={StyleSheet.flatten([styles.badge, { borderColor: theme.border, backgroundColor: theme.backgroundElement }])}>
        <Ionicons name="earth-outline" size={14} color={theme.textSecondary} />
        <ThemedText type="mono" themeColor="textSecondary">
          {activeRegion.name.toUpperCase()}
        </ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    borderRadius: Radii.large,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
});
