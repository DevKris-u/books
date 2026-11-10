import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Field, ScreenHeader, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

type Reason = 'copyright' | 'inappropriate' | 'other';

const REASONS: { value: Reason; label: string; hint: string }[] = [
  {
    value: 'copyright',
    label: 'Naruszenie praw autorskich',
    hint: 'cytowany fragment przekracza dozwolony użytek lub książka nie powinna być w bazie',
  },
  {
    value: 'inappropriate',
    label: 'Treść nieodpowiednia',
    hint: 'mowa nienawiści, treści dla dorosłych bez oznaczenia, nękanie',
  },
  { value: 'other', label: 'Inne', hint: 'opisz krótko, co jest nie tak' },
];

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { fragment } = useLocalSearchParams<{ fragment?: string }>();
  const { state, dispatch } = useStore();
  const c = useColors();

  const [reason, setReason] = useState<Reason | null>(null);
  const [details, setDetails] = useState('');
  const [done, setDone] = useState(false);

  const target = state.fragments.find((f) => f.id === fragment);
  const book = target ? state.books.find((b) => b.id === target.bookId) : undefined;

  const styles = makeStyles(c);

  return (
    <View style={{ flex: 1, backgroundColor: c.paper, paddingTop: insets.top }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={done ? 'Zgłoszenie przyjęte' : 'Zgłoś naruszenie'}
            subtitle={done ? undefined : 'Zgłoszenia rozpatrujemy w ciągu 48 godzin.'}
            onBack={() => router.back()}
          />

          {done ? (
            <View style={{ paddingTop: 20 }}>
              <View style={styles.doneMark}>
                <Feather name="shield" size={20} color={c.onDark} />
              </View>
              <Txt variant="body" color={c.inkMid}>
                Wpis zniknął z feedu do czasu weryfikacji. Odpowiemy w ciągu 48 godzin — jeśli
                zgłoszenie dotyczy praw autorskich, wstrzymujemy publikację wszystkich fragmentów
                z tej książki.
              </Txt>
              <View style={{ height: 22 }} />
              <Btn label="Wróć do feedu" onPress={() => router.navigate('/')} />
              <View style={{ height: 10 }} />
              <Btn
                label="Panel wydawcy"
                variant="ghost"
                onPress={() => router.push('/panel-wydawcy')}
              />
            </View>
          ) : (
            <>
              {target ? (
                <View style={styles.preview}>
                  <Txt variant="micro" color={c.inkSoft}>
                    {book?.title ?? 'książka'} · {target.curator.handle}
                  </Txt>
                  <Txt
                    style={{
                      fontFamily: fonts.read,
                      fontSize: 15,
                      lineHeight: 23,
                      color: c.ink,
                      marginTop: 6,
                    }}
                    numberOfLines={4}
                  >
                    {target.text}
                  </Txt>
                </View>
              ) : null}

              <View style={{ marginTop: 18 }}>
                <Txt variant="label" color={c.ink} style={{ fontSize: 16, marginBottom: 10 }}>
                  Co zgłaszasz?
                </Txt>
                {REASONS.map((option) => {
                  const active = reason === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setReason(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.option,
                        {
                          borderColor: active ? c.ink : c.rule,
                          backgroundColor: active ? c.forest : 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[styles.radio, { borderColor: active ? c.onDark : c.rule }]}
                      >
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="label" color={active ? c.onDark : c.ink}>
                          {option.label}
                        </Txt>
                        <Txt
                          variant="small"
                          color={active ? c.onDarkSoft : c.inkSoft}
                          style={{ marginTop: 2 }}
                        >
                          {option.hint}
                        </Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={{ marginTop: 18 }}>
                <Field
                  label="Szczegóły (opcjonalnie)"
                  value={details}
                  onChangeText={setDetails}
                  maxLength={400}
                  counter={`${details.length}/400`}
                  placeholder="np. to tłumaczenie objęte prawami wydawcy…"
                  multiline
                  style={{ minHeight: 90, textAlignVertical: 'top' }}
                />
              </View>

              <View style={styles.info}>
                <Feather name="clock" size={14} color={c.inkSoft} />
                <Txt variant="small" color={c.inkSoft} style={{ flex: 1 }}>
                  Po zgłoszeniu wpis znika z feedu automatycznie. Rejestr zgłoszeń i usunięć
                  prowadzimy w panelu administracyjnym.
                </Txt>
              </View>

              <View style={{ height: 20 }} />
              <Btn
                label="Wyślij zgłoszenie"
                disabled={!reason}
                onPress={() => {
                  if (target) dispatch({ type: 'REPORT', fragmentId: target.id });
                  setDone(true);
                }}
              />

              <Pressable
                onPress={() => router.push('/panel-wydawcy')}
                accessibilityRole="button"
                style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', gap: 8 }}
              >
                <Feather name="briefcase" size={14} color={c.inkMid} />
                <Txt variant="small" color={c.inkMid}>
                  Jesteś wydawcą? Zgłoś listę tytułów do wyłączenia
                </Txt>
              </Pressable>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    preview: {
      borderTopWidth: 1,
      borderTopColor: c.rule,
      paddingTop: 14,
      marginTop: 4,
    },
    option: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderRadius: 12,
      padding: 12,
      marginBottom: 8,
    },
    radio: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: c.claret },
    info: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', marginTop: 18 },
    doneMark: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: c.forest,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 16,
    },
  });
}
