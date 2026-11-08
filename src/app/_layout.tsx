import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  BricolageGrotesque_400Regular,
  BricolageGrotesque_500Medium,
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
} from '@expo-google-fonts/bricolage-grotesque';
import {
  Literata_400Regular,
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
  Literata_700Bold,
} from '@expo-google-fonts/literata';
import { StoreProvider, useStore } from '@/state/store';
import { colors, fonts } from '@/theme';
import { Txt } from '@/components/ui';

export default function RootLayout() {
  const [loaded, error] = useFonts({
    Literata_400Regular,
    Literata_400Regular_Italic,
    Literata_500Medium,
    Literata_600SemiBold,
    Literata_700Bold,
    BricolageGrotesque_400Regular,
    BricolageGrotesque_500Medium,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
  });

  if (!loaded && !error) return <BootSplash />;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="dark" />
        <View style={styles.root}>
          <View style={styles.frame}>
            <RootStack />
          </View>
        </View>
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function RootStack() {
  const { state } = useStore();
  if (!state.hydrated) return <BootSplash />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.paper },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="onboarding" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="hot-peak" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="pro" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="zglos" />
      <Stack.Screen name="ksiazka/[id]" />
      <Stack.Screen name="ustawienia" />
      <Stack.Screen name="panel-wydawcy" />
    </Stack>
  );
}

function BootSplash() {
  return (
    <View style={styles.splash}>
      <View style={{ alignItems: 'flex-start' }}>
        <Txt
          style={{ fontFamily: fonts.semi, fontSize: 30, color: colors.onDark, letterSpacing: -0.4 }}
        >
          margines
        </Txt>
        <View
          style={{
            height: 1,
            width: 46,
            backgroundColor: 'rgba(168,127,63,0.8)',
            marginVertical: 12,
          }}
        />
        <Txt variant="small" color={colors.onDarkSoft}>
          fragmenty, które zostają w głowie
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.forestDeep,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.paper,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 26px 80px rgba(0,0,0,0.38)' } as object)
      : {}),
  },
  splash: {
    flex: 1,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
