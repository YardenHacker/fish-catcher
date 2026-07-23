import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRegions } from '@/lib/data';
import { useActiveRegion, useSetActiveRegion } from '@/lib/region-context';

/**
 * Which country each region belongs to. Not modeled server-side -- with only
 * two countries and four regions today, a client-side map is simpler than a
 * schema/migration change. A new region just needs an entry added here
 * alongside its seed data.
 */
const REGION_COUNTRY: Record<string, string> = {
  'sharm-el-sheikh': 'Egypt',
  dahab: 'Egypt',
  eilat: 'Israel',
  mediterranean: 'Israel',
};
const COUNTRY_ORDER = ['Israel', 'Egypt'];

/**
 * Two-level picker: country first (Israel / Egypt), then the specific region
 * within it. Renders on the four screens whose data is region-scoped (Fish,
 * Sites, Map, Collection). Picking a country only changes which region pills
 * show below it -- the active region (and its data) only changes once a
 * specific region pill is tapped.
 */
export function RegionSwitcher() {
  const theme = useTheme();
  const { data: regions, isLoading } = useRegions();
  const activeRegion = useActiveRegion();
  const setActiveRegion = useSetActiveRegion();

  const activeCountry = activeRegion ? REGION_COUNTRY[activeRegion.slug] : undefined;
  const [pickedCountry, setPickedCountry] = useState<string | undefined>(undefined);
  // Falls back to the active region's country until the user explicitly taps
  // a country pill -- avoids a render where nothing in the country row is
  // selected just because the regions list resolved after this component's
  // initial state.
  const selectedCountry = pickedCountry ?? activeCountry;

  if (isLoading || !regions || regions.length === 0) return null;

  const countries = COUNTRY_ORDER.filter((country) => regions.some((r) => REGION_COUNTRY[r.slug] === country));
  const regionsInCountry = regions.filter((r) => REGION_COUNTRY[r.slug] === selectedCountry);
  const singleCountry = countries.length <= 1;

  return (
    <View style={styles.stack}>
      <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {countries.map((country) => {
          const selected = country === selectedCountry;
          return (
            <Pressable
              key={country}
              disabled={singleCountry}
              onPress={() => setPickedCountry(country)}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.accent : 'transparent',
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}>
              <ThemedText type="mono" style={{ color: selected ? theme.accentContrast : theme.textSecondary }}>
                {country.toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.row, { borderColor: theme.border, backgroundColor: theme.backgroundElement }]}>
        {regionsInCountry.map((region) => {
          const selected = activeRegion?.id === region.id;
          return (
            <Pressable
              key={region.id}
              disabled={regionsInCountry.length === 1}
              onPress={() => setActiveRegion(region.id)}
              style={[
                styles.pill,
                {
                  backgroundColor: selected ? theme.accent : 'transparent',
                  borderColor: selected ? theme.accent : theme.border,
                },
              ]}>
              <ThemedText type="mono" style={{ color: selected ? theme.accentContrast : theme.textSecondary }}>
                {region.name.toUpperCase()}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: Spacing.one, alignItems: 'flex-start' },
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.half,
    gap: Spacing.half,
  },
  pill: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radii.medium,
    borderWidth: 1,
  },
});
