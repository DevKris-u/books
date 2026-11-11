import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

const BENEFITS = [
  {
    title: 'Twoje fragmenty wracają na każdym urządzeniu',
    body: 'Telefon, tablet, przeglądarka — ta sama biblioteka i te same wpisy.',
  },
  {
    title: 'Podpis, nie anonimowy numer',
    body: 'Przy fragmencie widnieje Twoje imię i nazwa użytkownika.',
  },
  {
    title: 'Wychodzisz, kiedy chcesz',
    body: 'Wylogowanie albo usunięcie konta razem z wpisami — bez maila do supportu.',
  },
];

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ next?: string }>();
  const { state } = useStore();
  const { user, signInWithGoogle } = useAuth();
  const c = useColors();
  const styles = makeStyles(c, state.theme === 'dark');

  const next =
    typeof params.next === 'string' && params.next.startsWith('/') ? params.next : '/';
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || busy) return;
    router.replace(next);
  }, [user, busy, next, router]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const done = await signInWithGoogle(next);
      if (!done) setBusy(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Nie udało się zalogować. Spróbuj ponownie.',
      );
      setBusy(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style={state.theme === 'dark' ? 'dark' : 'light'} />

      <View style={styles.topBar}>
        <Pressable
          onPress={leave}
          accessibilityRole="button"
          accessibilityLabel="Wróć"
          hitSlop={10}
          style={styles.back}
        >
          <Feather name="chevron-left" size={20} color={c.onDark} />
        </Pressable>
        <Txt style={styles.wordmark}>margines</Txt>
        <Txt variant="meta" color={c.onDarkSoft}>
          konto
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28 }}
      >
        <View style={styles.eyebrow}>
          <View style={styles.dot} />
          <Txt variant="meta" color={c.brass}>
            publikowanie
          </Txt>
        </View>

        <Txt style={styles.headline}>Zostaw po sobie margines.</Txt>

        <View style={styles.leadRow}>
          <View style={styles.leadRule} />
          <Txt variant="body" color={c.onDarkSoft} style={styles.lead}>
            Konto potrzebne jest tylko wtedy, gdy chcesz opublikować fragment. Czytanie
            i przeglądanie zostaje bez logowania.
          </Txt>
        </View>

        <View style={styles.benefits}>
          {BENEFITS.map((benefit, index) => (
            <View
              key={benefit.title}
              style={[styles.benefit, index > 0 ? styles.benefitBorder : null]}
            >
              <Txt variant="meta" color={c.brass} style={styles.benefitIndex}>
                {`0${index + 1}`}
              </Txt>
              <View style={{ flex: 1 }}>
                <Txt variant="label" color={c.onDark}>
                  {benefit.title}
                </Txt>
                <Txt variant="small" color={c.onDarkSoft} style={{ marginTop: 3 }}>
                  {benefit.body}
                </Txt>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {error ? (
          <View style={styles.error}>
            <Feather name="alert-circle" size={14} color={c.claret} />
            <Txt variant="small" color={c.onDark} style={{ flex: 1 }}>
              {error}
            </Txt>
          </View>
        ) : null}

        <Pressable
          onPress={() => void start()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Kontynuuj z Google"
          style={({ pressed }) => [
            styles.googleBtn,
            { opacity: busy ? 0.7 : pressed ? 0.9 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={c.ink} />
          ) : (
            <>
              <View style={styles.googleMark}>
                <Txt style={styles.googleLetter} color={c.onDark}>
                  G
                </Txt>
              </View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 15 }}>
                Kontynuuj z Google
              </Txt>
              <Feather name="arrow-up-right" size={16} color={c.inkSoft} />
            </>
          )}
        </Pressable>

        <Txt
          variant="micro"
          color={c.onDarkSoft}
          align="center"
          style={{ marginTop: 12, lineHeight: 16 }}
        >
          Bez haseł i newslettera. Konto możesz usunąć razem z wpisami.
        </Txt>

        <Pressable
          onPress={() => router.replace('/')}
          accessibilityRole="button"
          style={{ paddingVertical: 12, marginTop: 4 }}
        >
          <Txt variant="label" color={c.onDarkSoft} align="center">
            Czytaj bez konta
          </Txt>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>, dark: boolean) {
  const line = dark ? 'rgba(21, 22, 21, 0.18)' : 'rgba(247, 248, 246, 0.22)';
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.forest },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 20,
      paddingTop: 8,
      paddingBottom: 8,
    },
    back: {
      width: 30,
      height: 30,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: -6,
    },
    wordmark: {
      flex: 1,
      fontFamily: fonts.semi,
      fontSize: 17,
      letterSpacing: -0.2,
      color: c.onDark,
    },
    eyebrow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 20,
      marginBottom: 12,
    },
    dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: c.brass },
    headline: {
      fontFamily: fonts.semi,
      fontSize: 34,
      lineHeight: 41,
      letterSpacing: -0.7,
      color: c.onDark,
      maxWidth: 330,
    },
    leadRow: { flexDirection: 'row', gap: 12, marginTop: 18 },
    leadRule: {
      width: 2,
      backgroundColor: c.brass,
      opacity: 0.8,
      marginTop: 3,
      marginBottom: 3,
    },
    lead: { flex: 1, maxWidth: 340 },
    benefits: { marginTop: 28 },
    benefit: {
      flexDirection: 'row',
      gap: 14,
      paddingVertical: 14,
    },
    benefitBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: line },
    benefitIndex: { width: 18, marginTop: 2 },
    footer: {
      paddingHorizontal: 24,
      paddingTop: 14,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: line,
      backgroundColor: c.forest,
    },
    error: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      marginBottom: 12,
    },
    googleBtn: {
      height: 56,
      borderRadius: 12,
      backgroundColor: c.paper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
    },
    googleMark: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: c.forest,
      alignItems: 'center',
      justifyContent: 'center',
    },
    googleLetter: {
      fontFamily: fonts.uiBold,
      fontSize: 11,
      lineHeight: 13,
      letterSpacing: 0,
    },
  });
}
