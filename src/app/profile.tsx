import { View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.identity}>
            <ThemedText type="title">ReefDex</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Your dive companion for Sharm el Sheikh, Ras Mohammed & the Straits of Tiran.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Data & Sync</ThemedText>
            <SyncStatus />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">About</ThemedText>
            <ThemedView type="backgroundElement" style={styles.aboutCard}>
              <ThemedText type="default" themeColor="textSecondary">
                ReefDex catalogs real marine species found around Sharm el Sheikh dive sites, including Ras
                Mohammed, the Straits of Tiran, and the local house reefs. Mark species as found as you spot
                them, upload your own photos to build a personal gallery, and rate and annotate the dive
                sites you explore.
              </ThemedText>
            </ThemedView>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function SyncStatus() {
  if (isSupabaseConfigured) {
    return (
      <ThemedView type="backgroundElement" style={styles.statusRow}>
        <View style={[styles.statusDot, styles.statusDotOnline]} />
        <View style={styles.statusTextGroup}>
          <ThemedText type="default">Synced with Supabase</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Your finds, photos, and ratings are backed up to the cloud.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView type="backgroundElement" style={styles.statusRow}>
      <View style={[styles.statusDot, styles.statusDotOffline]} />
      <View style={styles.statusTextGroup}>
        <ThemedText type="default">Offline mode</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Using on-device data. Your finds, photos, and ratings are saved on this device.
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    gap: Spacing.five,
  },
  identity: {
    gap: Spacing.two,
  },
  section: {
    gap: Spacing.two,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: Spacing.one,
  },
  statusDotOnline: {
    backgroundColor: '#2E9E5B',
  },
  statusDotOffline: {
    backgroundColor: '#2E7DD1',
  },
  statusTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  aboutCard: {
    borderRadius: Spacing.four,
    padding: Spacing.three,
  },
});
