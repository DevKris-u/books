import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Btn, IconBtn, Rule, Sheet, Txt } from '@/components/ui';
import { useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

const BENEFITS: { icon: keyof typeof Feather.glyphMap; title: string; body: string }[] = [
  {
    icon: 'zap',
    title: '15 Hot Peaków na godzinę',
    body: 'zamiast jednego dziennie — bez czekania do jutra i bez reklam',
  },
  {
    icon: 'external-link',
    title: 'Natychmiastowy link do zakupu',
    body: 'po polubieniu Hot Peaka, bez dodatkowego panelu',
  },
  {
    icon: 'sliders',
    title: 'Filtry feedu',
    body: 'gatunek, nastrój i długość — feed przestaje zgadywać',
  },
  {
    icon: 'bar-chart-2',
    title: 'Rozszerzone statystyki',
    body: 'gatunki i emocje w czasie, nie tylko licznik książek',
  },
  {
    icon: 'feather',
    title: 'Bez reklam',
    body: 'reklamy z nagrodą znikają całkowicie',
  },
];

export default function ProScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();
  const [plan, setPlan] = useState<'monthly' | 'yearly'>('monthly');
  const [message, setMessage] = useState<string | null>(null);
  const [legal, setLegal] = useState<'terms' | 'privacy' | null>(null);

  const activate = () => {
    dispatch({ type: 'SET_PRO', pro: true });
    setMessage('Plan Pro jest aktywny. To wersja demonstracyjna — nie pobraliśmy żadnej opłaty.');
  };

  const styles = makeStyles(c);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ paddingHorizontal: 22 }}>
        <View style={styles.header}>
          <Txt variant="meta" color={c.brass}>
            margines pro
          </Txt>
          <IconBtn name="x" label="Zamknij" size={38} onPress={() => router.back()} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
          <Txt style={styles.headline}>Czytaj mądrzej, nie dłużej.</Txt>
          <Txt variant="body" color={c.inkMid} style={{ marginTop: 10, maxWidth: 340 }}>
            Pro nie daje Ci powodu, żeby zostać w aplikacji dłużej. Daje lepsze trafienia i
            krótszą drogę do książki, którą naprawdę chcesz przeczytać.
          </Txt>

          <View style={{ marginTop: 24 }}>
            {BENEFITS.map((benefit, index) => (
              <View key={benefit.title}>
                {index > 0 ? <Rule /> : null}
                <View style={styles.benefit}>
                  <View style={styles.benefitIcon}>
                    <Feather name={benefit.icon} size={15} color={c.inkMid} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Txt variant="label">{benefit.title}</Txt>
                    <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                      {benefit.body}
                    </Txt>
                  </View>
                </View>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 24 }}>
            <PlanCard
              active={plan === 'monthly'}
              onPress={() => setPlan('monthly')}
              title="Miesięcznie"
              price="12,99 zł"
              per="/ mies."
              note="bez zobowiązań"
              colors={c}
              styles={styles}
            />
            <PlanCard
              active={plan === 'yearly'}
              onPress={() => setPlan('yearly')}
              title="Rocznie"
              price="99 zł"
              per="/ rok"
              note="oszczędzasz 36%"
              colors={c}
              styles={styles}
            />
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            <Btn
              label={state.pro ? 'Masz już plan Pro' : 'Wypróbuj 7 dni za darmo'}
              disabled={state.pro}
              onPress={activate}
            />
            <Pressable
              onPress={() => setMessage('Nie znaleźliśmy aktywnego zakupu na tym koncie.')}
              accessibilityRole="button"
              style={{ paddingVertical: 8 }}
            >
              <Txt variant="small" color={c.inkMid} align="center">
                Przywróć zakup
              </Txt>
            </Pressable>
          </View>

          {state.pro ? (
            <View style={{ marginTop: 18 }}>
              <Btn
                label="Wróć do planu darmowego (demo)"
                variant="ghost"
                onPress={() => {
                  dispatch({ type: 'SET_PRO', pro: false });
                  setMessage('Plan darmowy przywrócony. Hot Peaki: 1 dziennie.');
                }}
              />
            </View>
          ) : null}

          <View style={styles.legal}>
            <Pressable onPress={() => setLegal('terms')} accessibilityRole="link">
              <Txt variant="small" color={c.inkMid} style={styles.link}>
                Regulamin
              </Txt>
            </Pressable>
            <Pressable onPress={() => setLegal('privacy')} accessibilityRole="link">
              <Txt variant="small" color={c.inkMid} style={styles.link}>
                Polityka prywatności
              </Txt>
            </Pressable>
          </View>

          <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 12, lineHeight: 17 }}>
            Wersja demonstracyjna: płatności i reklamy są symulowane. W wersji produkcyjnej
            subskrypcję obsługuje App Store lub Google Play.
          </Txt>
        </ScrollView>
      </View>

      <Sheet visible={!!message} onClose={() => setMessage(null)} title="Subskrypcja">
        <Txt variant="body" color={c.inkMid}>
          {message}
        </Txt>
        <View style={{ height: 18 }} />
        <Btn label="Rozumiem" onPress={() => setMessage(null)} />
      </Sheet>

      <Sheet
        visible={!!legal}
        onClose={() => setLegal(null)}
        title={legal === 'terms' ? 'Regulamin' : 'Polityka prywatności'}
      >
        <Txt variant="body" color={c.inkMid}>
          {legal === 'terms'
            ? 'To miejsce na regulamin usługi. Fragmenty publikowane przez czytelników cytowane są w celach analizy, krytyki, polemiki lub emocji, a zgłoszenia naruszeń rozpatrujemy w ciągu 48 godzin.'
            : 'To miejsce na politykę prywatności. W wersji demonstracyjnej dane trzymamy wyłącznie na Twoim urządzeniu i nie wysyłamy ich na serwer.'}
        </Txt>
        <View style={{ height: 18 }} />
        <Btn label="Zamknij" variant="ghost" onPress={() => setLegal(null)} />
      </Sheet>
    </View>
  );
}

