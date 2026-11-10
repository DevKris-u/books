import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useColors } from '@/theme';
import { tapLight } from '@/lib/haptics';

const meta: Record<
  string,
  {
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
    label: string;
  }
> = {
  index: { icon: 'book-outline', iconActive: 'book', label: 'Feed' },
  dodaj: { icon: 'add-circle-outline', iconActive: 'add-circle', label: 'Dodaj' },
  biblioteka: { icon: 'bookmark-outline', iconActive: 'bookmark', label: 'Biblioteka' },
  profil: { icon: 'person-outline', iconActive: 'person', label: 'Profil' },
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
          const info = meta[route.name] ?? {
            icon: 'ellipse-outline' as const,
            iconActive: 'ellipse' as const,
            label: route.name,
          };
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
              <Ionicons
                name={active ? info.iconActive : info.icon}
                size={22}
                color={active ? c.ink : c.inkSoft}
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
  icon: {
    marginTop: 5,
  },
});
