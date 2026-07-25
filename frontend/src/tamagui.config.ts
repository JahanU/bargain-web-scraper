import { createAnimations } from '@tamagui/animations-css';
import { createInterFont } from '@tamagui/font-inter';
import { shorthands } from '@tamagui/shorthands';
// @ts-ignore
import { createTokens, createTamagui, setupDev } from '@tamagui/core';

// ─── Cactus palette ───────────────────────────────────────────────────────────
const tokens = createTokens({
  color: {
    // Backgrounds
    creamBg: '#f5f0e8',
    sandSurface: '#ede7d9',
    sandBorder: '#d9d0c0',
    // Cactus accent
    cactusLight: '#7a9e6e',
    cactusMid: '#5a7a4a',
    cactusDark: '#3d5c30',
    cactusSubtle: '#edf3ea',
    // Warm grays
    warmGray50: '#faf8f4',
    warmGray100: '#8c8578',
    warmGray200: '#6e6860',
    warmGray900: '#2e2a22',
    // Dark mode
    darkBg: '#1e1e16',
    darkSurface: '#2a2a1e',
    darkBorder: '#3a3a2a',
    darkText: '#e8e2d8',
    darkMuted: '#9e9880',
    // Feedback
    errorRed: '#b85c4a',
    successGreen: '#5a7a4a',
    // Neutrals required by Tamagui internals
    white: '#ffffff',
    black: '#000000',
    transparent: 'rgba(0,0,0,0)',
  },
  space: {
    $0: 0,
    '$0.5': 2,
    $1: 4,
    '$1.5': 6,
    $2: 8,
    '$2.5': 10,
    $3: 12,
    $4: 16,
    $5: 20,
    $6: 24,
    $7: 28,
    $8: 32,
    $9: 36,
    $10: 40,
    $12: 48,
    $16: 64,
    $20: 80,
    $true: 16,
  },
  size: {
    $0: 0,
    '$0.5': 2,
    $1: 4,
    '$1.5': 6,
    $2: 8,
    '$2.5': 10,
    $3: 12,
    $4: 16,
    $5: 20,
    $6: 24,
    $7: 28,
    $8: 32,
    $9: 36,
    $10: 40,
    $12: 48,
    $16: 64,
    $20: 80,
    $true: 16,
  },
  radius: {
    $0: 0,
    $1: 3,
    $2: 6,
    $3: 10,
    $4: 14,
    $5: 18,
    $6: 24,
    $full: 9999,
    $true: 6,
  },
  zIndex: {
    $0: 0,
    $1: 100,
    $2: 200,
    $3: 300,
    $4: 400,
    $5: 500,
  },
});

// ─── Light theme (warm parchment) ────────────────────────────────────────────
const lightTheme = {
  background: '#f5f0e8',
  backgroundHover: '#ede7d9',
  backgroundPress: '#d9d0c0',
  backgroundFocus: '#ede7d9',
  backgroundStrong: '#ede7d9',
  backgroundTransparent: 'rgba(0,0,0,0)',

  borderColor: '#d9d0c0',
  borderColorHover: '#8c8578',
  borderColorFocus: '#5a7a4a',
  borderColorPress: '#3d5c30',

  color: '#2e2a22',
  colorHover: '#2e2a22',
  colorPress: '#2e2a22',
  colorFocus: '#2e2a22',
  colorMuted: '#8c8578',
  colorTransparent: 'rgba(0,0,0,0)',

  placeholderColor: '#8c8578',

  // Color scale (used by Tamagui components internally)
  color1: '#faf8f4',
  color2: '#f5f0e8',
  color3: '#ede7d9',
  color4: '#d9d0c0',
  color5: '#d9d0c0',
  color6: '#8c8578',
  color7: '#6e6860',
  color8: '#8c8578',
  color9: '#5a7a4a',
  color10: '#3d5c30',
  color11: '#2e2a22',
  color12: '#2e2a22',

  shadowColor: 'rgba(46, 42, 34, 0.07)',
  shadowColorHover: 'rgba(46, 42, 34, 0.12)',

  accentBackground: '#5a7a4a',
  accentColor: '#f5f0e8',
};

