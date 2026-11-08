import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme';
import { tapLight } from '@/lib/haptics';
import { Txt } from './ui';

const meta: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  index: { icon: 'book-open', label: 'Feed' },
  dodaj: { icon: 'plus', label: 'Dodaj' },
  biblioteka: { icon: 'bookmark', label: 'Biblioteka' },
  profil: { icon: 'user', label: 'Profil' },
};

export function MarginesTabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {state.routes.map((route, index) => {
        const info = meta[route.name] ?? { icon: 'circle' as const, label: route.name };
        const active = state.index === index;
        const isAdd = route.name === 'dodaj';

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

        if (isAdd) {
          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityLabel="Dodaj fragment"
              onPress={onPress}
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.85 : 1 }]}
            >
              <View style={styles.addDisc}>
                <Feather name="plus" size={20} color={colors.onDark} />
              </View>
              <Txt variant="meta" color={colors.onDarkSoft} style={styles.label}>
                Dodaj
              </Txt>
            </Pressable>
          );
        }

        return (
          <Pressable
            key={route.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={info.label}
            onPress={onPress}
            style={styles.slot}
          >
            {active ? <View style={styles.activeMark} /> : null}
            <Feather
              name={info.icon}
              size={19}
              color={active ? colors.onDark : colors.onDarkSoft}
            />
            <Txt
              variant="meta"
              color={active ? colors.onDark : colors.onDarkSoft}
              style={styles.label}
            >
              {info.label}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: colors.forest,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(168,127,63,0.35)',
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 4,
  },
  label: {
    fontSize: 10,
    fontFamily: fonts.uiMedium,
    letterSpacing: 0.1,
  },
  activeMark: {
    position: 'absolute',
    top: -8,
    width: 26,
    height: 2,
    backgroundColor: colors.brass,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
  },
  addDisc: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.claret,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(242,233,218,0.55)',
  },
});
