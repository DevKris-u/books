import { Platform, TextStyle } from 'react-native';

/**
 * Margines — design tokens.
 *
 * The app is set like a printed page: warm paper, deep binding-green structure,
 * a claret "pencil" used only for the reader's own voice, and brass reserved
 * for Hot Peak. Hairlines instead of shadows, tight corners instead of cards.
 */
export const colors = {
  paper: '#F2E9DA',
  paperSoft: '#F8F2E7',
  paperDeep: '#E7DBC6',
  ink: '#1B1611',
  inkMid: '#4E4335',
  inkSoft: '#877964',
  rule: 'rgba(27, 22, 17, 0.16)',
  ruleSoft: 'rgba(27, 22, 17, 0.09)',
  forest: '#12332B',
  forestDeep: '#0B241E',
  forestTint: '#E3E5D8',
  claret: '#8E2F36',
  claretTint: 'rgba(142, 47, 54, 0.09)',
  brass: '#A87F3F',
  brassTint: 'rgba(168, 127, 63, 0.13)',
  verified: '#3D6A4C',
  onDark: '#F2E9DA',
  onDarkSoft: 'rgba(242, 233, 218, 0.62)',
  danger: '#8E2F36',
};

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
  sheet: 20,
  card: 4,
  chip: 3,
  pill: 999,
};

export const gutter = 22;

export const hairline = 1;

export const shadow = Platform.select({
  web: { boxShadow: '0 18px 50px rgba(11, 36, 30, 0.22)' } as object,
  default: {
    shadowColor: '#0B241E',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
});
