import React, { createContext, useContext, useCallback } from 'react';
import { Platform, TextStyle } from 'react-native';

/**
 * Margines — design tokens.
 *
 * Light palette: mist and sage.
 * Dark palette: deep charcoal with sage accents.
 *
 * Tryb jest sterowany przez ThemeContext (patrz useColors / ThemeProvider).
 * Eksport `colors` zachowuje wsteczną kompatybilność (jasny motyw jako domyślny).
 */

export type Theme = 'light' | 'dark';

export const lightColors = {
  background: '#F7F8F6',
  surface: '#ECEEEA',
  primary: '#4B5548',
  accent: '#A3AE9C',
  text: '#1D221C',
  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  paper: '#F7F8F6',
  paperSoft: '#F7F8F6',
  paperDeep: '#ECEEEA',
  ink: '#1D221C',
  inkMid: '#4B5548',
  inkSoft: '#A3AE9C',
  rule: 'rgba(29, 34, 28, 0.16)',
  ruleSoft: 'rgba(29, 34, 28, 0.09)',
  forest: '#4B5548',
  forestDeep: '#1D221C',
  forestTint: '#ECEEEA',
  claret: '#DC2626',
  claretTint: 'rgba(220, 38, 38, 0.09)',
  brass: '#D97706',
  brassTint: 'rgba(217, 119, 6, 0.13)',
  verified: '#16A34A',
  onDark: '#F7F8F6',
  onDarkSoft: 'rgba(247, 248, 246, 0.62)',
  danger: '#DC2626',
};

export const darkColors = {
  background: '#151615',
  surface: '#232423',
  primary: '#E0ECDC',
  accent: '#A4AD9E',
  text: '#ECEFEB',
  success: '#4ADE80',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',

  paper: '#151615',
  paperSoft: '#151615',
  paperDeep: '#232423',
  ink: '#ECEFEB',
  inkMid: '#E0ECDC',
  inkSoft: '#A4AD9E',
  rule: 'rgba(236, 239, 235, 0.16)',
  ruleSoft: 'rgba(236, 239, 235, 0.09)',
  forest: '#E0ECDC',
  forestDeep: '#ECEFEB',
  forestTint: '#232423',
  claret: '#F87171',
  claretTint: 'rgba(248, 113, 113, 0.09)',
  brass: '#FBBF24',
  brassTint: 'rgba(251, 191, 36, 0.13)',
  verified: '#4ADE80',
  onDark: '#151615',
  onDarkSoft: 'rgba(21, 22, 21, 0.62)',
  danger: '#F87171',
};

function makeShadow(theme: Theme) {
  const color = theme === 'dark' ? '#ECEFEB' : '#1D221C';
  return Platform.select({
    web: { boxShadow: `0 18px 50px rgba(${theme === 'dark' ? '236, 239, 235' : '29, 34, 28'}, 0.22)` } as object,
    default: {
      shadowColor: color,
      shadowOpacity: 0.18,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 12 },
      elevation: 8,
    },
  }) ?? {};
}

export const fonts = {
  read: 'Literata_400Regular',
  readItalic: 'Literata_400Regular_Italic',
  medium: 'Literata_500Medium',
  semi: 'Literata_600SemiBold',
  bold: 'Literata_700Bold',
  ui: 'BricolageGrotesque_400Regular',
  uiMedium: 'BricolageGrotesque_500Medium',
  uiSemi: 'BricolageGrotesque_600SemiBold',
  uiBold: 'BricolageGrotesque_700Bold',
};

/** Type scale. Reading sizes are set for comfortable 30–35 character measures. */
export const type = {
  display: { fontFamily: fonts.semi, fontSize: 30, lineHeight: 36, letterSpacing: -0.4 } as TextStyle,
  title: { fontFamily: fonts.semi, fontSize: 22, lineHeight: 28, letterSpacing: -0.2 } as TextStyle,
  reading: { fontFamily: fonts.read, fontSize: 22, lineHeight: 33 } as TextStyle,
  body: { fontFamily: fonts.read, fontSize: 16, lineHeight: 25 } as TextStyle,
  reaction: { fontFamily: fonts.readItalic, fontSize: 17, lineHeight: 25 } as TextStyle,
  label: { fontFamily: fonts.uiSemi, fontSize: 15, lineHeight: 20 } as TextStyle,
  small: { fontFamily: fonts.ui, fontSize: 13, lineHeight: 18 } as TextStyle,
  meta: { fontFamily: fonts.uiMedium, fontSize: 11.5, lineHeight: 15, letterSpacing: 0.2 } as TextStyle,
  micro: { fontFamily: fonts.uiMedium, fontSize: 10, lineHeight: 13, letterSpacing: 0.3 } as TextStyle,
};

export const space = {
  page: 22,
  card: 24,
  gutter: 12,
};

export const radius = {
  sheet: 12,
  card: 12,
  chip: 12,
  pill: 999,
};

export const gutter = 22;

export const hairline = 1;

/* -------------------------------------------------------------------------- */
/* Theme context                                                              */
/* -------------------------------------------------------------------------- */

const ThemeContext = createContext<{ theme: Theme; colors: typeof lightColors; setTheme: (next: Theme) => void } | null>(null);

export function useColors() {
  const ctx = useContext(ThemeContext);
  return ctx ? ctx.colors : lightColors;
}

export interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: Theme;
  onChange?: (theme: Theme) => void;
}

export function ThemeProvider({ children, theme = 'light', onChange }: ThemeProviderProps) {
  const colors = theme === 'dark' ? darkColors : lightColors;

  const setTheme = useCallback(
    (next: Theme) => {
      onChange?.(next);
    },
    [onChange],
  );

  return (
    <ThemeContext.Provider value={{ theme, colors, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Backward-compatible static export (light theme). Components can migrate to useColors(). */
export const colors = lightColors;

/** Static shadow for light theme (used where context is not available). */
export const shadow = makeShadow('light');
