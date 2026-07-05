import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useFinds, useSpeciesList, useUserPhotos, RARITY_TIER_COLOR, RARITY_TIER_ORDER } from '@/lib/data';
import type { RarityTier, Species } from '@/lib/data';

type FoundSpecies = Species & { firstFoundAt: string };

export default function CollectionScreen() {
  const { data: species, isLoading: speciesLoading } = useSpeciesList();
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

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <ThemedText type="title">My Collection</ThemedText>

          {isLoading ? (
            <ThemedText type="default" themeColor="textSecondary" style={styles.loading}>
              Loading your collection...
            </ThemedText>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.statsCard}>
                <ThemedText type="subtitle">
                  Found {found.length}/{totalCount}
                </ThemedText>
                <ThemedText type="default" themeColor="textSecondary">
                  Collection score: {collectionScore}
                </ThemedText>

                <View style={styles.tierRow}>
                  {RARITY_TIER_ORDER.map((tier) => (
                    <View key={tier} style={styles.tierChip}>
                      <View style={[styles.tierDot, { backgroundColor: RARITY_TIER_COLOR[tier] }]} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {tier} {tierCounts[tier]}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ThemedView>

              {found.length === 0 ? (
                <ThemedView type="backgroundElement" style={styles.emptyState}>
                  <ThemedText type="default" themeColor="textSecondary" style={styles.emptyText}>
                    No finds yet — head to the Dex and start exploring the reefs of Sharm el Sheikh!
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
  const { data: userPhotos } = useUserPhotos({ speciesId: species.id });
  const tierColor = RARITY_TIER_COLOR[species.rarityTier];
  // Prefer your own uploaded photo of it; fall back to the catalog photo,
  // then a rarity-tinted placeholder -- this is a photo album, not a text list.
  const displayPhotoUri = userPhotos?.[0]?.uri ?? species.photoUrl;

  return (
    <Link href={`/creature/${species.slug}`} asChild>
      <Pressable>
        <ThemedView type="backgroundElement" style={styles.row}>
          <View style={[styles.thumbnailWrap, { backgroundColor: `${tierColor}33` }]}>
            {displayPhotoUri ? (
              <Image source={{ uri: displayPhotoUri }} style={styles.thumbnail} contentFit="cover" />
            ) : (
              <ThemedText style={[styles.thumbnailGlyph, { color: tierColor }]}>
                {species.commonName.charAt(0).toUpperCase()}
              </ThemedText>
            )}
          </View>
          <View style={styles.rowMain}>
            <View style={[styles.tierDot, { backgroundColor: tierColor }]} />
            <View style={styles.rowText}>
              <ThemedText type="smallBold">{species.commonName}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {species.rarityTier}
              </ThemedText>
            </View>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
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
    borderRadius: Spacing.four,
    padding: Spacing.three,
    gap: Spacing.one,
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
    borderRadius: Spacing.four,
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
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  thumbnailWrap: {
    width: 56,
    height: 56,
    borderRadius: Spacing.two,
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
