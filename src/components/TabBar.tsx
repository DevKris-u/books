import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';
import { tapLight } from '@/lib/haptics';

const meta: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  index: { icon: 'book-open', label: 'Feed' },
  dodaj: { icon: 'plus', label: 'Dodaj' },
  biblioteka: { icon: 'bookmark', label: 'Biblioteka' },
  profil: { icon: 'user', label: 'Profil' },
};

export function MarginesTabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  return (
    <View
      style={[
        styles.dock,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          paddingLeft: Math.max(insets.left, 18),
          paddingRight: Math.max(insets.right, 18),
        },
      ]}
    >
      <BlurView intensity={40} tint="dark" style={styles.bar}>
        <View pointerEvents="none" style={styles.tint} />
        {state.routes.map((route, index) => {
          const info = meta[route.name] ?? { icon: 'circle' as const, label: route.name };
          const active = state.index === index;

          const onPress = () => {
            void tapLight();
            const event = emitter.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!active && !event.defaultPrevented) {
              navigateToTab(route.key);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              accessibilityLabel={info.label}
              onPress={onPress}
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Feather
                name={info.icon}
                size={active ? 24 : 20}
                color={active ? colors.brass : colors.onDarkSoft}
                style={active ? styles.iconActive : null}
              />
            </Pressable>
          );
        })}
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    height: 64,
    paddingHorizontal: 8,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(242,233,218,0.22)',
    ...(Platform.select({
      web: { boxShadow: '0 18px 44px rgba(11,36,30,0.38)' } as object,
      default: {
        shadowColor: colors.forestDeep,
        shadowOpacity: 0.34,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 12 },
        elevation: 10,
      },
    }) ?? {}),
  },
  tint: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(11,36,30,0.42)',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    transform: [{ scale: 1.05 }],
  },
});
