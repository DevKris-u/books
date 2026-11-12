import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Field, Txt } from '@/components/ui';
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
  const { state } = useStore();
  const { signInWithEmail } = useAuth();
  const c = useColors();
  const styles = makeStyles(c, state.theme === 'dark');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await signInWithEmail(email, password);
      // The root stack swaps this screen for the app as soon as the session lands.
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
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style={state.theme === 'dark' ? 'dark' : 'light'} />

      <View style={styles.topBar}>
        <Txt style={styles.wordmark}>margines</Txt>
        <Txt variant="meta" color={c.onDarkSoft}>
          beta
        </Txt>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28 }}
      >
        <View style={styles.eyebrow}>
          <View style={styles.dot} />
          <Txt variant="meta" color={c.brass}>
            konto
          </Txt>
        </View>

        <Txt style={styles.headline}>Zostaw po sobie margines.</Txt>

        <View style={styles.leadRow}>
          <View style={styles.leadRule} />
          <Txt variant="body" color={c.onDarkSoft} style={styles.lead}>
            Beta Marginesu jest na zaproszenie. Zaloguj się kontem od redakcji, żeby wejść
            do środka — Twoja biblioteka i fragmenty będą czekać na każdym urządzeniu.
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

        <View style={{ gap: 10 }}>
          <View>
            <Txt variant="meta" color={c.onDarkSoft} style={styles.fieldLabel}>
              e-mail
            </Txt>
            <Field
              value={email}
              onChangeText={setEmail}
              placeholder="twoj@email.pl"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              editable={!busy}
            />
          </View>
          <View>
            <Txt variant="meta" color={c.onDarkSoft} style={styles.fieldLabel}>
              hasło
            </Txt>
            <Field
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="current-password"
              textContentType="password"
              returnKeyType="go"
              onSubmitEditing={() => void start()}
              editable={!busy}
            />
          </View>
        </View>

        <Pressable
          onPress={() => void start()}
          disabled={busy}
          accessibilityRole="button"
          accessibilityLabel="Zaloguj się"
          style={({ pressed }) => [
            styles.submitBtn,
            { opacity: busy ? 0.7 : pressed ? 0.9 : 1 },
          ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={c.ink} />
          ) : (
            <>
              <Txt variant="label" color={c.ink} style={{ fontSize: 15 }}>
                Zaloguj się
              </Txt>
              <Feather name="arrow-right" size={16} color={c.inkSoft} />
            </>
          )}
        </Pressable>

        <Txt
          variant="micro"
          color={c.onDarkSoft}
          align="center"
          style={{ marginTop: 12, lineHeight: 16 }}
        >
          Konta dla betatesterów zakłada redakcja. Nie wysyłamy newslettera, a konto możesz
          usunąć razem z wpisami.
        </Txt>
      </View>
    </KeyboardAvoidingView>
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
    fieldLabel: { marginBottom: 6 },
    submitBtn: {
      height: 56,
      borderRadius: 12,
      backgroundColor: c.paper,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      paddingHorizontal: 16,
      marginTop: 14,
    },
  });
}
