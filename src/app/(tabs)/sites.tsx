import { Link } from 'expo-router';
import { Fragment } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RegionSwitcher } from '@/components/region-switcher';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useSitesForRegion } from '@/lib/data';
import type { DiveSite } from '@/lib/data';
import { useActiveRegion } from '@/lib/region-context';

const AREA_ORDER = ['Ras Mohammed', 'Straits of Tiran', 'Sharm Local'];

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
  const groups = groupSitesByArea(sites ?? []);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <ThemedText type="title">Dive Sites</ThemedText>
            <RegionSwitcher />

            {isLoading && (
              <ThemedText type="small" themeColor="textSecondary">
                Loading dive sites…
              </ThemedText>
            )}

            {!isLoading && groups.length === 0 && (
              <ThemedText type="small" themeColor="textSecondary">
                No dive sites found.
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
