import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Book, Source } from '@/data/types';
import { fonts, radius, shadow, space, type, useColors } from '@/theme';
import { tapLight } from '@/lib/haptics';
import { coverCandidates } from '@/lib/covers';

/* --------------------------------- text --------------------------------- */

type TxtProps = TextProps & {
  variant?: keyof typeof type;
  color?: string;
  align?: TextStyle['textAlign'];
};

export function Txt({ variant = 'body', color, align, style, ...rest }: TxtProps) {
  return (
    <Text
      style={[type[variant], color ? { color } : null, align ? { textAlign: align } : null, style]}
      {...rest}
    />
  );
}

/* -------------------------------- buttons -------------------------------- */

type ButtonVariant = 'primary' | 'accent' | 'ghost' | 'ghostLight' | 'brass' | 'quiet' | 'paper';

export function Btn({
  label,
  onPress,
  variant = 'primary',
  disabled,
  icon,
  style,
  full = true,
}: {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  icon?: keyof typeof Feather.glyphMap;
  style?: StyleProp<ViewStyle>;
  full?: boolean;
}) {
  const c = useColors();
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: c.forest, fg: c.onDark },
    accent: { bg: c.claret, fg: c.onDark },
    ghost: { bg: 'transparent', fg: c.ink, border: c.rule },
    ghostLight: { bg: 'transparent', fg: c.onDark, border: 'rgba(242,233,218,0.42)' },
    brass: { bg: c.brassTint, fg: c.ink, border: 'rgba(168,127,63,0.5)' },
    quiet: { bg: c.paperDeep, fg: c.ink },
    paper: { bg: c.paper, fg: c.ink },
  };
  const tone = palette[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        void tapLight();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.btn,
        full ? { alignSelf: 'stretch' } : null,
        {
          backgroundColor: tone.bg,
          borderColor: tone.border ?? 'transparent',
          borderWidth: tone.border ? 1 : 0,
          opacity: disabled ? 0.42 : pressed ? 0.88 : 1,
        },
        pressed && !disabled ? { transform: [{ translateY: 1 }] } : null,
        style,
      ]}
    >
      {icon ? (
        <Feather name={icon} size={16} color={tone.fg} style={{ marginRight: 8 }} />
      ) : null}
      <Txt variant="label" color={tone.fg} style={{ fontSize: 15 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

export function IconBtn({
  name,
  onPress,
  size = 44,
  color = undefined,
  label,
  bordered = true,
  style,
}: {
  name: keyof typeof Feather.glyphMap;
  onPress?: () => void;
  size?: number;
  color?: string;
  label: string;
  bordered?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const iconColor = color ?? c.ink;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => {
        void tapLight();
        onPress?.();
      }}
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: bordered ? 1 : 0,
          borderColor: c.rule,
          backgroundColor: bordered ? c.paperSoft : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Feather name={name} size={Math.round(size * 0.4)} color={iconColor} />
    </Pressable>
  );
}

/* --------------------------------- chrome -------------------------------- */

export function Rule({ style, color }: { style?: StyleProp<ViewStyle>; color?: string }) {
  const c = useColors();
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: color ?? c.rule },
        style,
      ]}
    />
  );
}

const sourceToneLight: Record<Source, string> = {
  licensed: '#16A34A',
  public: '#3E5A78',
  unverified: '#A3AE9C',
  excluded: '#DC2626',
};

const sourceToneDark: Record<Source, string> = {
  licensed: '#4ADE80',
  public: '#3E5A78',
  unverified: '#A4AD9E',
  excluded: '#F87171',
};

