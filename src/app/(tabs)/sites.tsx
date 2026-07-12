import { Link } from 'expo-router';
import { Fragment, useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionSwitcher } from '@/components/region-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSitesForRegion } from '@/lib/data';
import type { DiveSite } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

const ALL = 'All';
const DIFFICULTY_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

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

function SiteRow({ site }: { site: DiveSite }) {
  return (
    <Link href={`/site/${site.slug}`} asChild>
      <Pressable style={({ pressed }) => [pressed && styles.rowPressed]}>
        <ThemedView type="backgroundElement" style={styles.row}>
          <ThemedText type="smallBold">{site.name}</ThemedText>
          <View style={styles.badgeRow}>
            <Badge label={site.type} />
            <Badge label={site.difficulty} />
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {site.depthMin}–{site.depthMax}m
          </ThemedText>
          <ThemedText type="small" numberOfLines={1}>
            {site.description}
          </ThemedText>
        </ThemedView>
      </Pressable>
    </Link>
  );
}

export default function SitesScreen() {
  const activeRegion = useActiveRegion();
  const { data: sites, isLoading } = useSitesForRegion(activeRegion?.slug);
  const [difficultyFilter, setDifficultyFilter] = useState<string>(ALL);

  const filteredSites = useMemo(() => {
    if (!sites) return [];
    if (difficultyFilter === ALL) return sites;
    return sites.filter((s) => s.difficulty === difficultyFilter);
  }, [sites, difficultyFilter]);

  const groups = groupSitesByArea(filteredSites);

  return (
    <ThemedView style={styles.container}>
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
                      <SiteRow key={site.id} site={site} />
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
});
