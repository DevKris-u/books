import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FragmentCard } from '@/components/FragmentCard';
import { LikeSheet } from '@/components/LikeSheet';
import { ShopSheet } from '@/components/ShopSheet';
import { Btn, IconBtn, Sheet, Txt } from '@/components/ui';
import { hotPeakReasons, pickHotPeak } from '@/lib/recommend';
import { hotPeakStatus, useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

export default function HotPeakScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const hot = hotPeakStatus(state);
  const candidate = useMemo(() => pickHotPeak(state), [state]);
  const [likeOpen, setLikeOpen] = useState(false);
  const [shopsOpen, setShopsOpen] = useState(false);
  const [adSeconds, setAdSeconds] = useState<number | null>(null);

  useEffect(() => {
    if (adSeconds === null) return;
    if (adSeconds <= 0) {
      dispatch({ type: 'WATCH_AD' });
      setAdSeconds(null);
      return;
    }
    const timer = setTimeout(() => setAdSeconds(adSeconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [adSeconds, dispatch]);

  const reasons = candidate ? hotPeakReasons(state, candidate) : [];

  const accept = () => {
    dispatch({ type: 'CONSUME_HOT' });
    setLikeOpen(true);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={[styles.header, { paddingHorizontal: 22 }]}>
        <IconBtn name="x" label="Zamknij Hot Peak" size={38} onPress={() => router.back()} />
        <View style={styles.titleWrap}>
          <Feather name="zap" size={12} color={colors.brass} />
          <Txt style={styles.title}>Hot Peak</Txt>
        </View>
        <View style={styles.counter}>
          <Txt variant="meta" color="#6E5224">
            {hot.remaining}/{hot.quota}
          </Txt>
        </View>
      </View>

      {hot.remaining === 0 && !likeOpen ? (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 30, paddingBottom: 40 }}>
          <Txt variant="meta" color={colors.brass}>
            dzisiejszy Hot Peak
          </Txt>
          <Txt style={styles.headline}>Znalazłeś już swoją historię na dziś?</Txt>
          <Txt variant="body" color={colors.inkMid} style={{ marginTop: 12, maxWidth: 340 }}>
            W planie Pro mamy dla Ciebie 15 Hot Peaków na godzinę — bez czekania do jutra.
            W darmowym planie możesz też odblokować kolejny, oglądając krótką reklamę.
          </Txt>

          <View style={{ marginTop: 26, gap: 10 }}>
            <Btn
              label="Przejdź na Pro · 12,99 zł/mies."
              icon="zap"
              onPress={() => router.push('/pro')}
            />
            {hot.canWatchAd ? (
              <>
                <Btn
                  label="Obejrzyj reklamę i odblokuj kolejny Hot Peak"
                  variant="brass"
                  icon="play-circle"
                  onPress={() => setAdSeconds(5)}
                />
                <Txt variant="micro" color={colors.inkSoft} align="center">
                  Możesz to zrobić jeszcze {hot.adsLeft}{' '}
                  {hot.adsLeft === 1 ? 'raz' : 'razy'} dzisiaj.
                </Txt>
              </>
            ) : (
              <Txt variant="small" color={colors.inkSoft}>
                Wykorzystałeś już trzy reklamy na dziś. Jutro odblokujesz kolejne — albo weź Pro i
                nie czekaj.
              </Txt>
            )}
            <View style={{ height: 4 }} />
            <Btn label="Wróć do feedu" variant="quiet" onPress={() => router.back()} />
          </View>

          <Txt variant="micro" color={colors.inkSoft} style={{ marginTop: 24, lineHeight: 17 }}>
            Hot Peak to nie limit czytania. Fragmenty możesz przesuwać bez końca — Hot Peak
            ogranicza tylko liczbę rekomendacji wybieranych dla Ciebie najdokładniej.
          </Txt>
        </ScrollView>
      ) : !candidate ? (
        <View style={{ paddingHorizontal: 22, paddingTop: 30 }}>
          <Txt style={styles.headline}>Nie mamy teraz nic pewnego.</Txt>
          <Txt variant="body" color={colors.inkMid} style={{ marginTop: 10 }}>
            Hot Peak wybieramy tylko ze źródeł licencjonowanych i domeny publicznej. Przesuń kilka
            fragmentów albo dodaj książki do listy — wrócimy z lepszą propozycją.
          </Txt>
          <View style={{ height: 20 }} />
          <Btn label="Wróć do feedu" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <View style={{ paddingHorizontal: 22 }}>
            <Txt style={styles.headline}>Ten fragment wybraliśmy dla Ciebie.</Txt>
            <View style={{ marginTop: 10, gap: 4 }}>
              {reasons.map((reason) => (
                <View key={reason} style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <View style={styles.reasonDot} />
                  <Txt variant="small" color={colors.inkMid}>
                    {reason}
                  </Txt>
                </View>
              ))}
            </View>
          </View>

          <View style={{ flex: 1, paddingHorizontal: 22, paddingTop: 16 }}>
            <View style={styles.frame}>
              <View style={styles.frameLabel}>
                <Feather name="zap" size={10} color={colors.brass} />
                <Txt variant="micro" color="#6E5224">
                  Hot Peak · dopasowanie {Math.min(99, 82 + reasons.length * 5)}%
                </Txt>
              </View>
              <View style={{ flex: 1, padding: 6 }}>
                <FragmentCard card={candidate} onPress={() => router.push(`/ksiazka/${candidate.bookId}`)} />
              </View>
            </View>
          </View>

          <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Btn
              label="Nie teraz"
              variant="ghost"
              onPress={() => router.back()}
              style={{ flex: 1 }}
              full={false}
            />
            <Btn
              label="Zapisz i zobacz sklep"
              onPress={accept}
              style={{ flex: 1.4 }}
              full={false}
            />
          </View>
        </>
      )}

      <LikeSheet
        card={candidate}
        visible={likeOpen}
        mode="hot"
        onClose={() => {
          setLikeOpen(false);
          router.back();
        }}
        onShops={() => setShopsOpen(true)}
        onSimilar={() => {}}
      />
      <ShopSheet
        book={candidate?.book ?? null}
        visible={shopsOpen}
        onClose={() => setShopsOpen(false)}
      />

      <Sheet visible={adSeconds !== null} onClose={() => setAdSeconds(null)} title="Reklama">
        <Txt variant="body" color={colors.inkMid}>
          Miejsce na 30-sekundową reklamę partnera. W wersji demonstracyjnej trwa 5 sekund i nic
          nie pobieramy.
        </Txt>
        <View style={styles.adBar}>
          <View
            style={{
              height: 3,
              backgroundColor: colors.brass,
              width: `${((5 - (adSeconds ?? 0)) / 5) * 100}%`,
            }}
          />
        </View>
        <Txt variant="meta" color={colors.inkSoft} style={{ marginTop: 8 }}>
          {adSeconds && adSeconds > 0 ? `pozostało ${adSeconds} s` : 'odblokowujemy Hot Peak…'}
        </Txt>
        <View style={{ height: 14 }} />
        <Btn label="Zamknij" variant="quiet" onPress={() => setAdSeconds(null)} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 10,
    gap: 10,
  },
  titleWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
  title: { fontFamily: fonts.semi, fontSize: 16, color: colors.ink },
  counter: {
    minWidth: 52,
    alignItems: 'center',
    backgroundColor: colors.brassTint,
    borderWidth: 1,
    borderColor: 'rgba(168,127,63,0.45)',
    borderRadius: 3,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  headline: {
    fontFamily: fonts.semi,
    fontSize: 27,
    lineHeight: 34,
    letterSpacing: -0.4,
    color: colors.ink,
    marginTop: 10,
    maxWidth: 340,
  },
  reasonDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.brass },
  frame: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: 'rgba(168,127,63,0.6)',
    borderRadius: 5,
    backgroundColor: colors.brassTint,
    padding: 6,
  },
  frameLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 22,
    paddingTop: 12,
  },
  adBar: { height: 3, backgroundColor: colors.ruleSoft, marginTop: 16, width: '100%' },
});
