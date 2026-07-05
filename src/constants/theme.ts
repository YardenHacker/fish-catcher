/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#10161c',
    background: '#eef2f4',
    backgroundElement: '#dde5e9',
    backgroundSelected: '#c7d3d9',
    textSecondary: '#4d5c66',
    border: '#c7d3d9',
    accent: '#0a7a6e',
    accentContrast: '#FFFFFF',
  },
  dark: {
    text: '#e6f0f2',
    background: '#10161c',
    backgroundElement: '#161e24',
    backgroundSelected: '#1e2a32',
    textSecondary: '#8698a3',
    border: '#24313a',
    accent: '#4fd6c4',
    accentContrast: '#04252B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/**
 * HUD instrument-panel type system: "heading" (Space Grotesk) for
 * titles/names, and "mono" (JetBrains Mono) for every numeric/stat readout,
 * rarity tag, depth range, count, and IUCN code. Loaded at app startup via
 * `useFonts` in `src/app/_layout.tsx`; the family names below must match the
 * keys registered there (and the @font-face names in `src/global.css` for web).
 */
export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
    heading: 'SpaceGrotesk_500Medium',
    headingRegular: 'SpaceGrotesk_400Regular',
    dataMono: 'JetBrainsMono_400Regular',
    dataMonoMedium: 'JetBrainsMono_500Medium',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
    heading: 'SpaceGrotesk_500Medium',
    headingRegular: 'SpaceGrotesk_400Regular',
    dataMono: 'JetBrainsMono_400Regular',
    dataMonoMedium: 'JetBrainsMono_500Medium',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
    heading: 'var(--font-heading)',
    headingRegular: 'var(--font-heading)',
    dataMono: 'var(--font-data-mono)',
    dataMonoMedium: 'var(--font-data-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/**
 * HUD/instrument-panel corner radii -- small and angular, replacing the
 * previous soft/pill look (which used `Spacing.two`..`Spacing.four`, i.e.
 * 8-24px, for cards and chips alike).
 */
export const Radii = {
  small: 4,
  medium: 6,
  large: 8,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
