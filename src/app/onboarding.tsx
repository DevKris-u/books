import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, Pill, Txt } from '@/components/ui';
import { GENRES, Genre, MOODS, Mood } from '@/data/types';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const STEPS = 5;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { dispatch } = useStore();

  const [step, setStep] = useState(0);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [moods, setMoods] = useState<Mood[]>([]);
  const [titles, setTitles] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [goal, setGoal] = useState<number | null>(20);
  const [unit, setUnit] = useState<'pages' | 'minutes'>('pages');

  const toggle = <T,>(list: T[], value: T): T[] =>
    list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

  const canContinue = useMemo(() => {
    if (step === 1) return genres.length > 0;
    if (step === 2) return moods.length > 0;
    return true;
  }, [step, genres.length, moods.length]);

  const addTitles = () => {
    const parsed = draft
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const parts = line.split(/[,–—]/).map((part) => part.trim()).filter(Boolean);
        return parts.length > 1 ? `${parts[0]} — ${parts[1]}` : parts[0];
      });
    setTitles((current) => Array.from(new Set([...current, ...parsed])).slice(0, 40));
    setDraft('');
  };

  const next = () => {
    if (step < STEPS - 1) {
      setStep(step + 1);
      return;
    }
    dispatch({
      type: 'ONBOARD',
      prefs: {
        genres,
        moods,
        dailyGoal: goal,
        dailyGoalUnit: unit,
        importedTitles: titles,
      },
    });
    router.replace('/');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar style="light" />
      <View style={styles.top}>
        {step > 0 ? (
          <Pressable
            onPress={() => setStep(step - 1)}
            accessibilityRole="button"
            accessibilityLabel="Wróć"
            hitSlop={10}
            style={{ padding: 4 }}
          >
            <Feather name="chevron-left" size={22} color={colors.onDark} />
          </Pressable>
        ) : (
          <Txt style={styles.wordmark}>margines</Txt>
        )}

        <View style={styles.marks}>
          {Array.from({ length: STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.mark,
                { backgroundColor: index <= step ? colors.paper : 'rgba(242,233,218,0.22)' },
              ]}
            />
          ))}
        </View>
        <Txt variant="micro" color={colors.onDarkSoft}>
          {step + 1}/{STEPS}
        </Txt>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          keyboardShouldPersistTaps="handled"
        >
          {step === 0 ? <Welcome /> : null}

          {step === 1 ? (
            <Step
              title="Co Cię wciąga?"
              lead="Wybierz gatunki, po które sięgasz najchętniej."
            >
              <View style={styles.grid}>
                {GENRES.map((genre) => (
                  <Choice
                    key={genre.value}
                    label={genre.label}
                    active={genres.includes(genre.value)}
                    onPress={() => setGenres((current) => toggle(current, genre.value))}
                  />
                ))}
              </View>
            </Step>
          ) : null}

          {step === 2 ? (
            <Step
              title="Po co czytasz?"
              lead="Fragmenty dobieramy też po emocji. Wybierz to, czego szukasz w książkach"
            >
              <View style={styles.grid}>
                {MOODS.map((mood) => (
                  <Choice
                    key={mood.value}
                    label={mood.label}
                    active={moods.includes(mood.value)}
                    onPress={() => setMoods((current) => toggle(current, mood.value))}
                  />
                ))}
              </View>
            </Step>
          ) : null}

          {step === 3 ? (
            <Step
              title="Twoja lista"
              lead="Masz już listę książek, które chcesz przeczytać lub przeczytałeś ?"
            >
              <Txt variant="label" color={colors.onDark} style={{ marginBottom: 8 }}>
                Wklej tytuły, każdy w nowej linii
              </Txt>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                multiline
                placeholder={'Lalka, Bolesław Prus\nKlara i słońce — Anna Kulesza'}
                placeholderTextColor="rgba(242,233,218,0.35)"
                style={styles.textarea}
              />
              <View style={{ height: 10 }} />
              <Btn
                label="Dodaj do listy"
                variant="ghostLight"
                icon="plus"
                onPress={addTitles}
                disabled={!draft.trim()}
              />

              {titles.length ? (
                <View style={{ marginTop: 18 }}>
                  <Txt variant="meta" color={colors.onDarkSoft} style={{ marginBottom: 8 }}>
                    na liście: {titles.length}
                  </Txt>
                  <View style={styles.grid}>
                    {titles.map((title) => (
                      <Pressable
                        key={title}
                        onPress={() => setTitles(titles.filter((t) => t !== title))}
                        style={styles.titleChip}
                        accessibilityRole="button"
                        accessibilityLabel={`Usuń ${title} z listy`}
                      >
                        <Txt variant="small" color={colors.onDark} numberOfLines={1}>
                          {title}
                        </Txt>
                        <Feather name="x" size={12} color={colors.onDarkSoft} />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              <View style={styles.soonRow}>
                <Feather name="lock" size={13} color={colors.onDarkSoft} />
                <Txt variant="small" color={colors.onDarkSoft} style={{ flex: 1 }}>
                  Import z LubimyCzytać — wkrótce. Na razie wklej tytuły albo dodaj je ręcznie.
                </Txt>
              </View>
            </Step>
          ) : null}

          {step === 4 ? (
            <Step
              title="Ile chcesz czytać?"
              lead="Cel pomaga w komunikatach, nie w rankingach. Bez celu też jest dobrze — wybierz „bez celu”, jeśli wolisz nie mieć licznika."
            >
              <Txt variant="meta" color={colors.onDarkSoft} style={{ marginBottom: 8 }}>
                strony dziennie
              </Txt>
              <View style={styles.grid}>
                {[10, 20, 30, 50].map((value) => (
                  <Choice
                    key={`p${value}`}
                    label={`${value} stron`}
                    active={unit === 'pages' && goal === value}
                    onPress={() => {
                      setUnit('pages');
                      setGoal(value);
                    }}
                  />
                ))}
              </View>

              <Txt variant="meta" color={colors.onDarkSoft} style={{ marginVertical: 8 }}>
                albo minuty dziennie
              </Txt>
              <View style={styles.grid}>
                {[15, 30, 45, 60].map((value) => (
                  <Choice
                    key={`m${value}`}
                    label={`${value} min`}
                    active={unit === 'minutes' && goal === value}
                    onPress={() => {
                      setUnit('minutes');
                      setGoal(value);
                    }}
                  />
                ))}
              </View>

              <Pressable
                onPress={() => setGoal(null)}
                accessibilityRole="button"
                style={{ marginTop: 18, paddingVertical: 10 }}
              >
                <Txt
                  variant="label"
                  color={goal === null ? colors.paper : colors.onDarkSoft}
                >
                  bez celu czytania
                </Txt>
              </Pressable>
            </Step>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          {step === 3 ? (
            <Pressable
              onPress={() => setStep(4)}
              accessibilityRole="button"
              style={{ paddingVertical: 10, marginBottom: 6 }}
            >
              <Txt variant="label" color={colors.onDarkSoft} align="center">
                Pomiń ten krok
              </Txt>
            </Pressable>
          ) : null}

          <Btn
            label={
              step === 0
                ? 'Zaczynamy'
                : step === STEPS - 1
                  ? 'Pokaż mój feed'
                  : 'Dalej'
            }
            variant="paper"
            onPress={next}
            disabled={!canContinue}
          />
          {step === 0 ? (
            <Txt
              variant="micro"
              color={colors.onDarkSoft}
              align="center"
              style={{ marginTop: 14 }}
            >
              Margines nie ma nieskończonego feedu. To celowe.
            </Txt>
          ) : null}
          {step === 1 && !genres.length ? (
            <Txt
              variant="micro"
              color={colors.onDarkSoft}
              align="center"
              style={{ marginTop: 12 }}
            >
              Zaznacz przynajmniej jeden gatunek, żeby zacząć.
            </Txt>
          ) : null}
          {step === 2 && !moods.length ? (
            <Txt
              variant="micro"
              color={colors.onDarkSoft}
              align="center"
              style={{ marginTop: 12 }}
            >
              Wybierz jedną emocję — resztę podpowie nam czytanie.
            </Txt>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

function Welcome() {
  return (
    <View style={{ paddingTop: 28 }}>
      <Txt style={styles.headline}>
        Odkrywaj książki przez fragmenty, które zostają w głowie.
      </Txt>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
        <View style={{ width: 2, backgroundColor: 'rgba(168,127,63,0.7)' }} />
      </View>

      <View style={styles.preview}>
        <Txt
          style={{
            fontFamily: fonts.read,
            fontSize: 16,
            lineHeight: 25,
            color: colors.ink,
          }}
        >
          Powiedział, że nie umie tańczyć, więc stanęłam na jego stopach. Potem
          przestał się śmiać i zrobiło się bardzo cicho.
        </Txt>
        <View style={styles.previewReaction}>
          <View style={{ width: 2, backgroundColor: 'rgba(142,47,54,0.5)' }} />
          <Txt variant="reaction" color={colors.claret} style={{ fontSize: 14, flex: 1 }}>
            ONI SIĘ POCALOWALI 🥰❤️
          </Txt>
        </View>
        <View style={{ flexDirection: 'row', gap: 6, marginTop: 12 }}>
          <Pill label="romans" small tone="claret" />
          <Pill label="wzruszenie" small tone="claret" />
        </View>
        <View style={styles.previewFooter}>
          <Txt variant="meta" color={colors.inkSoft}>
            Sól na skórze · Marta Zielińska
          </Txt>
        </View>
      </View>
    </View>
  );
}

function Step({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ paddingTop: 22 }}>
      <Txt style={styles.stepTitle}>{title}</Txt>
      <Txt variant="body" color={colors.onDarkSoft} style={{ marginTop: 10, marginBottom: 22 }}>
        {lead}
      </Txt>
      {children}
    </View>
  );
}

function Choice({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: active ? colors.paper : 'transparent',
          borderColor: active ? colors.paper : 'rgba(242,233,218,0.32)',
          opacity: pressed ? 0.75 : 1,
        },
      ]}
    >
      {active ? <Feather name="check" size={12} color={colors.forest} /> : null}
      <Txt variant="label" color={active ? colors.ink : colors.onDark} style={{ fontSize: 14 }}>
        {label}
      </Txt>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.forest, paddingHorizontal: 24 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 6,
    paddingBottom: 4,
    minHeight: 42,
  },
  wordmark: { fontFamily: fonts.semi, fontSize: 18, color: colors.onDark },
  marks: { flexDirection: 'row', gap: 5, flex: 1 },
  mark: { height: 2, flex: 1, borderRadius: 1 },
  headline: {
    marginTop: 14,
    fontFamily: fonts.semi,
    fontSize: 31,
    lineHeight: 38,
    letterSpacing: -0.5,
    color: colors.onDark,
  },
  stepTitle: {
    fontFamily: fonts.semi,
    fontSize: 32,
    lineHeight: 33,
    letterSpacing: -0.3,
    color: colors.onDark,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  preview: {
    marginTop: 140,
    backgroundColor: colors.paper,
    borderRadius: 4,
    padding: 18,
    transform: [{ rotate: '-1.2deg' }],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(27,22,17,0.2)',
  },
  previewReaction: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  previewFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.rule,
    marginTop: 14,
    paddingTop: 10,
  },
  textarea: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: 'rgba(242,233,218,0.32)',
    borderRadius: 3,
    padding: 12,
    color: colors.onDark,
    fontFamily: fonts.read,
    fontSize: 15,
    lineHeight: 22,
    textAlignVertical: 'top',
  },
  titleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,233,218,0.25)',
    borderRadius: 3,
    paddingHorizontal: 10,
    paddingVertical: 7,
    maxWidth: '100%',
  },
  soonRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginTop: 26,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(242,233,218,0.18)',
    paddingTop: 14,
  },
  footer: { paddingTop: 10 },
});
