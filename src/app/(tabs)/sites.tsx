import { Link } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionSwitcher } from '@/components/region-switcher';
import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useFinds, useSiteRatings, useSitesForRegion } from '@/lib/data';
import type { DiveSite, SiteRating } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

const ALL = 'All';
const DIFFICULTY_ORDER = ['Beginner', 'Intermediate', 'Advanced'];
const STAR_OPTIONS = [5, 4, 3, 2, 1];
const VISITED_OPTIONS = ['Visited', 'Unvisited'];

// Preferred display order per area -- areas not listed here (there
// shouldn't be many) just fall in after these, in first-seen order.
const AREA_ORDER = [
  'Ras Mohammed',
  'Straits of Tiran',
  'Sharm Local',
  'Offshore Wrecks',
  'North Eilat',
  'Dolphin Reef / Katza',
  'Coral Beach Nature Reserve',
];

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

function groupSitesByArea(sites: DiveSite[]): Array<{ area: string; sites: DiveSite[] }> {
  const groups = new Map<string, DiveSite[]>();
  for (const site of sites) {
    const list = groups.get(site.area) ?? [];
    list.push(site);
    groups.set(site.area, list);
  }

  const orderedAreas = [...AREA_ORDER.filter((area) => groups.has(area)), ...[...groups.keys()].filter((area) => !AREA_ORDER.includes(area))];

  return orderedAreas.map((area) => ({ area, sites: groups.get(area)! }));
}

function Badge({ label }: { label: string }) {
  return (
    <ThemedView type="backgroundElement" style={styles.badge}>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </ThemedView>
  );
}

/** Read-only star display -- same ★/☆ glyph as the editable StarRating on the site detail screen. */
function StarsReadout({ rating }: { rating: number }) {
  const theme = useTheme();
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map((value) => (
        <ThemedText key={value} style={[styles.star, { color: theme.text }]}>
          {value <= rating ? '★' : '☆'}
        </ThemedText>
      ))}
    </View>
  );
}

function SiteRow({ site, rating, visited }: { site: DiveSite; rating: SiteRating | undefined; visited: boolean }) {
  return (
    <Link href={`/site/${site.slug}`} asChild>
      <Pressable style={({ pressed }) => [pressed && styles.rowPressed]}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedText type="smallBold">{site.name}</ThemedText>
          <View style={styles.badgeRow}>
            <Badge label={site.type} />
            <Badge label={site.difficulty} />
            {visited && <Badge label="Visited" />}
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {site.depthMin}–{site.depthMax}m
          </ThemedText>
          <ThemedText type="small" numberOfLines={1}>
            {site.description}
          </ThemedText>
          {/* Your own review, if you've left one -- there's no public review
              system, ratings/notes are always the current user's own. */}
          {rating && (
            <View style={styles.reviewPreview}>
              <StarsReadout rating={rating.rating} />
              {rating.notes ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                  "{rating.notes}"
                </ThemedText>
              ) : null}
            </View>
          )}
        </ThemedView>
      </Pressable>
    </Link>
  );
}

