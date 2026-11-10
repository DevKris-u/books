import { Feather } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { tapLight } from '@/lib/haptics';

const meta: Record<string, { icon: keyof typeof Feather.glyphMap; label: string }> = {
  index: { icon: 'book-open', label: 'Feed' },
  dodaj: { icon: 'plus', label: 'Dodaj' },
  biblioteka: { icon: 'bookmark', label: 'Biblioteka' },
  profil: { icon: 'user', label: 'Profil' },
};

export function MarginesTabBar({ state, navigateToTab, emitter, insets }: BottomTabBarProps) {
  const c = useColors();

  return (
    <View
      style={[
        styles.dock,
        {
          backgroundColor: c.paper,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <View style={[styles.bar, { backgroundColor: c.paper }]}> 
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
              style={({ pressed }) => [styles.slot, { opacity: pressed ? 0.65 : 1 }]}
            >
              {active ? <View style={[styles.activeCap, { backgroundColor: c.info }]} /> : null}
              <Feather
                name={info.icon}
                size={21}
                color={active ? c.info : c.inkSoft}
                style={styles.icon}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dock: {
    width: '100%',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
    height: 70,
  },
  slot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeCap: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 3,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  icon: {
    marginTop: 5,
  },
});
