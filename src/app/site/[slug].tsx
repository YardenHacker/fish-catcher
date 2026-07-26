import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CollapsiblePicker, ToggleRow } from '@/components/collapsible-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { UserMediaThumbnail } from '@/components/user-media-thumbnail';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RARITY_TIER_COLOR,
  useAddUserPhoto,
  usePublicRatingSummaries,
  usePublicReviewsForSite,
  useRateSite,
  useSetSightingCount,
  useSightingsForSite,
  useSite,
  useSiteRating,
  useSpeciesForSite,
  useUserPhotos,
} from '@/lib/data';
import type { PublicReview, Species } from '@/lib/data';

function Badge({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

/**
 * One row per species, always shown (not just already-logged ones) so this
 * doubles as both the "what have I seen here" view and the way to mark a new
 * sighting -- any fish can turn up at any site, not just a curated subset.
 * Photos are scoped to (species, this site) so the same fish spotted at a
 * different site can carry different photos.
 */
function SiteSpeciesRow({
  species,
  siteId,
  checked,
  onToggle,
  onAddPhoto,
}: {
  species: Species;
  siteId: string;
  checked: boolean;
  onToggle: () => void;
  onAddPhoto: () => void;
}) {
  const { data: photos } = useUserPhotos({
    speciesId: checked ? species.id : undefined,
    siteId: checked ? siteId : undefined,
  });

  return (
    <View style={styles.sightedSpeciesBlock}>
      <ToggleRow
        checked={checked}
        onToggle={onToggle}
        leading={<View style={[styles.rarityDot, { backgroundColor: RARITY_TIER_COLOR[species.rarityTier] }]} />}>
        <Link href={`/creature/${species.slug}`} asChild>
          <Pressable>
            <ThemedText type="default">{species.commonName}</ThemedText>
          </Pressable>
        </Link>
      </ToggleRow>
      {checked && (
        <>
          <Pressable onPress={onAddPhoto} style={styles.inlineAddPhoto}>
            <ThemedText type="small" themeColor="accent">
              + Add photo/video from here
            </ThemedText>
          </Pressable>
          {photos && photos.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {photos.map((photo) => (
                  <UserMediaThumbnail key={photo.id} photo={photo} style={styles.sightedThumbnail} />
                ))}
              </View>
            </ScrollView>
          )}
        </>
      )}
    </View>
  );
}

function StarRating({ rating, onChange }: { rating: number; onChange: (value: number) => void }) {
  const theme = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Pressable key={value} onPress={() => onChange(value)} hitSlop={Spacing.two}>
          <ThemedText style={[styles.star, { color: theme.text }]}>{value <= rating ? '★' : '☆'}</ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

function ReadOnlyStars({ rating }: { rating: number }) {
  const theme = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <ThemedText key={value} style={[styles.reviewStar, { color: theme.text }]}>
          {value <= rating ? '★' : '☆'}
        </ThemedText>
      ))}
    </View>
  );
}

