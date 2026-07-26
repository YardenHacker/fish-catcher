import { Ionicons } from '@expo/vector-icons';
import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="fish" href="/" asChild>
            <TabButton icon="fish-outline">Fish</TabButton>
          </TabTrigger>
          <TabTrigger name="sites" href="/sites" asChild>
            <TabButton icon="map-outline">Sites</TabButton>
          </TabTrigger>
          <TabTrigger name="map" href="/map" asChild>
            <TabButton icon="location-outline">Map</TabButton>
          </TabTrigger>
          <TabTrigger name="collection" href="/collection" asChild>
            <TabButton icon="star-outline">Collection</TabButton>
          </TabTrigger>
          <TabTrigger name="feed" href="/feed" asChild>
            <TabButton icon="notifications-outline">Feed</TabButton>
          </TabTrigger>
          <TabTrigger name="area" href="/area" asChild>
            <TabButton icon="earth-outline">Area</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="person-outline">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

export function TabButton({
  children,
  isFocused,
  icon,
  ...props
}: TabTriggerSlotProps & { icon?: IoniconName }) {
  const theme = useTheme();
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      {icon && <Ionicons name={icon} size={20} color={isFocused ? theme.accent : theme.textSecondary} />}
      <ThemedText type="small" themeColor={isFocused ? 'accent' : 'textSecondary'} style={isFocused && styles.focusedLabel}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  const theme = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.barShadowWrap, { borderTopColor: theme.border }]}>
      <SafeAreaView edges={['bottom']}>
        <ThemedView {...props} type="backgroundElement" style={styles.tabBar} />
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  barShadowWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabBar: {
    flexDirection: 'row',
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingVertical: Spacing.two,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.half,
    paddingVertical: Spacing.one,
  },
  pressed: {
    opacity: 0.6,
  },
  focusedLabel: {
    fontWeight: '700',
  },
});
