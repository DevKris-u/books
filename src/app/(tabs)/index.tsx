import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardMenu } from '@/components/CardMenu';
import { LikeSheet } from '@/components/LikeSheet';
import { ShopSheet } from '@/components/ShopSheet';
import { SwipeDeck, SwipeDeckHandle } from '@/components/SwipeDeck';
import { Btn, EmptyState, IconBtn, Txt } from '@/components/ui';
import { EmotionTag } from '@/data/types';
import { buildQueue, Candidate } from '@/lib/recommend';
import { hotPeakStatus, useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

type Focus = { bookId?: string; tag?: EmotionTag } | null;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const deckRef = useRef<SwipeDeckHandle>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const [focus, setFocus] = useState<Focus>(null);
  const [queue, setQueue] = useState<Candidate[]>([]);
  const [cursor, setCursor] = useState(0);
  const [liked, setLiked] = useState<Candidate | null>(null);
  const [likeOpen, setLikeOpen] = useState(false);
  const [shopsOpen, setShopsOpen] = useState(false);
  const [menuCard, setMenuCard] = useState<Candidate | null>(null);
  const [hintOpen, setHintOpen] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    const next = buildQueue(stateRef.current, { focus: focus ?? undefined });
    setQueue(next);
    setCursor(0);
  }, [
    focus,
    state.hydrated,
    state.posts.length,
    state.reported.length,
    state.hiddenAuthors.length,
    state.books.length,
  ]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(timer);
  }, [notice]);

  const hot = hotPeakStatus(state);
  const cards = useMemo(() => queue.slice(cursor, cursor + 2), [queue, cursor]);
  const current = queue[cursor];
  const done = cursor >= queue.length;

  const handleSwipe = useCallback(
    (dir: 'like' | 'pass', card: Candidate, dwellMs: number) => {
      dispatch({ type: 'SWIPE', fragmentId: card.id, dir, dwellMs });
      setCursor((value) => value + 1);
      setHintOpen(false);
      if (dir === 'like') {
        setLiked(card);
        setLikeOpen(true);
      }
    },
    [dispatch],
  );

  const undo = () => {
    if (!state.lastAction) return;
    dispatch({ type: 'UNDO' });
    setCursor((value) => Math.max(0, value - 1));
    setHintOpen(false);
  };

  const startSimilar = () => {
    if (!liked) return;
    const byBook = buildQueue(stateRef.current, { focus: { bookId: liked.bookId } });
    const next: Focus = byBook.length
      ? { bookId: liked.bookId }
      : { tag: liked.tags[0] };
    setFocus(next);
    setLikeOpen(false);
    setShopsOpen(false);
  };

  const resetFocus = () => {
    setFocus(null);
  };

  const focusLabel = focus?.bookId
    ? state.books.find((b) => b.id === focus.bookId)?.title ?? 'ta książka'
    : focus?.tag
      ? `tag „${focus.tag}”`
      : null;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.padded}>
        <View style={styles.header}>
          {state.lastAction ? (
            <IconBtn
              name="corner-up-left"
              label="Cofnij ostatnią kartę"
              size={36}
              onPress={undo}
              style={{ marginRight: 10 }}
            />
          ) : null}
          <Txt style={styles.wordmark}>margines</Txt>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hot Peak, pozostało ${hot.remaining} z ${hot.quota}`}
            onPress={() => router.push('/hot-peak')}
            style={({ pressed }) => [styles.hotPill, pressed ? { opacity: 0.7 } : null]}
          >
            <Feather name="zap" size={12} color={colors.brass} />
            <Txt variant="meta" color="#6E5224">
              Hot Peak · {hot.remaining}/{hot.quota}
            </Txt>
          </Pressable>
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Txt variant="small" color={colors.inkMid}>
              {notice}
            </Txt>
          </View>
        ) : null}

        {focusLabel ? (
          <View style={styles.focusBar}>
            <Feather name="layers" size={13} color={colors.inkMid} />
            <Txt variant="small" color={colors.inkMid} style={{ flex: 1 }} numberOfLines={1}>
              podobne do: {focusLabel}
            </Txt>
            <Pressable onPress={resetFocus} accessibilityRole="button">
              <Txt variant="meta" color={colors.claret}>
                cały feed
              </Txt>
            </Pressable>
          </View>
        ) : hintOpen && !done ? (
          <View style={styles.hint}>
            <View style={styles.hintRule} />
            <Txt variant="small" color={colors.inkMid} style={{ flex: 1 }}>
              Przesuwaj w prawo, jeśli fragment Cię wciąga. W lewo — pomiń.
            </Txt>
            <Pressable
              onPress={() => setHintOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Zamknij podpowiedź"
              hitSlop={8}
            >
              <Feather name="x" size={14} color={colors.inkSoft} />
            </Pressable>
          </View>
        ) : null}

        <View style={{ flex: 1, paddingTop: 12 }}>
          {done ? (
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <EmptyState
                icon={focusLabel ? 'layers' : 'moon'}
                title={focusLabel ? 'Nic więcej z tego nie mamy.' : 'Na dziś to wszystko.'}
                body={
                  focusLabel
                    ? 'Wróć do całego feedu albo dodaj własny fragment z tej książki.'
                    : 'Wróć jutro po nowe fragmenty albo dodaj własny — pomóż innym przerwać zastój czytelniczy. Margines nie ma nieskończonego feedu i to jest celowe.'
                }
                action={
                  <View style={{ gap: 10, alignSelf: 'stretch' }}>
                    <Btn label="Dodaj fragment" onPress={() => router.push('/dodaj')} />
                    {focusLabel ? (
                      <Btn label="Wróć do całego feedu" variant="ghost" onPress={resetFocus} />
                    ) : (
                      <Btn
                        label="Zobacz bibliotekę"
                        variant="ghost"
                        onPress={() => router.push('/biblioteka')}
                      />
                    )}
                  </View>
                }
              />
            </View>
          ) : current ? (
            <SwipeDeck
              ref={deckRef}
              cards={cards}
              onSwipe={handleSwipe}
              onTap={(card) => router.push(`/ksiazka/${card.bookId}`)}
              onHold={(card) => setMenuCard(card)}
            />
          ) : null}
        </View>

        {!done ? (
          <View style={styles.actions}>
            <IconBtn
              name="x"
              label="Pomiń fragment"
              size={50}
              onPress={() => deckRef.current?.swipe('pass')}
            />
            <View style={{ alignItems: 'center' }}>
              <Txt variant="meta" color={colors.ink}>
                {Math.min(cursor + 1, queue.length)} / {queue.length}
              </Txt>
              <Txt variant="micro" color={colors.inkSoft}>
                w tej sesji
              </Txt>
            </View>
            <IconBtn
              name="bookmark"
              label="Zapisz fragment"
              size={50}
              color={colors.claret}
              onPress={() => deckRef.current?.swipe('like')}
            />
          </View>
        ) : (
          <View style={{ height: 10 }} />
        )}
      </View>

      <LikeSheet
        card={liked}
        visible={likeOpen}
        onClose={() => setLikeOpen(false)}
        onShops={() => setShopsOpen(true)}
        onSimilar={startSimilar}
      />
      <ShopSheet
        book={liked?.book ?? null}
        visible={shopsOpen}
        onClose={() => setShopsOpen(false)}
      />
      <CardMenu
        card={menuCard}
        visible={!!menuCard}
        onClose={() => setMenuCard(null)}
        onSave={() => {
          if (!menuCard) return;
          dispatch({ type: 'ADD_TO_WANT', bookId: menuCard.bookId });
          setNotice(`„${menuCard.book.title}” jest już na Twojej półce.`);
          setMenuCard(null);
        }}
        onHideAuthor={() => {
          if (!menuCard) return;
          dispatch({ type: 'HIDE_AUTHOR', author: menuCard.book.author });
          setNotice(`Ukryliśmy fragmenty autora: ${menuCard.book.author}.`);
          setMenuCard(null);
        }}
        onReport={() => {
          if (!menuCard) return;
          const id = menuCard.id;
          setMenuCard(null);
          router.push(`/zglos?fragment=${id}`);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  padded: { flex: 1, paddingHorizontal: 22 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 6,
  },
  wordmark: {
    fontFamily: fonts.semi,
    fontSize: 20,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  hotPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.brassTint,
    borderWidth: 1,
    borderColor: 'rgba(168,127,63,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 3,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  hintRule: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: colors.claret,
    borderRadius: 1,
  },
  focusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ruleSoft,
  },
  notice: {
    backgroundColor: colors.forestTint,
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 12,
  },
});
