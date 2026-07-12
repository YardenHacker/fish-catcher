import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CornerFrame } from '@/components/corner-frame';
import { RarityTag } from '@/components/rarity-tag';
import { RegionSwitcher } from '@/components/region-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFinds, useSpeciesForRegion, useUserPhotos, RARITY_TIER_COLOR, RARITY_TIER_ORDER } from '@/lib/data';
import type { RarityTier, Species } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

type FoundSpecies = Species & { firstFoundAt: string };

export default function CollectionScreen() {
  const theme = useTheme();
  const activeRegion = useActiveRegion();
  const { data: species, isLoading: speciesLoading } = useSpeciesForRegion(activeRegion?.slug);
  const { data: finds, isLoading: findsLoading } = useFinds();

  const isLoading = speciesLoading || findsLoading;

  const found: FoundSpecies[] = useMemo(() => {
    if (!species || !finds) return [];
    const speciesById = new Map(species.map((s) => [s.id, s]));
    const rows: FoundSpecies[] = [];
    for (const find of finds) {
      const match = speciesById.get(find.speciesId);
      if (match) {
        rows.push({ ...match, firstFoundAt: find.firstFoundAt });
      }
    }
    return rows.sort((a, b) => new Date(b.firstFoundAt).getTime() - new Date(a.firstFoundAt).getTime());
  }, [species, finds]);

  const collectionScore = useMemo(() => found.reduce((sum, s) => sum + s.rarityScore, 0), [found]);

  const tierCounts = useMemo(() => {
    const counts: Record<RarityTier, number> = {
      Common: 0,
      Uncommon: 0,
      Rare: 0,
      Epic: 0,
      Legendary: 0,
    };
    for (const s of found) {
      counts[s.rarityTier] += 1;
    }
    return counts;
  }, [found]);

  const totalCount = species?.length ?? 0;
  const pct = totalCount > 0 ? Math.min(1, found.length / totalCount) : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title">My Collection</ThemedText>
          <RegionSwitcher />

          {isLoading ? (
            <ThemedText type="default" themeColor="textSecondary" style={styles.loading}>
              Loading your collection...
            </ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={[styles.statsCard, { borderColor: theme.border }]}>
                <View style={styles.statsHeaderRow}>
                  <ThemedText type="mono" themeColor="textSecondary">
                    FOUND {String(found.length).padStart(2, '0')}/{String(totalCount).padStart(2, '0')}
                  </ThemedText>
                  <ThemedText type="mono" themeColor="textSecondary">
                    SCORE {collectionScore}
                  </ThemedText>
                </View>
                <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected, borderColor: theme.border }]}>
                  <View style={[styles.progressFill, { width: `${pct * 100}%`, backgroundColor: theme.accent }]} />
                </View>

                <View style={styles.tierRow}>
                  {RARITY_TIER_ORDER.map((tier) => (
                    <View key={tier} style={styles.tierChip}>
                      <View style={[styles.tierDot, { backgroundColor: RARITY_TIER_COLOR[tier] }]} />
                      <ThemedText type="mono" themeColor="textSecondary">
                        {tier.toUpperCase()} {tierCounts[tier]}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>

              {found.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyState}>
                  <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                    No finds yet — head to the Fish tab and start exploring the reefs of{' '}
                    {activeRegion?.name ?? 'this region'}!
                  </ThemedText>
                </ThemedView>
              ) : (
                <FlatList
                  data={found}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={styles.listContent}
                  renderItem={({ item }) => <FoundRow species={item} />}
                />
              )}
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function FoundRow({ species }: { species: FoundSpecies }) {
  const theme = useTheme();
  const { data: userPhotos } = useUserPhotos({ speciesId: species.id });
  const tierColor = RARITY_TIER_COLOR[species.rarityTier];
  // Prefer your own uploaded photo of it; fall back to the catalog photo,
  // then a rarity-tinted placeholder -- this is a photo album, not a text list.
  const displayPhotoUri = userPhotos?.[0]?.uri ?? species.photoUrl;

  return (
    <Link href={`/creature/${species.slug}`} asChild>
      <Pressable>
        <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
          <View style={[styles.thumbnailWrap, { backgroundColor: theme.backgroundSelected }]}>
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <ThemedText style={[styles.thumbnailGlyph, { color: tierColor }]}>
                {species.commonName.charAt(0).toUpperCase()}
              </ThemedText>
            )}
            <CornerFrame color={tierColor} />
            <View style={[styles.foundBadge, { backgroundColor: tierColor }]}>
              <Ionicons name="checkmark" size={10} color={theme.accentContrast} />
            </View>
          </View>
          <View style={styles.rowMain}>
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{species.commonName}</ThemedText>
              <RarityTag label={species.rarityTier} color={tierColor} />
            </View>
          </View>
          <ThemedText type="mono" themeColor="textSecondary">
            {new Date(species.firstFoundAt).toLocaleDateString()}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  loading: { paddingTop: Spacing.three },
  statsCard: {
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  statsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
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
  tierRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  tierChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  tierDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  emptyState: {
    borderRadius: Radii.large,
    padding: Spacing.four,
  },
  emptyText: {
    textAlign: 'center',
  },
  listContent: {
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
  },
  thumbnailWrap: {
    width: 56,
    height: 56,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailGlyph: {
    fontSize: 28,
    fontWeight: '600',
  },
  foundBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowMain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexShrink: 1,
    flexGrow: 1,
  },
  rowText: {
    gap: Spacing.half,
    flexShrink: 1,
  },
});