function ReadOnlyVideoThumbnail({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={StyleSheet.absoluteFill} contentFit="cover" nativeControls />;
}

/** Someone else's photo/video -- no delete affordance, unlike UserMediaThumbnail (which is for your own media). */
function ReadOnlyMediaThumbnail({ photo }: { photo: PublicReview['photos'][number] }) {
  return (
    <View style={styles.reviewThumbnail}>
      {photo.mediaType === 'video' ? (
        <ReadOnlyVideoThumbnail uri={photo.uri} />
      ) : (
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
    </View>
  );
}

/** A public/private choice, shown wherever a review or photo/video is about to be saved (migration 0010: chosen per item, not one account-wide setting). */
function PublicPrivateToggle({ isPublic, onChange }: { isPublic: boolean; onChange: (value: boolean) => void }) {
  const theme = useTheme();
  return (
    <View style={[styles.visibilityRow, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
      <Pressable
        onPress={() => onChange(false)}
        style={[styles.visibilityPill, { backgroundColor: !isPublic ? theme.accent : 'transparent' }]}>
        <ThemedText type="small" style={{ color: !isPublic ? theme.accentContrast : theme.textSecondary }}>
          Private
        </ThemedText>
      </Pressable>
      <Pressable
        onPress={() => onChange(true)}
        style={[styles.visibilityPill, { backgroundColor: isPublic ? theme.accent : 'transparent' }]}>
        <ThemedText type="small" style={{ color: isPublic ? theme.accentContrast : theme.textSecondary }}>
          Public
        </ThemedText>
      </Pressable>
    </View>
  );
}

function ReviewCard({ review }: { review: PublicReview }) {
  const theme = useTheme();
  const visitedDate = new Date(review.visitedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ThemedView type="backgroundElement" style={[styles.reviewCard, { borderColor: theme.border }]}>
      <View style={styles.reviewHeader}>
        <ThemedText type="smallBold">{review.displayName}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Dove here {visitedDate}
        </ThemedText>
      </View>
      <ReadOnlyStars rating={review.rating} />
      {review.notes && <ThemedText type="default">{review.notes}</ThemedText>}
      {review.photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.photoRow}>
            {review.photos.map((photo) => (
              <ReadOnlyMediaThumbnail key={photo.id} photo={photo} />
            ))}
          </View>
        </ScrollView>
      )}
    </ThemedView>
  );
}

export default function SiteDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: site, isLoading: isSiteLoading } = useSite(slug);
  const { data: existingRating } = useSiteRating(site?.id);
  const rateSite = useRateSite();
  const { showToast } = useToast();
  const { data: userPhotos } = useUserPhotos({ siteId: site?.id });
  const addUserPhoto = useAddUserPhoto();
  const { data: sightings, isLoading: isSightingsLoading } = useSightingsForSite(site?.id);
  const { data: speciesList, isLoading: isSpeciesLoading } = useSpeciesForSite(site?.slug);
  const setSightingCount = useSetSightingCount();
  const { data: publicReviews } = usePublicReviewsForSite(site?.id);
  const { data: ratingSummaries } = usePublicRatingSummaries(site ? [site.id] : undefined);
  const ratingSummary = ratingSummaries?.[0];

  // Only species actually catalogued at this site (not the whole global
  // list) -- otherwise this doubled as a way to mark any species from any
  // region as seen at a site it has nothing to do with, sorted with
  // whatever's already logged at this site first.
  const speciesWithCounts = useMemo(() => {
    const countBySpeciesId = new Map((sightings ?? []).map((s) => [s.speciesId, s.count]));
    const rows = (speciesList ?? []).map((sp) => ({ species: sp, count: countBySpeciesId.get(sp.id) ?? 0 }));
    return rows.sort((a, b) => {
      if (a.count > 0 && b.count === 0) return -1;
      if (a.count === 0 && b.count > 0) return 1;
      return a.species.commonName.localeCompare(b.species.commonName);
    });
  }, [speciesList, sightings]);

  const isFishListLoading = isSpeciesLoading || isSightingsLoading;

  const seenSpeciesCount = useMemo(
    () => speciesWithCounts.filter(({ count }) => count > 0).length,
    [speciesWithCounts],
  );

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [reviewIsPublic, setReviewIsPublic] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);
  // Shared default for every photo/video uploaded from this screen -- not
  // re-asked per upload, just a visible, changeable choice before each one.
  const [uploadIsPublic, setUploadIsPublic] = useState(false);

  useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setNotes(existingRating.notes ?? '');
      setReviewIsPublic(existingRating.isPublic);
    }
  }, [existingRating]);

  const theme = useTheme();

  if (isSiteLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              Loading dive site…
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!site) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <View style={styles.content}>
            <ThemedText type="small" themeColor="textSecondary">
              Dive site not found.
            </ThemedText>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  function handleSave() {
    if (!site) return;
    setJustSaved(false);
    rateSite.mutate(
      { siteId: site.id, rating, notes: notes.trim() || undefined, isPublic: reviewIsPublic },
      {
        onSuccess: () => {
          setJustSaved(true);
          showToast('Saved');
        },
      },
    );
  }

  async function pickAndUploadPhoto(speciesId?: string) {
    if (!site) return;
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
      addUserPhoto.mutate(
        {
          siteId: site.id,
          speciesId,
          uri: asset.uri,
          mediaType,
          mimeType: asset.mimeType,
          fileName: asset.fileName,
          isPublic: uploadIsPublic,
        },
        { onSuccess: () => showToast(mediaType === 'video' ? 'Video added' : 'Photo added') },
      );
    }
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <ThemedText type="title" style={styles.siteName}>
              {site.name}
            </ThemedText>

            {ratingSummary && (
              <View style={styles.avgRatingRow}>
                <ReadOnlyStars rating={Math.round(ratingSummary.average)} />
                <ThemedText type="smallBold">{ratingSummary.average.toFixed(1)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  ({ratingSummary.count} {ratingSummary.count === 1 ? 'review' : 'reviews'})
                </ThemedText>
              </View>
            )}

            <View style={styles.badgeRow}>
              <Badge label={site.area} />
              <Badge label={site.type} />
              <Badge label={site.difficulty} />
            </View>

            <ThemedText type="smallBold" themeColor="textSecondary">
              Depth: {site.depthMin}–{site.depthMax}m
            </ThemedText>

            <ThemedText type="default">{site.description}</ThemedText>

            {site.proTip && (
              <View style={[styles.proTipBlock, { borderColor: theme.accent, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="mono" style={{ color: theme.accent }}>
                  PRO TIP
                </ThemedText>
                <ThemedText type="default">{site.proTip}</ThemedText>
              </View>
            )}

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Fish I've seen here
            </ThemedText>
            {isFishListLoading ? (
              <ThemedText type="small" themeColor="textSecondary">
                Loading fish…
              </ThemedText>
            ) : (
              <CollapsiblePicker
                summary={
                  seenSpeciesCount > 0
                    ? `Seen ${seenSpeciesCount} of ${speciesWithCounts.length} fish here`
                    : 'No sightings logged yet — tap to add one'
                }>
                {speciesWithCounts.map(({ species: s, count }) => (
                  <SiteSpeciesRow
                    key={s.id}
                    species={s}
                    siteId={site.id}
                    checked={count > 0}
                    onToggle={() =>
                      setSightingCount.mutate({ speciesId: s.id, siteId: site.id, count: count > 0 ? 0 : 1 })
                    }
                    onAddPhoto={() => pickAndUploadPhoto(s.id)}
                  />
                ))}
              </CollapsiblePicker>
            )}

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Photos
            </ThemedText>
            {userPhotos && userPhotos.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.photoRow}>
                  {userPhotos.map((photo) => (
                    <UserMediaThumbnail key={photo.id} photo={photo} style={styles.thumbnail} />
                  ))}
                </View>
              </ScrollView>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                No photos yet.
              </ThemedText>
            )}
            <PublicPrivateToggle isPublic={uploadIsPublic} onChange={setUploadIsPublic} />
            <Pressable
              onPress={() => pickAndUploadPhoto()}
              style={[styles.addPhotoButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
                Add photo or video
              </ThemedText>
            </Pressable>
            {pickerMessage && (
              <ThemedText type="small" themeColor="textSecondary">
                {pickerMessage}
              </ThemedText>
            )}

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Rate this dive site
            </ThemedText>
            <StarRating rating={rating} onChange={setRating} />

            <TextInput
              style={[
                styles.notesInput,
                { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected },
              ]}
              multiline
              numberOfLines={4}
              placeholder="Add personal notes about this dive…"
              placeholderTextColor={theme.textSecondary}
              value={notes}
              onChangeText={setNotes}
            />

            <PublicPrivateToggle isPublic={reviewIsPublic} onChange={setReviewIsPublic} />

            <View style={styles.saveRow}>
              <Pressable
                style={[styles.saveButton, { backgroundColor: theme.backgroundSelected }]}
                onPress={handleSave}
                disabled={rateSite.isPending}>
                <ThemedText type="smallBold">{rateSite.isPending ? 'Saving…' : 'Save'}</ThemedText>
              </Pressable>
              {justSaved && !rateSite.isPending && (
                <ThemedText type="small" themeColor="textSecondary">
                  Saved
                </ThemedText>
              )}
            </View>

            <CollapsiblePicker
              summary={
                publicReviews && publicReviews.length > 0
                  ? `See reviews (${publicReviews.length})`
                  : 'See reviews'
              }>
              {publicReviews && publicReviews.length > 0 ? (
                <View style={styles.reviewList}>
                  {publicReviews.map((review) => (
                    <ReviewCard key={review.userId} review={review} />
                  ))}
                </View>
              ) : (
                <ThemedText type="small" themeColor="textSecondary" style={styles.noReviewsText}>
                  No public reviews yet — reviews only show up here once someone marks their review of
                  this site as Public.
                </ThemedText>
              )}
            </CollapsiblePicker>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  scrollContent: { flexGrow: 1, alignItems: 'center' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  siteName: {
    fontSize: 32,
    lineHeight: 38,
  },
  avgRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  badge: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  sectionHeader: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: Spacing.two,
  },
  proTipBlock: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    borderLeftWidth: 3,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rarityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  inlineAddPhoto: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
  sightedSpeciesBlock: {
    gap: Spacing.one,
  },
  sightedThumbnail: {
    width: 60,
    height: 60,
    borderRadius: Spacing.one,
  },
  photoRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  thumbnail: {
    width: 100,
    height: 100,
    borderRadius: Spacing.two,
  },
  addPhotoButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
  },
  starRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  star: {
    fontSize: 32,
    lineHeight: 36,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    padding: Spacing.three,
    minHeight: 96,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  saveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  saveButton: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    alignSelf: 'flex-start',
  },
  reviewList: {
    gap: Spacing.three,
  },
  noReviewsText: {
    padding: Spacing.three,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  visibilityPill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.medium,
  },
  reviewCard: {
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  reviewStar: {
    fontSize: 16,
    lineHeight: 20,
  },
  reviewThumbnail: {
    width: 100,
    height: 100,
    borderRadius: Spacing.two,
    overflow: 'hidden',
  },
});
