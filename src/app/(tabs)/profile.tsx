import { useEffect, useState } from 'react';
import { Pressable, Switch, TextInput, View, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenBackground } from '@/components/screen-background';
import { SignInForm } from '@/components/sign-in-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useToast } from '@/components/toast';
import { BottomTabInset, MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useProfile, useUpdateProfile } from '@/lib/data';
import { isSupabaseConfigured } from '@/lib/supabase';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <ScreenBackground source={require('@/assets/images/backgrounds/profile.jpg')} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.identity}>
            <ThemedText type="title">Fish Catcher</ThemedText>
            <ThemedText type="default" themeColor="textSecondary">
              Your dive companion across the Red Sea and Israel's Mediterranean coast.
            </ThemedText>
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Data & Sync</ThemedText>
            <SyncSection />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">Public Profile</ThemedText>
            <PublicProfileSection />
          </View>

          <View style={styles.section}>
            <ThemedText type="smallBold">About</ThemedText>
            <ThemedView type="backgroundElement" style={[styles.aboutCard, { borderColor: theme.border }]}>
              <ThemedText type="default" themeColor="textSecondary">
                Fish Catcher catalogs real marine species across four dive regions: Sharm el Sheikh and Dahab
                in Egypt's Red Sea, and Eilat and the Mediterranean coast in Israel. Mark a species as found
                once and it's in your collection everywhere -- the app still remembers exactly where you saw
                it. Upload your own photos to build a personal gallery, and rate and annotate the dive sites
                you explore.
              </ThemedText>
            </ThemedView>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

function SyncSection() {
  const theme = useTheme();
  const { isLoading, user, signOut } = useAuth();

  if (!isSupabaseConfigured) {
    return (
      <ThemedView type="backgroundElement" style={[styles.statusRow, { borderColor: theme.border }]}>
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

  if (isLoading) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Checking sign-in status…
      </ThemedText>
    );
  }

  if (user) {
    return (
      <View style={{ gap: Spacing.two }}>
        <ThemedView type="backgroundElement" style={[styles.statusRow, { borderColor: theme.border }]}>
          <View style={[styles.statusDot, styles.statusDotOnline]} />
          <View style={styles.statusTextGroup}>
            <ThemedText type="default">Synced as {user.email}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Your finds, photos, and ratings are backed up to the cloud and follow you across devices.
            </ThemedText>
          </View>
        </ThemedView>
        <Pressable style={[styles.secondaryButton, { borderColor: theme.border }]} onPress={() => signOut()}>
          <ThemedText type="smallBold">Sign out</ThemedText>
        </Pressable>
      </View>
    );
  }

  return <SignInForm />;
}

/**
 * Reviews/photos are private by default (RLS-enforced, migration 0008) --
 * this is the one place a user explicitly opts in to making them visible to
 * everyone else. Not rendered for signed-out users: there's no profile row
 * without an account, and "public" only means something once other signed-in
 * users can actually see it.
 */
function PublicProfileSection() {
  const theme = useTheme();
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { showToast } = useToast();
  const [displayName, setDisplayName] = useState('');

  useEffect(() => {
    setDisplayName(profile?.displayName ?? '');
  }, [profile?.displayName]);

  if (!user) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Sign in to set a display name and share your reviews publicly.
      </ThemedText>
    );
  }

  if (isLoading || !profile) {
    return (
      <ThemedText type="small" themeColor="textSecondary">
        Loading…
      </ThemedText>
    );
  }

  const nameChanged = displayName.trim() !== (profile.displayName ?? '');

  return (
    <View style={{ gap: Spacing.two }}>
      <View style={styles.nameRow}>
        <TextInput
          style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
          placeholder="Your name (shown on your public reviews)"
          placeholderTextColor={theme.textSecondary}
          value={displayName}
          onChangeText={setDisplayName}
        />
        {nameChanged && (
          <Pressable
            style={[styles.secondaryButton, styles.saveNameButton, { borderColor: theme.border }]}
            onPress={() =>
              updateProfile.mutate(
                { displayName: displayName.trim() },
                { onSuccess: () => showToast('Name saved') },
              )
            }>
            <ThemedText type="smallBold">Save</ThemedText>
          </Pressable>
        )}
      </View>

      <ThemedView type="backgroundElement" style={[styles.statusRow, { borderColor: theme.border }]}>
        <View style={styles.statusTextGroup}>
          <ThemedText type="default">Make my reviews & photos public</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            When on, other Fish Catcher users can see your star ratings, notes, dive dates, and photos on
            any site you've reviewed -- under the display name above. Off by default.
          </ThemedText>
        </View>
        <Switch
          value={profile.reviewsPublic}
          onValueChange={(value) =>
            updateProfile.mutate(
              { reviewsPublic: value },
              { onSuccess: () => showToast(value ? 'Reviews are now public' : 'Reviews are now private') },
            )
          }
          trackColor={{ false: theme.border, true: theme.accent }}
        />
      </ThemedView>
    </View>
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
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: Radii.small,
    marginTop: Spacing.one,
  },
  statusDotOnline: {
    backgroundColor: '#2FE07E',
  },
  statusDotOffline: {
    backgroundColor: '#3B9DFF',
  },
  statusTextGroup: {
    flex: 1,
    gap: Spacing.half,
  },
  aboutCard: {
    borderRadius: Radii.large,
    borderWidth: 1,
    padding: Spacing.three,
  },
  secondaryButton: {
    borderRadius: Radii.medium,
    borderWidth: 1,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    borderRadius: Radii.medium,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  saveNameButton: {
    paddingHorizontal: Spacing.three,
  },
});
