import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
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
import { colors, fonts, radius, shadow, space, type } from '@/theme';
import { tapLight } from '@/lib/haptics';

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
  const palette: Record<ButtonVariant, { bg: string; fg: string; border?: string }> = {
    primary: { bg: colors.forest, fg: colors.onDark },
    accent: { bg: colors.claret, fg: colors.onDark },
    ghost: { bg: 'transparent', fg: colors.ink, border: colors.rule },
    ghostLight: { bg: 'transparent', fg: colors.onDark, border: 'rgba(242,233,218,0.42)' },
    brass: { bg: colors.brassTint, fg: colors.ink, border: 'rgba(168,127,63,0.5)' },
    quiet: { bg: colors.paperDeep, fg: colors.ink },
    paper: { bg: colors.paper, fg: colors.ink },
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
  color = colors.ink,
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
          borderColor: colors.rule,
          backgroundColor: bordered ? colors.paperSoft : 'transparent',
          opacity: pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Feather name={name} size={Math.round(size * 0.4)} color={color} />
    </Pressable>
  );
}

/* --------------------------------- chrome -------------------------------- */

export function Rule({ style, color }: { style?: StyleProp<ViewStyle>; color?: string }) {
  return (
    <View
      style={[
        { height: StyleSheet.hairlineWidth, backgroundColor: color ?? colors.rule },
        style,
      ]}
    />
  );
}

const sourceTone: Record<Source, string> = {
  licensed: colors.verified,
  public: '#3E5A78',
  unverified: colors.inkSoft,
  excluded: colors.danger,
};

export function SourceMark({ source, showLabel = false }: { source: Source; showLabel?: boolean }) {
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
        <Txt variant="meta" color={colors.inkSoft}>
          {label}
        </Txt>
      ) : null}
    </View>
  );
}

export function Cover({ book, width = 44 }: { book?: Book; width?: number }) {
  const height = Math.round(width * 1.46);
  if (!book) {
    return (
      <View
        style={{
          width,
          height,
          borderWidth: 1,
          borderColor: colors.rule,
          borderStyle: 'dashed',
          borderRadius: 2,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Feather name="book" size={width * 0.4} color={colors.inkSoft} />
      </View>
    );
  }
  const compact = width < 40;
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 2,
        backgroundColor: book.color,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(27,22,17,0.25)',
      }}
    >
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
              color={colors.onDark}
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
  const tones = {
    default: { border: colors.rule, fg: colors.inkMid, bg: 'transparent' },
    brass: { border: 'rgba(168,127,63,0.55)', fg: '#6E5224', bg: colors.brassTint },
    claret: { border: 'rgba(142,47,54,0.35)', fg: colors.claret, bg: colors.claretTint },
    forest: { border: colors.forest, fg: colors.onDark, bg: colors.forest },
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
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        { flex: 1, backgroundColor: colors.paper, paddingTop: insets.top },
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
  return (
    <View style={{ paddingTop: 6, paddingBottom: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        {onBack ? (
          <IconBtn name="chevron-left" label="Wróć" onPress={onBack} size={38} />
        ) : null}
        <View style={{ flex: 1 }}>
          <Txt variant={large ? 'display' : 'title'}>{title}</Txt>
          {subtitle ? (
            <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
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
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper, paddingTop: insets.top }}>
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
          styles.sheet,
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
        <View style={styles.grabber} />
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
        borderRadius: 14,
        padding: 3,
        backgroundColor: value ? colors.forest : colors.paperDeep,
        borderWidth: 1,
        borderColor: value ? colors.forest : colors.rule,
        alignItems: value ? 'flex-end' : 'flex-start',
      }}
    >
      <View
        style={{
          width: 21,
          height: 19,
          borderRadius: 10,
          backgroundColor: value ? colors.paperSoft : colors.paperSoft,
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
            color={n <= value ? colors.brass : colors.rule}
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
  const [focused, setFocused] = useState(false);
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
          <Txt variant="label" color={colors.inkMid}>
            {label}
          </Txt>
          {counter ? (
            <Txt variant="meta" color={colors.inkSoft}>
              {counter}
            </Txt>
          ) : null}
        </View>
      ) : null}
      <TextInput
        placeholderTextColor="rgba(135,121,100,0.75)"
        selectionColor={colors.claret}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          styles.input,
          {
            borderColor: error ? colors.claret : focused ? colors.ink : colors.rule,
            backgroundColor: colors.paperSoft,
          },
          style,
        ]}
        {...rest}
      />
      {error ? (
        <Txt variant="small" color={colors.claret} style={{ marginTop: 6 }}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 6 }}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <ActivityIndicator color={colors.claret} />
      {label ? (
        <Txt variant="small" color={colors.inkSoft}>
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
  return (
    <View style={[styles.empty, centered ? styles.emptyCentered : null]}>
      <Feather name={icon} size={30} color={colors.inkMid} style={{ marginBottom: 16 }} />
      <Txt variant="title" align={centered ? 'center' : 'left'} style={{ marginBottom: 8 }}>
        {title}
      </Txt>
      <Txt
        variant="body"
        color={colors.inkMid}
        align={centered ? 'center' : 'left'}
        style={{ marginBottom: 20, maxWidth: 320 }}
      >
        {body}
      </Txt>
      {action ? <View style={centered ? styles.emptyAction : undefined}>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    borderRadius: 3,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.paper,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: space.page,
    paddingTop: 10,
    paddingBottom: 26,
    borderTopWidth: 1,
    borderColor: colors.rule,
    ...(shadow as object),
    maxHeight: '88%',
  },
  grabber: {
    alignSelf: 'center',
    width: 38,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.rule,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.read,
    fontSize: 16,
    lineHeight: 23,
    color: colors.ink,
    minHeight: 48,
  },
});
