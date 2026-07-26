import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useRegions } from '@/lib/data';
import { COUNTRY_FLAG, COUNTRY_ORDER, REGION_COUNTRY, useActiveRegion, useSetActiveRegion } from '@/lib/region-context';
import type { Region } from '@/lib/data';

/**
 * The one place to switch country/area now -- replaces the small pill-row
 * region switcher that used to sit inline on Fish/Sites/Map/Collection.
 * Reachable anytime from the tab bar (not just at sign-in), so switching
 * areas mid-session is a deliberate, full-page action rather than a small
 * incidental control competing for space with each screen's own filters.
 */
export default function AreaScreen() {
  const theme = useTheme();
  const { data: regions, isLoading } = useRegions();
  const activeRegion = useActiveRegion();
  const setActiveRegion = useSetActiveRegion();

  const activeCountry = activeRegion ? REGION_COUNTRY[activeRegion.slug] : undefined;
  const [pickedCountry, setPickedCountry] = useState<string | undefined>(undefined);
  const selectedCountry = pickedCountry ?? activeCountry;

  const countries = COUNTRY_ORDER.filter((country) => (regions ?? []).some((r) => REGION_COUNTRY[r.slug] === country));
  const regionsInCountry = (regions ?? []).filter((r) => REGION_COUNTRY[r.slug] === selectedCountry);

  return (
    <ThemedView style={styles.container}>
      <ScreenBackground source={require('@/assets/images/backgrounds/sites.jpg')} />
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.content}>
          <ThemedText type="title">Area</ThemedText>
          <ThemedText type="default" themeColor="textSecondary">
            Pick a country, then the specific area -- the rest of the app (Fish, Sites, Map, Collection)
            follows whatever you choose here.
          </ThemedText>

          {isLoading ? (
            <ThemedText type="small" themeColor="textSecondary">
              Loading…
            </ThemedText>
          ) : (
            <>
              <ThemedText type="smallBold" style={styles.stepLabel}>
                Country
              </ThemedText>
              <View style={styles.cardGrid}>
                {countries.map((country) => (
                  <CountryCard
                    key={country}
                    label={country}
                    selected={country === selectedCountry}
                    onPress={() => setPickedCountry(country)}
                  />
                ))}
              </View>

              <ThemedText type="smallBold" style={styles.stepLabel}>
                Area
              </ThemedText>
              <View style={styles.cardGrid}>
                {regionsInCountry.map((region) => (
                  <AreaCard
                    key={region.id}
                    region={region}
                    selected={activeRegion?.id === region.id}
                    onPress={() => setActiveRegion(region.id)}
                  />
                ))}
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function CountryCard({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.cardWrapper}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: selected ? theme.accent : theme.border }]}>
        <ThemedText type="default" style={selected && styles.selectedLabel}>
          {COUNTRY_FLAG[label] ? `${COUNTRY_FLAG[label]} ` : ''}
          {label}
        </ThemedText>
        {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
      </ThemedView>
    </Pressable>
  );
}

function AreaCard({ region, selected, onPress }: { region: Region; selected: boolean; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable onPress={onPress} style={styles.cardWrapper}>
      <ThemedView
        type="backgroundElement"
        style={[styles.card, { borderColor: selected ? theme.accent : theme.border }]}>
        <ThemedText type="default" style={selected && styles.selectedLabel}>
          {region.name}
        </ThemedText>
        {selected && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center' },
  safeArea: { flex: 1, width: '100%' },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    padding: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  stepLabel: {
    marginTop: Spacing.two,
  },
  cardGrid: {
    gap: Spacing.two,
  },
  cardWrapper: {
    width: '100%',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.large,
    borderWidth: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  selectedLabel: {
    fontWeight: '700',
  },
});