// ─── Dark theme (warm olive/charcoal) ────────────────────────────────────────
const darkTheme = {
  background: '#1e1e16',
  backgroundHover: '#2a2a1e',
  backgroundPress: '#3a3a2a',
  backgroundFocus: '#2a2a1e',
  backgroundStrong: '#2a2a1e',
  backgroundTransparent: 'rgba(0,0,0,0)',

  borderColor: '#3a3a2a',
  borderColorHover: '#9e9880',
  borderColorFocus: '#7a9e6e',
  borderColorPress: '#5a7a4a',

  color: '#e8e2d8',
  colorHover: '#e8e2d8',
  colorPress: '#e8e2d8',
  colorFocus: '#e8e2d8',
  colorMuted: '#9e9880',
  colorTransparent: 'rgba(0,0,0,0)',

  placeholderColor: '#9e9880',

  color1: '#1e1e16',
  color2: '#1e1e16',
  color3: '#2a2a1e',
  color4: '#3a3a2a',
  color5: '#3a3a2a',
  color6: '#9e9880',
  color7: '#9e9880',
  color8: '#9e9880',
  color9: '#7a9e6e',
  color10: '#5a7a4a',
  color11: '#e8e2d8',
  color12: '#e8e2d8',

  shadowColor: 'rgba(0,0,0,0.3)',
  shadowColorHover: 'rgba(0,0,0,0.45)',

  accentBackground: '#7a9e6e',
  accentColor: '#1e1e16',
};

// ─── Cactus sub-theme (applied to buttons / accent elements) ─────────────────
const cactusTheme = {
  ...lightTheme,
  background: '#5a7a4a',
  backgroundHover: '#3d5c30',
  backgroundPress: '#3d5c30',
  backgroundFocus: '#7a9e6e',
  color: '#f5f0e8',
  colorHover: '#f5f0e8',
  borderColor: '#3d5c30',
};

// ─── Animations ───────────────────────────────────────────────────────────────
const animations = createAnimations({
  quick: 'ease-out 150ms',
  medium: 'ease-out 300ms',
  slow: 'ease-out 450ms',
  bouncy: 'cubic-bezier(0.34, 1.56, 0.64, 1) 350ms',
});

// ─── Fonts ────────────────────────────────────────────────────────────────────
const bodyFont = createInterFont(
  {
    size: {
      1: 11,
      2: 12,
      3: 13,
      4: 14,
      5: 15,
      6: 16,
      7: 18,
      8: 20,
      9: 22,
      10: 24,
    },
    weight: {
      4: '300',
      7: '500',
      8: '600',
      9: '700',
    },
    letterSpacing: {
      4: 0,
      8: -0.5,
    },
  },
  { sizeLineHeight: (size) => size + 4 }
);

const headingFont = createInterFont(
  {
    size: {
      6: 18,
      7: 22,
      8: 28,
      9: 36,
      10: 48,
    },
    weight: {
      6: '600',
      7: '700',
      8: '800',
      9: '900'
    },
    letterSpacing: {
      5: -0.2,
      6: -0.5,
      7: -1,
      8: -1.5,
      9: -2,
      10: -3,
    },
  },
  { sizeLineHeight: (size) => size + 6 }
);

// ─── Media queries ────────────────────────────────────────────────────────────
const media = {
  xs: { maxWidth: 480 },
  sm: { maxWidth: 640 },
  md: { maxWidth: 768 },
  lg: { maxWidth: 1024 },
  xl: { maxWidth: 1280 },
  gtXs: { minWidth: 481 },
  gtSm: { minWidth: 641 },
  gtMd: { minWidth: 769 },
  gtLg: { minWidth: 1025 },
};

// ─── Final config ─────────────────────────────────────────────────────────────
const config = createTamagui({
  animations,
  defaultTheme: 'light',
  shouldAddPrefersColorTheme: false,
  themeClassNameOnRoot: true,

  shorthands,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    light: lightTheme,
    dark: darkTheme,
    light_cactus: cactusTheme,
  },
  tokens,
  media,
});

// FOOLPROOF FIX: Manually call setupDev to prevent 'visualizer' undefined crash
if (typeof setupDev !== 'undefined') {
  setupDev(config);
}

export type AppConfig = typeof config;

declare module 'tamagui' {
  interface TamaguiCustomConfig extends AppConfig { }
}

export default config;