export function SourceMark({ source, showLabel = false }: { source: Source; showLabel?: boolean }) {
  const c = useColors();
  const sourceTone = c.background === '#F7F8F6' ? sourceToneLight : sourceToneDark;

  const label =
    source === 'licensed'
      ? 'źródło licencjonowane'
      : source === 'public'
        ? 'domena publiczna'
        : source === 'excluded'
          ? 'wyłączone'
          : 'źródło niezweryfikowane';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View
        style={{
          width: 7,
          height: 7,
          borderRadius: 4,
          backgroundColor: sourceTone[source],
        }}
      />
      {showLabel ? (
        <Txt variant="meta" color={c.inkSoft}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

/** Drawn cover used while the real artwork loads, and for books without one. */
function DrawnCover({ book, width }: { book: Book; width: number }) {
  const c = useColors();
  const compact = width < 40;
  return (
    <View
      style={{
        flex: 1,
        margin: Math.max(2, width * 0.08),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(242,233,218,0.32)',
        padding: compact ? 2 : width * 0.09,
      }}
    >
      {compact ? null : (
        <>
          <Txt
            variant="meta"
            color={c.onDark}
            numberOfLines={3}
            style={{
              fontSize: Math.max(7, width * 0.155),
              lineHeight: Math.max(9, width * 0.2),
              letterSpacing: 0,
            }}
          >
            {book.title}
          </Txt>
          <View style={{ flex: 1 }} />
          {width >= 64 ? (
            <Txt
              variant="micro"
              color="rgba(242,233,218,0.7)"
              numberOfLines={1}
              style={{ fontSize: Math.max(5.5, width * 0.105) }}
            >
              {book.author}
            </Txt>
          ) : null}
        </>
      )}
    </View>
  );
}

/**
 * Book cover at a fixed width with the standard 2:3 book proportion, so every
 * list, card and sheet shows the same shape. Real artwork is used when it can
 * be resolved; the drawn cover sits behind it as a loading placeholder.
 */
export function Cover({ book, width = 44 }: { book?: Book; width?: number }) {
  const c = useColors();
  const height = Math.round(width * 1.5);
  const [failed, setFailed] = useState<Record<string, boolean>>({});

  // Google Books first, Open Library second — both by ISBN. If neither has
  // artwork, the drawn cover underneath stays visible.
  const { primary, fallback } = coverCandidates(book);
  const artworkUri =
    primary && !failed[primary] ? primary : fallback && !failed[fallback] ? fallback : null;

  if (!book) {
    return (
      <View
        style={{
          width,
          height,
          borderWidth: 1,
          borderColor: c.rule,
          borderStyle: 'dashed',
          borderRadius: 3,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="book" size={width * 0.4} color={c.inkSoft} />
      </View>
    );
  }

  return (
    <View
      accessibilityLabel={`Okładka książki ${book.title}`}
      style={{
        width,
        height,
        borderRadius: 3,
        backgroundColor: book.color,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(27,22,17,0.25)',
      }}
    >
      <DrawnCover book={book} width={width} />
      {artworkUri ? (
        <Image
          source={{ uri: artworkUri }}
          style={{ position: 'absolute', top: 0, left: 0, width, height }}
          resizeMode="cover"
          onError={() => setFailed((prev) => ({ ...prev, [artworkUri]: true }))}
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}

export function Pill({
  label,
  active,
  onPress,
  tone = 'default',
  small,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  tone?: 'default' | 'brass' | 'claret' | 'forest';
  small?: boolean;
}) {
  const c = useColors();
  const tones = {
    default: { border: c.rule, fg: c.inkMid, bg: 'transparent' },
    brass: { border: 'rgba(168,127,63,0.55)', fg: '#6E5224', bg: c.brassTint },
    claret: { border: 'rgba(142,47,54,0.35)', fg: c.claret, bg: c.claretTint },
    forest: { border: c.forest, fg: c.onDark, bg: c.forest },
  }[tone];
  const content = (
    <Txt
      variant="meta"
      style={{
        fontSize: small ? 10.5 : 11.5,
        color: tones.fg,
        letterSpacing: 0.15,
      }}
    >
      {label}
    </Txt>
  );
  const base: ViewStyle = {
    paddingHorizontal: small ? 8 : 11,
    paddingVertical: small ? 4 : 6,
    borderRadius: radius.chip,
    borderWidth: 1,
    borderColor: active ? tones.border : tones.border,
    backgroundColor: active ? tones.bg : 'transparent',
    alignSelf: 'flex-start',
  };
  if (!onPress) return <View style={base}>{content}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        void tapLight();
        onPress();
      }}
      style={({ pressed }) => [
        base,
        active ? { backgroundColor: tones.bg } : null,
        pressed ? { opacity: 0.65 } : null,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function Screen({
  children,
  style,
  padded = true,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  padded?: boolean;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: c.paper, paddingTop: insets.top },
        padded ? { paddingHorizontal: space.page } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  right,
  large,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
}) {
  const c = useColors();
  return (
    <View style={{ paddingTop: 6, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack ? (
          <IconBtn name="chevron-left" label="Wróć" onPress={onBack} size={38} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt variant={large ? 'display' : 'title'}>{title}</Txt>
          {subtitle ? (
            <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function ScrollScreen({
  children,
  header,
  padded = true,
  contentStyle,
}: {
  children: React.ReactNode;
  header?: React.ReactNode;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      {header ? <View style={padded ? { paddingHorizontal: space.page } : null}>{header}</View> : null}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          {
            paddingHorizontal: padded ? space.page : 0,
            paddingBottom: 36,
          },
          contentStyle,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </View>
  );
}

/* --------------------------------- sheet --------------------------------- */

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(progress, {
        toValue: 1,
        duration: 190,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(progress, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, progress]);

  if (!mounted) return null;

  const ss = sheetStyles(c);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Animated.View
        style={[StyleSheet.absoluteFill, { opacity: progress }]}
        pointerEvents="auto"
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(11,36,30,0.38)' }}
          onPress={onClose}
          accessibilityLabel="Zamknij"
        />
      </Animated.View>
      <Animated.View
        style={[
          ss.sheet,
          {
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [48, 0],
                }),
              },
            ],
          },
        ]}
      >
        <View style={ss.grabber} />
        {title ? (
          <Txt variant="title" style={{ marginBottom: 14 }}>
            {title}
          </Txt>
        ) : null}
        {children}
      </Animated.View>
    </View>
  );
}

/* --------------------------------- forms --------------------------------- */

export function Toggle({
  value,
  onChange,
  label,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const c = useColors();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        void tapLight();
        onChange(!value);
      }}
      style={{
        width: 46,
        height: 27,
        borderRadius: 12,
        padding: 3,
        backgroundColor: value ? c.forest : c.paperDeep,
        borderWidth: 1,
        borderColor: value ? c.forest : c.rule,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 21,
          height: 19,
          borderRadius: 12,
          backgroundColor: value ? c.paperSoft : c.paperSoft,
        }}
      />
    </Pressable>
  );
}

export function Stars({
  value = 0,
  onChange,
  size = 22,
}: {
  value?: number;
  onChange?: (next: number) => void;
  size?: number;
}) {
  const c = useColors();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Pressable
          key={n}
          disabled={!onChange}
          hitSlop={4}
          accessibilityLabel={`Ocena ${n} z 5`}
          onPress={() => {
            void tapLight();
            onChange?.(n);
          }}
        >
          <Feather
            name="star"
            size={size}
            color={n <= value ? c.brass : c.rule}
          />
        </Pressable>
      ))}
    </View>
  );
}

export function Field({
  label,
  hint,
  error,
  counter,
  style,
  ...rest
}: TextInputProps & {
  label?: string;
  hint?: string;
  error?: string;
  counter?: string;
  style?: StyleProp<TextStyle>;
}) {
  const c = useColors();
  const [focused, setFocused] = useState(false);
  const is = inputStyles(c);
  return (
    <View>
      {label ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: 7,
          }}
        >
          <Txt variant="label" color={c.inkMid}>
            {label}
          </Txt>
          {counter ? (
            <Txt variant="meta" color={c.inkSoft}>
              {counter}
            </Txt>
          ) : null}
        </View>
      ) : null}
      <TextInput
        placeholderTextColor="rgba(135,121,100,0.75)"
        selectionColor={c.claret}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          is.input,
          {
            borderColor: error ? c.claret : focused ? c.ink : c.rule,
            backgroundColor: c.paperSoft,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Txt variant="small" color={c.claret} style={{ marginTop: 6 }}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  const c = useColors();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={c.claret} />
      {label ? (
        <Txt variant="small" color={c.inkSoft}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
  icon = 'book-open',
  centered = false,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  icon?: keyof typeof Feather.glyphMap;
  centered?: boolean;
}) {
  const c = useColors();
  return (
    <View style={[styles.empty, centered ? styles.emptyCentered : null]}>
      <Feather name={icon} size={30} color={c.inkMid} style={{ marginBottom: 16 }} />
      <Txt variant="title" align={centered ? 'center' : 'left'} style={{ marginBottom: 8 }}>
        {title}
      </Txt>
      <Txt
        variant="body"
        color={c.inkMid}
        align={centered ? 'center' : 'left'}
        style={{ marginBottom: 20, maxWidth: 320 }}
      >
        {body}
      </Txt>
      {action ? <View style={centered ? styles.emptyAction : undefined}>{action}</View> : null}
    </View>
  );
}

/* --------------------------------- styles --------------------------------- */

const staticStyles = StyleSheet.create({
  empty: {
    alignItems: 'flex-start',
    paddingVertical: 28,
  },
  emptyCentered: {
    alignItems: 'center',
    paddingVertical: 36,
  },
  emptyAction: {
    width: '100%',
    maxWidth: 300,
  },
  btn: {
    height: 52,
    borderRadius: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export { staticStyles };

function sheetStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    sheet: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: c.paper,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingHorizontal: space.page,
      paddingTop: 10,
      paddingBottom: 26,
      borderTopWidth: 1,
      borderColor: c.rule,
      ...(shadow as object),
      maxHeight: '88%',
    },
    grabber: {
      alignSelf: 'center',
      width: 38,
      height: 3,
      borderRadius: 12,
      backgroundColor: c.rule,
      marginBottom: 16,
    },
  });
}

function inputStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: fonts.read,
      fontSize: 16,
      lineHeight: 23,
      color: c.ink,
      minHeight: 48,
    },
  });
}

export { sheetStyles, inputStyles };

// Alias staticStyles as styles for backward compatibility
export const styles = staticStyles;
