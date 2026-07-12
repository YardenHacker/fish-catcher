import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useDeleteUserPhoto } from '@/lib/data';
import type { UserPhoto } from '@/lib/data/types';

import { ThemedText } from './themed-text';

const CONFIRM_RESET_MS = 3000;
const DELETE_RED = '#D64545';

function VideoThumbnail({ uri, style }: { uri: string; style: StyleProp<ViewStyle> }) {
  const player = useVideoPlayer(uri);
  return <VideoView player={player} style={style} contentFit="cover" nativeControls />;
}

/**
 * One thumbnail in a "your photos" grid -- renders a photo or a video (with
 * native playback controls as the play affordance) and a small delete ("x")
 * badge in the corner.
 *
 * Deleting is destructive and these grids are easy to mis-tap, so the badge
 * uses a tap-again-to-confirm pattern instead of `Alert.alert`: RN Web
 * doesn't reliably show native alerts, and this way the same code path works
 * identically on native and web. First tap turns the badge red with
 * "Delete?" for a few seconds; a second tap within that window deletes.
 */
export function UserMediaThumbnail({
  photo,
  style,
}: {
  photo: UserPhoto;
  style: StyleProp<ViewStyle>;
}) {
  const deletePhoto = useDeleteUserPhoto();
  const [confirming, setConfirming] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (resetTimer.current) clearTimeout(resetTimer.current);
    },
    [],
  );

  function handleDeletePress() {
    if (!confirming) {
      setConfirming(true);
      resetTimer.current = setTimeout(() => setConfirming(false), CONFIRM_RESET_MS);
      return;
    }
    if (resetTimer.current) clearTimeout(resetTimer.current);
    setConfirming(false);
    deletePhoto.mutate({
      photoId: photo.id,
      storagePath: photo.storagePath,
      speciesId: photo.speciesId,
      siteId: photo.siteId,
    });
  }

  return (
    <View style={[styles.wrap, style]}>
      {photo.mediaType === 'video' ? (
        <VideoThumbnail uri={photo.uri} style={StyleSheet.absoluteFill} />
      ) : (
        <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" />
      )}
      <Pressable
        onPress={handleDeletePress}
        hitSlop={8}
        disabled={deletePhoto.isPending}
        style={[styles.deleteBadge, { backgroundColor: confirming ? DELETE_RED : 'rgba(0,0,0,0.55)' }]}>
        <ThemedText style={styles.deleteBadgeText}>{confirming ? 'Delete?' : '✕'}</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden', position: 'relative' },
  deleteBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
