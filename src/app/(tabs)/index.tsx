import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CornerFrame } from '@/components/corner-frame';
import { RarityTag } from '@/components/rarity-tag';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RARITY_TIER_COLOR, RARITY_TIER_ORDER, Species, useFinds, useSpeciesList } from '@/lib/data';

const ALL = 'All';

function ProgressReadout({ found, total }: { found: number; total: number }) {
  const theme = useTheme();
  const pct = total > 0 ? Math.min(1, found / total) : 0;

  return (
    <View style={styles.progressWrap}>
      <ThemedText type="mono" themeColor="textSecondary">
        {String(found).padStart(2, '0')}/{String(total).padStart(2, '0')} FOUND
      </ThemedText>
      <View style={[styles.progressTrack, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: theme.accent }]} />
      </View>
    </View>
  );
}

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.border,
        },
      ]}>
      <ThemedText type="mono" themeColor={selected ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function CreatureCard({ species, found }: { species: Species; found: boolean }) {
  const theme = useTheme();
  const tierColor = RARITY_TIER_COLOR[species.rarityTier];

  return (
    <Link href={`/creature/${species.slug}`} asChild>
      <Pressable style={styles.cardWrapper}>
        <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
          <View style={[styles.photoArea, { backgroundColor: theme.backgroundSelected }]}>
            {species.photoUrl ? (
              // The grayscale/darken filter is applied on a wrapping View (not
              // the expo-image style prop, which doesn't type `filter`) --
              // RN's `filter` style affects the rendered subtree the same way
              // a CSS `filter` on a parent element would.
              <View style={[styles.photo, !found && styles.lockedPhoto]}>
                <Image source={{ uri: species.photoUrl }} style={styles.photo} contentFit="cover" />
              </View>
            ) : (
              <ThemedText type="title" style={[styles.placeholderGlyph, { color: found ? tierColor : theme.textSecondary }]}>
                {found ? species.commonName.charAt(0).toUpperCase() : '?'}
              </ThemedText>
            )}
            <CornerFrame color={found ? tierColor : theme.border} />
            {found ? (
              <View style={[styles.foundBadge, { backgroundColor: tierColor }]}>
                <Ionicons name="checkmark" size={12} color={theme.accentContrast} />
              </View>
            ) : (
              <View style={styles.lockOverlay}>
                <View style={styles.lockBadge}>
                  <Ionicons name="lock-closed" size={20} color="#C7D3D9" />
                </View>
              </View>
            )}
            <View style={styles.rarityBadgeWrap}>
              <RarityTag label={found ? species.rarityTier : '???'} color={tierColor} muted={!found} />
            </View>
          </View>
          <ThemedText type="smallBold" numberOfLines={1} themeColor={found ? 'text' : 'textSecondary'}>
            {found ? species.commonName : '???'}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

export default function FishScreen() {
  const { data: species, isLoading } = useSpeciesList();
  const { data: finds } = useFinds();
  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [rarityFilter, setRarityFilter] = useState<string>(ALL);

  const foundIds = useMemo(() => new Set((finds ?? []).map((f) => f.speciesId)), [finds]);

  const groups = useMemo(() => {
    if (!species) return [];
    return Array.from(new Set(species.map((s) => s.group))).sort();
  }, [species]);

  const filtered = useMemo(() => {
    if (!species) return [];
    return species.filter((s) => {
      if (groupFilter !== ALL && s.group !== groupFilter) return false;
      if (rarityFilter !== ALL && s.rarityTier !== rarityFilter) return false;
      return true;
    });
  }, [species, groupFilter, rarityFilter]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="title">Fish</ThemedText>
          <ProgressReadout found={foundIds.size} total={species?.length ?? 0} />
        </View>

        {isLoading ? (
          <ThemedText type="small" themeColor="textSecondary">
            Loading…
          </ThemedText>
        ) : (
          <>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[ALL, ...groups]}
              keyExtractor={(item) => `group-${item}`}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => (
                <FilterChip label={item} selected={groupFilter === item} onPress={() => setGroupFilter(item)} />
              )}
              style={styles.chipList}
            />
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[ALL, ...RARITY_TIER_ORDER]}
              keyExtractor={(item) => `rarity-${item}`}
              contentContainerStyle={styles.chipRow}
              renderItem={({ item }) => (
                <FilterChip label={item} selected={rarityFilter === item} onPress={() => setRarityFilter(item)} />
              )}
              style={styles.chipList}
            />

            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              numColumns={2}
              columnWrapperStyle={styles.gridRow}
              contentContainerStyle={styles.gridContent}
              renderItem={({ item }) => <CreatureCard species={item} found={foundIds.has(item.id)} />}
              ListEmptyComponent={
                <ThemedText type="small" themeColor="textSecondary">
                  No creatures match these filters.
                </ThemedText>
              }
            />
          </>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three, gap: Spacing.two },
  header: { gap: Spacing.two, paddingTop: Spacing.two },
  progressWrap: { gap: Spacing.half },
  progressTrack: {
    height: 6,
    borderRadius: Radii.small,
    borderWidth: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: Radii.small,
  },
  chipList: { flexGrow: 0 },
  chipRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.small,
    borderWidth: 1,
  },
  gridContent: { paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.three },
  gridRow: { gap: Spacing.three },
  cardWrapper: { flex: 1 },
  card: { borderRadius: Radii.large, borderWidth: 1, padding: Spacing.two, gap: Spacing.one },
  photoArea: {
    aspectRatio: 1,
    borderRadius: Radii.medium,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  lockedPhoto: {
    // RN new-architecture `filter` style: same intent as CSS
    // `grayscale(0.85) brightness(0.4)` for not-yet-found species -- the real
    // photo stays visible, just desaturated and darkened.
    filter: [{ grayscale: 0.85 }, { brightness: 0.4 }],
  },
  placeholderGlyph: { fontSize: 40 },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockBadge: {
    width: 36,
    height: 36,
    borderRadius: Radii.medium,
    backgroundColor: 'rgba(16, 22, 28, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  foundBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    width: 20,
    height: 20,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rarityBadgeWrap: {
    position: 'absolute',
    bottom: Spacing.one,
    right: Spacing.one,
  },
});
