import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExternalLink } from '@/components/external-link';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RARITY_TIER_COLOR,
  useAddUserPhoto,
  useSetSightingCount,
  useSightingsForSpecies,
  useSitesForSpecies,
  useSpecies,
  useUserPhotos,
} from '@/lib/data';
import type { DiveSite, Sighting } from '@/lib/data/types';

function SightingRow({
  site,
  count,
  onChange,
}: {
  site: DiveSite;
  count: number;
  onChange: (next: number) => void;
}) {
  const theme = useTheme();
  const isLogged = count > 0;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.sightingRow,
        isLogged && {
          backgroundColor: theme.backgroundSelected,
          borderColor: theme.accent,
          borderWidth: 1,
        },
      ]}>
      <ThemedText type="default" style={styles.sightingSiteName}>
        {site.name}
      </ThemedText>
      <View style={styles.stepper}>
        <Pressable
          onPress={() => onChange(Math.max(0, count - 1))}
          disabled={count <= 0}
          style={[styles.stepperButton, { backgroundColor: theme.accent, opacity: count <= 0 ? 0.4 : 1 }]}>
          <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
            −
          </ThemedText>
        </Pressable>
        <ThemedText type="smallBold" style={styles.stepperCount}>
          {count}
        </ThemedText>
        <Pressable
          onPress={() => onChange(count + 1)}
          style={[styles.stepperButton, { backgroundColor: theme.accent }]}>
          <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
            +
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="smallBold">{value}</ThemedText>
    </View>
  );
}

export default function CreatureDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();

  const { data: species, isLoading } = useSpecies(slug);
  const { data: sites } = useSitesForSpecies(slug);
  const { data: userPhotos } = useUserPhotos({ speciesId: species?.id });
  const { data: sightings } = useSightingsForSpecies(species?.id);
  const setSightingCount = useSetSightingCount();
  const addUserPhoto = useAddUserPhoto();
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);

  const sightingsBySite = useMemo(() => {
    const map = new Map<string, Sighting>();
    for (const s of sightings ?? []) map.set(s.siteId, s);
    return map;
  }, [sightings]);

  const totalSeen = useMemo(
    () => (sightings ?? []).reduce((sum, s) => sum + s.count, 0),
    [sightings],
  );

  async function handleAddPhoto() {
    if (!species) return;
    setPickerMessage(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPickerMessage('Photo library permission was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addUserPhoto.mutate({ speciesId: species.id, uri: result.assets[0].uri });
    }
  }

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="small" themeColor="textSecondary">
            Loading…
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!species) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedText type="title">Not found</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            This creature doesn&apos;t exist in the Dex.
          </ThemedText>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const tierColor = RARITY_TIER_COLOR[species.rarityTier];

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { backgroundColor: `${tierColor}33` }]}>
            {species.photoUrl ? (
              <Image source={{ uri: species.photoUrl }} style={styles.heroPhoto} contentFit="cover" />
            ) : (
              <ThemedText style={[styles.heroGlyph, { color: tierColor }]}>
                {species.commonName.charAt(0).toUpperCase()}
              </ThemedText>
            )}
            <View style={[styles.rarityBadge, { backgroundColor: tierColor }]}>
              <ThemedText type="small" style={styles.rarityBadgeText}>
                {species.rarityTier}
              </ThemedText>
            </View>
          </View>

          <View style={styles.titleBlock}>
            <ThemedText type="title">{species.commonName}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.scientificName}>
              {species.scientificName}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={styles.statsBlock}>
            <StatRow label="Rarity score" value={`${species.rarityScore}/100`} />
            <StatRow label="IUCN status" value={species.iucnStatus} />
            <StatRow label="Habitat" value={species.habitat} />
            <StatRow label="Max size" value={`${species.maxSizeCm} cm`} />
            <StatRow label="Depth range" value={species.depthRange} />
          </ThemedView>

          <ThemedText type="default">{species.description}</ThemedText>

          <View style={styles.section}>
            <ThemedView type="backgroundElement" style={styles.totalSeenBlock}>
              {totalSeen > 0 ? (
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Total seen: {totalSeen}
                </ThemedText>
              ) : (
                <ThemedText type="small" themeColor="textSecondary">
                  Not seen yet — log a sighting below
                </ThemedText>
              )}
            </ThemedView>

            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Seen at
            </ThemedText>
            {sites && sites.length > 0 ? (
              <View style={styles.siteList}>
                {sites.map((site) => (
                  <SightingRow
                    key={site.id}
                    site={site}
                    count={sightingsBySite.get(site.id)?.count ?? 0}
                    onChange={(next) =>
                      setSightingCount.mutate({ speciesId: species.id, siteId: site.id, count: next })
                    }
                  />
                ))}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No known sites yet.
              </ThemedText>
            )}
          </View>

          {species.photoCredit && (
            <View style={styles.attribution}>
              <ThemedText type="small" themeColor="textSecondary">
                Photo:{' '}
                {species.photoSourceUrl ? (
                  <ExternalLink href={species.photoSourceUrl as `${string}:${string}`}>
                    <ThemedText type="linkPrimary">{species.photoCredit}</ThemedText>
                  </ExternalLink>
                ) : (
                  species.photoCredit
                )}
                {species.photoLicense ? ` (${species.photoLicense})` : ''}
              </ThemedText>
            </View>
          )}

          <View style={styles.section}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Your photos
            </ThemedText>
            {userPhotos && userPhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photoRow}>
                  {userPhotos.map((photo) => (
                    <Image key={photo.id} source={{ uri: photo.uri }} style={styles.thumbnail} contentFit="cover" />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No photos yet.
              </ThemedText>
            )}
            <Pressable
              onPress={handleAddPhoto}
              style={[styles.addPhotoButton, { borderColor: theme.textSecondary }]}>
              <ThemedText type="smallBold">Add your photo</ThemedText>
            </Pressable>
            {pickerMessage && (
              <ThemedText type="small" themeColor="textSecondary">
                {pickerMessage}
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%', maxWidth: MaxContentWidth, paddingHorizontal: Spacing.three },
  scrollContent: { gap: Spacing.three, paddingBottom: BottomTabInset + Spacing.four },
  hero: {
    aspectRatio: 16 / 10,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  heroPhoto: { width: '100%', height: '100%' },
  heroGlyph: { fontSize: 96, fontWeight: '600' },
  rarityBadge: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.four,
  },
  rarityBadgeText: { color: '#ffffff' },
  titleBlock: { gap: Spacing.half },
  scientificName: { fontStyle: 'italic', fontSize: 18, lineHeight: 24 },
  statsBlock: { borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 20, lineHeight: 26 },
  siteList: { gap: Spacing.two },
  attribution: {},
  totalSeenBlock: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    alignItems: 'center',
  },
  sightingRow: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sightingSiteName: { flex: 1 },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperCount: { minWidth: 24, textAlign: 'center' },
  photoRow: { flexDirection: 'row', gap: Spacing.two },
  thumbnail: { width: 100, height: 100, borderRadius: Spacing.two },
  addPhotoButton: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
