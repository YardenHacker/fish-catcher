import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsiblePicker, ToggleRow } from '@/components/collapsible-picker';
import { CornerFrame } from '@/components/corner-frame';
import { ExternalLink } from '@/components/external-link';
import { RarityTag } from '@/components/rarity-tag';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { UserMediaThumbnail } from '@/components/user-media-thumbnail';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RARITY_TIER_COLOR,
  useAddUserPhoto,
  useMarkAllSightingsForSites,
  useSetSightingCount,
  useSightingsForSpecies,
  useSitesForRegion,
  useSitesForSpecies,
  useSpecies,
  useUserPhotos,
} from '@/lib/data';
import type { DiveSite, RarityTier, Sighting } from '@/lib/data/types';
import { useActiveRegion } from '@/lib/region-context';

const CHANCE_TO_SEE_LABEL: Record<RarityTier, string> = {
  Common: 'Very likely',
  Uncommon: 'Likely',
  Rare: 'Possible',
  Epic: 'Unlikely',
  Legendary: 'Rare, lucky encounter',
};

function AreaGroup({
  area,
  sites,
  sightingsBySite,
  onToggleSite,
  onAddPhotoForSite,
  onMarkAllSeen,
  isMarkingAll,
}: {
  area: string;
  sites: DiveSite[];
  sightingsBySite: Map<string, Sighting>;
  onToggleSite: (siteId: string, checked: boolean) => void;
  onAddPhotoForSite: (siteId: string) => void;
  onMarkAllSeen: () => void;
  isMarkingAll: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={styles.areaGroup}>
      <View style={styles.areaHeader}>
        <ThemedText type="smallBold">{area}</ThemedText>
        <Pressable
          onPress={onMarkAllSeen}
          disabled={isMarkingAll}
          style={[
            styles.markAllButton,
            { backgroundColor: theme.accent, opacity: isMarkingAll ? 0.5 : 1 },
          ]}>
          <ThemedText type="small" style={{ color: theme.accentContrast }}>
            Mark all seen in {area}
          </ThemedText>
        </Pressable>
      </View>
      <View>
        {sites.map((site) => {
          const checked = (sightingsBySite.get(site.id)?.count ?? 0) > 0;
          return (
            <View key={site.id}>
              <ToggleRow checked={checked} onToggle={() => onToggleSite(site.id, !checked)}>
                <ThemedText type="default">{site.name}</ThemedText>
              </ToggleRow>
              {checked && (
                <Pressable onPress={() => onAddPhotoForSite(site.id)} style={styles.inlineAddPhoto}>
                  <ThemedText type="small" themeColor="accent">
                    + Add photo/video from {site.name}
                  </ThemedText>
                </Pressable>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="monoBold">{value}</ThemedText>
    </View>
  );
}

export default function CreatureDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const theme = useTheme();

  const activeRegion = useActiveRegion();
  const { data: species, isLoading } = useSpecies(slug);
  const { data: catalogSitesAllRegions } = useSitesForSpecies(slug);
  const { data: allSites } = useSitesForRegion(activeRegion?.slug);
  const { data: userPhotos } = useUserPhotos({ speciesId: species?.id });
  const { data: sightingsAllRegions } = useSightingsForSpecies(species?.id);
  const setSightingCount = useSetSightingCount();
  const addUserPhoto = useAddUserPhoto();
  const markAllSightingsForSites = useMarkAllSightingsForSites();
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);

  // A sighting is tied to a site_id, which carries region info via the site
  // it belongs to -- so "seen at"/"found" on this page must only count
  // sightings at sites within the currently active region, or a fish marked
  // seen in Eilat would incorrectly read as found while viewing Sharm.
  const regionSiteIds = useMemo(() => new Set((allSites ?? []).map((s) => s.id)), [allSites]);
  const sightings = useMemo(
    () => (sightingsAllRegions ?? []).filter((s) => regionSiteIds.has(s.siteId)),
    [sightingsAllRegions, regionSiteIds],
  );

  const sightingsBySite = useMemo(() => {
    const map = new Map<string, Sighting>();
    for (const s of sightings ?? []) map.set(s.siteId, s);
    return map;
  }, [sightings]);

  const totalSeen = useMemo(
    () => (sightings ?? []).reduce((sum, s) => sum + s.count, 0),
    [sightings],
  );

  // Every site in the active region is markable (a fish can turn up anywhere
  // within it), not just the curated catalog subset -- grouped by area purely
  // for scannability. A user can't mark a sighting at a site outside the
  // region they're currently viewing.
  const sitesByArea = useMemo(() => {
    const map = new Map<string, DiveSite[]>();
    for (const site of allSites ?? []) {
      const group = map.get(site.area);
      if (group) {
        group.push(site);
      } else {
        map.set(site.area, [site]);
      }
    }
    return Array.from(map.entries());
  }, [allSites]);

  // "Best sites" stays based on the curated, researched placements (most
  // notable site listed first), independent of the full markable site list
  // above -- but scoped to the active region, since a species documented in
  // multiple regions shouldn't surface another region's sites here.
  const catalogSites = useMemo(
    () => (catalogSitesAllRegions ?? []).filter((s) => s.regionId === activeRegion?.id),
    [catalogSitesAllRegions, activeRegion?.id],
  );
  const bestSites = useMemo(
    () => (catalogSites ?? []).slice(0, 2).map((s) => s.name).join(', ') || undefined,
    [catalogSites],
  );

  const siteNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const site of allSites ?? []) map.set(site.id, site.name);
    return map;
  }, [allSites]);

  const seenSiteCount = useMemo(
    () => new Set((sightings ?? []).filter((s) => s.count > 0).map((s) => s.siteId)).size,
    [sightings],
  );

  async function pickAndUploadPhoto(siteId?: string) {
    if (!species) return;
    setPickerMessage(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPickerMessage('Photo library permission was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images', 'videos'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const mediaType = asset.type === 'video' || asset.mimeType?.startsWith('video/') ? 'video' : 'photo';
      addUserPhoto.mutate({
        speciesId: species.id,
        siteId,
        uri: asset.uri,
        mediaType,
        mimeType: asset.mimeType,
        fileName: asset.fileName,
      });
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
            This creature doesn&apos;t exist in the Fish tab.
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
          <View style={[styles.hero, { backgroundColor: theme.backgroundSelected }]}>
            {species.photoUrl ? (
              <Image source={{ uri: species.photoUrl }} style={styles.heroPhoto} contentFit="cover" />
            ) : (
              <ThemedText style={[styles.heroGlyph, { color: tierColor }]}>
                {species.commonName.charAt(0).toUpperCase()}
              </ThemedText>
            )}
            <CornerFrame color={tierColor} />
            <View style={styles.rarityBadgeWrap}>
              <RarityTag label={species.rarityTier} color={tierColor} />
            </View>
          </View>

          <View style={styles.titleBlock}>
            <ThemedText type="title">{species.commonName}</ThemedText>
            <ThemedText type="subtitle" themeColor="textSecondary" style={styles.scientificName}>
              {species.scientificName}
            </ThemedText>
          </View>

          <ThemedView type="backgroundElement" style={[styles.statsBlock, { borderColor: theme.border }]}>
            <StatRow label="Rarity score" value={`${species.rarityScore}/100`} />
            <StatRow label="IUCN status" value={species.iucnStatus} />
            <StatRow label="Habitat" value={species.habitat} />
            <StatRow label="Max size" value={`${species.maxSizeCm} cm`} />
            <StatRow label="Depth range" value={species.depthRange} />
            <StatRow label="Chance to see" value={CHANCE_TO_SEE_LABEL[species.rarityTier]} />
            {species.bestSeason && <StatRow label="Best season" value={species.bestSeason} />}
            {bestSites && <StatRow label="Best sites" value={bestSites} />}
          </ThemedView>

          <ThemedText type="default">{species.description}</ThemedText>

          {species.populationInfo && (
            <View style={styles.populationBlock}>
              <ThemedText type="smallBold">Population</ThemedText>
              <ThemedText type="default">{species.populationInfo}</ThemedText>
            </View>
          )}

          <View style={styles.section}>
            <ThemedView type="backgroundElement" style={[styles.totalSeenBlock, { borderColor: theme.border }]}>
              {seenSiteCount > 0 ? (
                <ThemedText type="smallBold" style={{ color: theme.accent }}>
                  Seen at {seenSiteCount} {seenSiteCount === 1 ? 'site' : 'sites'}
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
            {sitesByArea.length > 0 ? (
              <CollapsiblePicker
                summary={
                  seenSiteCount > 0
                    ? `Seen at ${seenSiteCount} of ${allSites?.length ?? 0} sites`
                    : `Not seen anywhere yet — tap to log a sighting`
                }>
                {sitesByArea.map(([area, areaSites]) => (
                  <AreaGroup
                    key={area}
                    area={area}
                    sites={areaSites}
                    sightingsBySite={sightingsBySite}
                    onToggleSite={(siteId, checked) =>
                      setSightingCount.mutate({ speciesId: species.id, siteId, count: checked ? 1 : 0 })
                    }
                    onAddPhotoForSite={(siteId) => pickAndUploadPhoto(siteId)}
                    onMarkAllSeen={() =>
                      markAllSightingsForSites.mutate({
                        speciesId: species.id,
                        siteIds: areaSites.map((s) => s.id),
                      })
                    }
                    isMarkingAll={markAllSightingsForSites.isPending}
                  />
                ))}
              </CollapsiblePicker>
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
                    <View key={photo.id} style={styles.photoWithCaption}>
                      <UserMediaThumbnail photo={photo} style={styles.thumbnail} />
                      <ThemedText type="small" themeColor="textSecondary">
                        {photo.siteId ? (siteNameById.get(photo.siteId) ?? 'Dive site') : 'General'}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No photos yet.
              </ThemedText>
            )}
            <Pressable
              onPress={() => pickAndUploadPhoto()}
              style={[styles.addPhotoButton, { borderColor: theme.textSecondary }]}>
              <ThemedText type="smallBold">Add your photo or video</ThemedText>
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
    borderRadius: Radii.large,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginTop: Spacing.two,
  },
  heroPhoto: { width: '100%', height: '100%' },
  heroGlyph: { fontSize: 96, fontWeight: '600' },
  rarityBadgeWrap: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
  },
  titleBlock: { gap: Spacing.half },
  scientificName: { fontStyle: 'italic', fontSize: 18, lineHeight: 24 },
  statsBlock: { borderRadius: Radii.large, borderWidth: 1, padding: Spacing.three, gap: Spacing.two },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  section: { gap: Spacing.two },
  sectionTitle: { fontSize: 20, lineHeight: 26 },
  siteList: { gap: Spacing.three },
  attribution: {},
  totalSeenBlock: {
    borderRadius: Radii.medium,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
  },
  populationBlock: { gap: Spacing.one },
  areaGroup: { gap: Spacing.two },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  markAllButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.small,
  },
  inlineAddPhoto: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  photoRow: { flexDirection: 'row', gap: Spacing.two },
  photoWithCaption: { gap: Spacing.half, alignItems: 'center' },
  thumbnail: { width: 100, height: 100, borderRadius: Radii.medium },
  addPhotoButton: {
    borderRadius: Radii.medium,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'center',
    marginTop: Spacing.two,
  },
});
