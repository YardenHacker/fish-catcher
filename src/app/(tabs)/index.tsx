import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RARITY_TIER_COLOR, RARITY_TIER_ORDER, Species, useFinds, useSpeciesList } from '@/lib/data';

const ALL = 'All';

function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement },
      ]}>
      <ThemedText type="small" themeColor={selected ? 'text' : 'textSecondary'}>
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
        <ThemedView type="backgroundElement" style={styles.card}>
          <View style={[styles.photoArea, { backgroundColor: found ? `${tierColor}33` : theme.backgroundSelected }]}>
            {species.photoUrl ? (
              <Image source={{ uri: species.photoUrl }} style={styles.photo} contentFit="cover" />
            ) : (
              <ThemedText type="title" style={[styles.placeholderGlyph, { color: found ? tierColor : theme.textSecondary }]}>
                {found ? species.commonName.charAt(0).toUpperCase() : '?'}
              </ThemedText>
            )}
            {!found && (
              <View style={styles.lockOverlay}>
                <ThemedText style={styles.lockGlyph}>🔒</ThemedText>
              </View>
            )}
            <View style={[styles.rarityBadge, { backgroundColor: found ? tierColor : theme.textSecondary }]}>
              <ThemedText type="small" style={styles.rarityBadgeText}>
                {found ? species.rarityTier : '???'}
              </ThemedText>
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

export default function DexScreen() {
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
          <ThemedText type="title">Dex</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {foundIds.size}/{species?.length ?? 0} found
          </ThemedText>
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
  header: { gap: Spacing.half, paddingTop: Spacing.two },
  chipList: { flexGrow: 0 },
  chipRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  gridContent: { paddingBottom: BottomTabInset + Spacing.three, gap: Spacing.three },
  gridRow: { gap: Spacing.three },
  cardWrapper: { flex: 1 },
  card: { borderRadius: Spacing.three, padding: Spacing.two, gap: Spacing.one },
  photoArea: {
    aspectRatio: 1,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  placeholderGlyph: { fontSize: 40 },
  lockOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockGlyph: { fontSize: 28 },
  rarityBadge: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.four,
  },
  rarityBadgeText: { color: '#ffffff' },
});
