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
import { ThemeProvider, useColors, fonts, lightColors, darkColors } from '@/theme';
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
        <AppBody />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

function AppBody() {
  const { state } = useStore();

  return (
    <ThemeProvider theme={state.theme}>
      <StatusBar style={state.theme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.root, { backgroundColor: state.theme === 'dark' ? '#151615' : '#F7F8F6' }]}>
        <View style={[styles.frame, { backgroundColor: state.theme === 'dark' ? '#232423' : '#ECEEEA' }]}>
          <RootStack theme={state.theme} />
        </View>
      </View>
    </ThemeProvider>
  );
}

function RootStack({ theme }: { theme: 'light' | 'dark' }) {
  const { state } = useStore();
  const colors = theme === 'dark' ? darkColors : lightColors;
  if (!state.hydrated) return <BootSplash colors={colors} />;

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

function BootSplash({ colors }: { colors?: ReturnType<typeof useColors> } = {}) {
  const c = colors ?? { background: '#F7F8F6', paper: '#F7F8F6', forest: '#4B5548', onDark: '#1D221C', onDarkSoft: '#A3AE9C' } as ReturnType<typeof useColors>;
  return (
    <View style={[styles.splash, { backgroundColor: c.forest }]}>
      <View style={{ alignItems: 'flex-start' }}>
        <Txt
          style={{ fontFamily: fonts.semi, fontSize: 30, color: c.onDark, letterSpacing: -0.4 }}
        >
          margines
        </Txt>
        <View
          style={{
            height: 1,
            width: 46,
            backgroundColor: 'rgba(251, 119, 6, 0.8)',
            marginVertical: 12,
          }}
        />
        <Txt variant="small" color={c.onDarkSoft}>
          fragmenty, które zostają w głowie
        </Txt>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
  },
  frame: {
    flex: 1,
    width: '100%',
    maxWidth: 480,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 26px 80px rgba(0,0,0,0.38)' } as object)
      : {}),
  },
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
