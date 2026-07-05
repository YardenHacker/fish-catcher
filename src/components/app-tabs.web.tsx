import { Tabs, TabList, TabTrigger, TabSlot, TabTriggerSlotProps, TabListProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function AppTabs() {
  return (
    <Tabs>
      <TabSlot style={{ height: '100%' }} />
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="dex" href="/" asChild>
            <TabButton icon="🐠">Dex</TabButton>
          </TabTrigger>
          <TabTrigger name="sites" href="/sites" asChild>
            <TabButton icon="🗺️">Sites</TabButton>
          </TabTrigger>
          <TabTrigger name="collection" href="/collection" asChild>
            <TabButton icon="⭐">Collection</TabButton>
          </TabTrigger>
          <TabTrigger name="profile" href="/profile" asChild>
            <TabButton icon="👤">Profile</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// SF Symbols don't have a meaningful web equivalent (the web fallback renders
// a plain circle glyph), so plain emoji are used here instead -- they render
// identically everywhere with no icon library needed.
export function TabButton({ children, isFocused, icon, ...props }: TabTriggerSlotProps & { icon?: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <Text style={styles.tabIcon}>{icon}</Text>
      <ThemedText type="small" themeColor={isFocused ? 'accent' : 'textSecondary'} style={isFocused && styles.focusedLabel}>
        {children}
      </ThemedText>
    </Pressable>
  );
}

export function CustomTabList(props: TabListProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.barShadowWrap}>
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
    borderTopColor: 'rgba(0,0,0,0.08)',
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
  tabIcon: {
    fontSize: 22,
  },
  focusedLabel: {
    fontWeight: '700',
  },
});
