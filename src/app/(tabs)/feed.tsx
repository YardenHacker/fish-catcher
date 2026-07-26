import { Link } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AreaBadge } from '@/components/area-badge';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { RARITY_TIER_COLOR, useActivityFeedForRegion } from '@/lib/data';
import type { ActivityEvent } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(ms / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/** Fish finds only -- site ratings have their own aggregate display (SiteRatingSummary), not a feed entry. */
function FeedRow({ event }: { event: ActivityEvent }) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border }]}>
      <View style={[styles.dot, { backgroundColor: RARITY_TIER_COLOR[event.rarityTier] }]} />
      <View style={styles.rowText}>
        <ThemedText type="default">
          <ThemedText type="smallBold">{event.displayName}</ThemedText> spotted a{' '}
          <ThemedText type="smallBold" style={{ color: RARITY_TIER_COLOR[event.rarityTier] }}>
            {event.rarityTier}
          </ThemedText>{' '}
          {event.speciesName} at {event.siteName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(event.at)}
        </ThemedText>
      </View>
    </ThemedView>
  );
}

/**
 * Recent public rare+ fish finds in the current area -- deliberately
 * fish-only, site ratings show as an aggregate average elsewhere (site
 * detail, map) rather than as individual feed entries. Scoped to whichever
 * region is active, same as Fish/Sites/Map; switching areas (via the Area
 * tab) changes what shows here.
 */
export default function FeedScreen() {
  const activeRegion = useActiveRegion();
  const { data: events, isLoading } = useActivityFeedForRegion(activeRegion?.id);

  return (
    <ThemedView style={styles.container}>
      <ScreenBackground source={require('@/assets/images/backgrounds/collection.jpg')} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.header}>
          <ThemedText type="title">Feed</ThemedText>
          <AreaBadge />
        </View>

        {isLoading ? (
          <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
            Loading…
          </ThemedText>
        ) : (
          <FlatList
            data={events ?? []}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => <FeedRow event={item} />}
            ListEmptyComponent={
              <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                No rare+ finds here yet. A find shows up here once someone spots a Rare, Epic, or
                Legendary species and has also made their rating of that same site Public.{'\n\n'}
                Want to be the first? Log a sighting and rate the site as Public from its{' '}
                <Link href="/sites" style={styles.link}>
                  detail page
                </Link>
                .
              </ThemedText>
            }
          />
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  list: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    gap: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
    alignItems: 'flex-start',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.one,
  },
  rowText: {
    flex: 1,
    gap: Spacing.half,
  },
  emptyText: {
    padding: Spacing.four,
    textAlign: 'center',
  },
  link: {
    textDecorationLine: 'underline',
  },
});