export default function SitesScreen() {
  const activeRegion = useActiveRegion();
  const { data: sites, isLoading } = useSitesForRegion(activeRegion?.slug);
  const { data: ratings } = useSiteRatings();
  const { data: finds } = useFinds();
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL);
  const [starFilter, setStarFilter] = useState<string>(ALL);
  const [visitedFilter, setVisitedFilter] = useState<string>(ALL);

  const ratingBySiteId = useMemo(() => {
    const map = new Map<string, SiteRating>();
    for (const r of ratings ?? []) map.set(r.siteId, r);
    return map;
  }, [ratings]);

  // "Visited" = a site with at least one logged sighting, anywhere -- the
  // same global find data the Fish tab/Collection use, not a separate
  // per-site flag. See Find.siteIds (progressStore.getFinds).
  const visitedSiteIds = useMemo(() => {
    const set = new Set<string>();
    for (const f of finds ?? []) for (const siteId of f.siteIds) set.add(siteId);
    return set;
  }, [finds]);

  const filteredSites = useMemo(() => {
    if (!sites) return [];
    return sites.filter((s) => {
      if (difficultyFilter !== ALL && s.difficulty !== difficultyFilter) return false;
      if (starFilter !== ALL) {
        const rating = ratingBySiteId.get(s.id);
        if (!rating || rating.rating < Number(starFilter)) return false;
      }
      if (visitedFilter === 'Visited' && !visitedSiteIds.has(s.id)) return false;
      if (visitedFilter === 'Unvisited' && visitedSiteIds.has(s.id)) return false;
      return true;
    });
  }, [sites, difficultyFilter, starFilter, visitedFilter, ratingBySiteId, visitedSiteIds]);

  const groups = groupSitesByArea(filteredSites);

  return (
    <ThemedView style={styles.container}>
      <ScreenBackground source={require('@/assets/images/backgrounds/sites.jpg')} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <ThemedText type="title">Dive Sites</ThemedText>
            <RegionSwitcher />

            {!isLoading && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[ALL, ...DIFFICULTY_ORDER]}
                keyExtractor={(item) => `difficulty-${item}`}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item}
                    selected={difficultyFilter === item}
                    onPress={() => setDifficultyFilter(item)}
                  />
                )}
                style={styles.chipList}
              />
            )}

            {!isLoading && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[ALL, ...STAR_OPTIONS]}
                keyExtractor={(item) => `star-${item}`}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item }) => {
                  const label = item === ALL ? ALL : item === 5 ? '5★' : `${item}★+`;
                  const value = String(item);
                  return (
                    <FilterChip label={label} selected={starFilter === value} onPress={() => setStarFilter(value)} />
                  );
                }}
                style={styles.chipList}
              />
            )}

            {!isLoading && (
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={[ALL, ...VISITED_OPTIONS]}
                keyExtractor={(item) => `visited-${item}`}
                contentContainerStyle={styles.chipRow}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item}
                    selected={visitedFilter === item}
                    onPress={() => setVisitedFilter(item)}
                  />
                )}
                style={styles.chipList}
              />
            )}

            {isLoading && (
              <ThemedText type="small" themeColor="textSecondary">
                Loading dive sites…
              </ThemedText>
            )}

            {!isLoading && groups.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No dive sites match this filter.
              </ThemedText>
            )}

            {!isLoading &&
              groups.map(({ area, sites: areaSites }) => (
                <Fragment key={area}>
                  <ThemedText type="subtitle" style={styles.areaHeader}>
                    {area}
                  </ThemedText>
                  <View style={styles.rowList}>
                    {areaSites.map((site) => (
                      <SiteRow
                        key={site.id}
                        site={site}
                        rating={ratingBySiteId.get(site.id)}
                        visited={visitedSiteIds.has(site.id)}
                      />
                    ))}
                  </View>
                </Fragment>
              ))}
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
  chipList: { flexGrow: 0 },
  chipRow: { gap: Spacing.two, paddingVertical: Spacing.one },
  chip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
    borderWidth: 1,
  },
  areaHeader: {
    fontSize: 22,
    lineHeight: 28,
    marginTop: Spacing.two,
  },
  rowList: {
    gap: Spacing.two,
  },
  row: {
    borderRadius: Spacing.two,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  rowPressed: {
    opacity: 0.6,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: Spacing.one,
  },
  badge: {
    borderRadius: Spacing.two,
    paddingVertical: Spacing.half,
    paddingHorizontal: Spacing.two,
  },
  reviewPreview: {
    gap: Spacing.half,
    marginTop: Spacing.half,
  },
  starRow: {
    flexDirection: 'row',
    gap: Spacing.half,
  },
  star: {
    fontSize: 14,
    lineHeight: 18,
  },
});
