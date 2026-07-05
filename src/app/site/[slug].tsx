import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  RARITY_TIER_COLOR,
  useAddUserPhoto,
  useRateSite,
  useSite,
  useSiteRating,
  useSpeciesForSite,
  useUserPhotos,
} from '@/lib/data';
import type { Species } from '@/lib/data';

function Badge({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

function SpeciesRow({ species }: { species: Species }) {
  return (
    <Link href={`/creature/${species.slug}`} asChild>
      <Pressable style={({ pressed }) => [pressed && styles.rowPressed]}>
        <ThemedView type="backgroundElement" style={styles.speciesRow}>
          <View style={[styles.rarityDot, { backgroundColor: RARITY_TIER_COLOR[species.rarityTier] }]} />
          <ThemedText type="default" style={styles.speciesName}>
            {species.commonName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {species.rarityTier}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
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

export default function SiteDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { data: site, isLoading: isSiteLoading } = useSite(slug);
  const { data: species, isLoading: isSpeciesLoading } = useSpeciesForSite(slug);
  const { data: existingRating } = useSiteRating(site?.id);
  const rateSite = useRateSite();
  const { data: userPhotos } = useUserPhotos({ siteId: site?.id });
  const addUserPhoto = useAddUserPhoto();

  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [justSaved, setJustSaved] = useState(false);
  const [pickerMessage, setPickerMessage] = useState<string | null>(null);

  useEffect(() => {
    if (existingRating) {
      setRating(existingRating.rating);
      setNotes(existingRating.notes ?? '');
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
      { siteId: site.id, rating, notes: notes.trim() || undefined },
      {
        onSuccess: () => setJustSaved(true),
      },
    );
  }

  async function handleAddPhoto() {
    if (!site) return;
    setPickerMessage(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setPickerMessage('Photo library permission was denied.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      addUserPhoto.mutate({ siteId: site.id, uri: result.assets[0].uri });
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

            <View style={styles.badgeRow}>
              <Badge label={site.area} />
              <Badge label={site.type} />
              <Badge label={site.difficulty} />
            </View>

            <ThemedText type="smallBold" themeColor="textSecondary">
              Depth: {site.depthMin}–{site.depthMax}m
            </ThemedText>

            <ThemedText type="default">{site.description}</ThemedText>

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Species seen here
            </ThemedText>
            {isSpeciesLoading && (
              <ThemedText type="small" themeColor="textSecondary">
                Loading species…
              </ThemedText>
            )}
            {!isSpeciesLoading && (species?.length ?? 0) === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No recorded sightings yet.
              </ThemedText>
            )}
            {!isSpeciesLoading && species && species.length > 0 && (
              <View style={styles.rowList}>
                {species.map((s) => (
                  <SpeciesRow key={s.id} species={s} />
                ))}
              </View>
            )}

            <ThemedText type="subtitle" style={styles.sectionHeader}>
              Photos
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
              style={[styles.addPhotoButton, { backgroundColor: theme.accent }]}>
              <ThemedText type="smallBold" style={{ color: theme.accentContrast }}>
                Add photo
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
  rowList: {
    gap: Spacing.two,
  },
  speciesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.two,
    padding: Spacing.three,
  },
  speciesName: {
    flex: 1,
  },
  rarityDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  rowPressed: {
    opacity: 0.6,
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
});
