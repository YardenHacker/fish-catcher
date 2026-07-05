import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/**
 * A single summary row that expands into arbitrary content on tap -- used to
 * keep long option lists (13 sites, 45 species) out of the way until wanted,
 * instead of always rendering every row.
 */
export function CollapsiblePicker({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <ThemedView type="backgroundElement" style={styles.container}>
      <Pressable onPress={() => setOpen((v) => !v)} style={styles.header}>
        <ThemedText type="default" style={styles.summary}>
          {summary}
        </ThemedText>
        <ThemedText type="default" themeColor="textSecondary">
          {open ? '▾' : '▸'}
        </ThemedText>
      </Pressable>
      {open && <View style={styles.body}>{children}</View>}
    </ThemedView>
  );
}

/**
 * One row with a trailing check circle. Only the circle itself toggles --
 * `children` is a plain slot so callers can put their own Pressable/Link in
 * it (e.g. to navigate) without nesting touchables inside a row-wide tap
 * target, which would make one swallow the other's taps. Callers that don't
 * need a competing tap target (e.g. a plain site name) can just wrap their
 * own children in a Pressable that also calls onToggle for a bigger hit area.
 */
export function ToggleRow({
  checked,
  onToggle,
  leading,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  leading?: React.ReactNode;
  children: React.ReactNode;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.row, checked && { backgroundColor: theme.backgroundSelected }]}>
      {leading}
      <View style={styles.rowContent}>{children}</View>
      <Pressable
        onPress={onToggle}
        hitSlop={Spacing.two}
        style={[
          styles.checkCircle,
          checked
            ? { backgroundColor: theme.accent }
            : { borderWidth: 1.5, borderColor: theme.textSecondary },
        ]}>
        {checked && (
          <ThemedText type="small" style={{ color: theme.accentContrast }}>
            ✓
          </ThemedText>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.three,
  },
  summary: { flex: 1 },
  body: { paddingBottom: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  rowContent: { flex: 1 },
  checkCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
