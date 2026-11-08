import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router/js-tabs';
import React from 'react';
import { MarginesTabBar } from '@/components/TabBar';
import { useStore } from '@/state/store';
import { colors } from '@/theme';

export default function TabsLayout() {
  const { state } = useStore();

  if (!state.onboarded) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      tabBar={(props) => <MarginesTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Feed' }} />
      <Tabs.Screen name="biblioteka" options={{ title: 'Biblioteka' }} />
      <Tabs.Screen name="dodaj" options={{ title: 'Dodaj' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