function PlanCard({
  active,
  onPress,
  title,
  price,
  per,
  note,
  colors,
  styles,
}: {
  active: boolean;
  onPress: () => void;
  title: string;
  price: string;
  per: string;
  note: string;
  colors: ReturnType<typeof useColors>;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[
        styles.plan,
        {
          borderColor: active ? colors.forest : colors.rule,
          backgroundColor: active ? colors.forest : 'transparent',
        },
      ]}
    >
      <Txt variant="meta" color={active ? colors.onDarkSoft : colors.inkSoft}>
        {title.toLowerCase()}
      </Txt>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 6 }}>
        <Txt
          style={{
            fontFamily: fonts.semi,
            fontSize: 21,
            color: active ? colors.paper : colors.ink,
          }}
        >
          {price}
        </Txt>
        <Txt variant="micro" color={active ? colors.onDarkSoft : colors.inkSoft}>
          {per}
        </Txt>
      </View>
      <Txt variant="micro" color={active ? colors.onDarkSoft : colors.inkSoft} style={{ marginTop: 6 }}>
        {note}
      </Txt>
    </Pressable>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 8,
      paddingBottom: 12,
    },
    headline: {
      fontFamily: fonts.semi,
      fontSize: 30,
      lineHeight: 37,
      color: c.ink,
      letterSpacing: -0.5,
      maxWidth: 330,
    },
    benefit: { flexDirection: 'row', gap: 12, paddingVertical: 13 },
    benefitIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 1,
      borderColor: c.rule,
      alignItems: 'center',
      justifyContent: 'center',
    },
    plan: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 14 },
    legal: { flexDirection: 'row', gap: 18, marginTop: 24 },
    link: { textDecorationLine: 'underline' },
  });
}
