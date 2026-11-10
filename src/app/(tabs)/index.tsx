import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardMenu } from '@/components/CardMenu';
import { LikeSheet } from '@/components/LikeSheet';
import { ShopSheet } from '@/components/ShopSheet';
import { SwipeDeck, SwipeDeckHandle } from '@/components/SwipeDeck';
import { Btn, EmptyState, Txt } from '@/components/ui';
import { EmotionTag } from '@/data/types';
import { buildQueue, Candidate } from '@/lib/recommend';
import { tapLight } from '@/lib/haptics';
import { hotPeakStatus, useStore } from '@/state/store';
import { colors, fonts, useColors } from '@/theme';

type Focus = { bookId?: string; tag?: EmotionTag } | null;

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();
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

  const styles = makeStyles(c);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.padded}>
        <View style={styles.header}>
          <Txt style={styles.wordmark}>margines</Txt>
          <View style={{ flex: 1 }} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Hot Peak, pozostało ${hot.remaining} z ${hot.quota}`}
            onPress={() => router.push('/hot-peak')}
            style={({ pressed }) => [
              { flexDirection: 'row', alignItems: 'center', gap: 6 },
              pressed ? { opacity: 0.72 } : null,
            ]}
          >
            <View style={styles.hotIcon}>
              <Feather name="zap" size={16} color={c.brass} />
            </View>
            <Txt style={styles.hotCount}>
              {hot.remaining}/{hot.quota}
            </Txt>
          </Pressable>
          {state.lastAction ? (
            <View pointerEvents="box-none" style={styles.undoWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cofnij ostatnią kartę"
                hitSlop={12}
                onPress={undo}
                style={({ pressed }) => [styles.undo, pressed ? { opacity: 0.45 } : null]}
              >
                <Feather name="corner-up-left" size={20} color={c.inkMid} />
              </Pressable>
            </View>
          ) : null}
        </View>

        {notice ? (
          <View style={styles.notice}>
            <Txt variant="small" color={c.inkMid}>
              {notice}
            </Txt>
          </View>
        ) : null}

        {focusLabel ? (
          <View style={styles.focusBar}>
            <Feather name="layers" size={13} color={c.inkMid} />
            <Txt variant="small" color={c.inkMid} style={{ flex: 1 }} numberOfLines={1}>
              podobne do: {focusLabel}
            </Txt>
            <Pressable onPress={resetFocus} accessibilityRole="button">
              <Txt variant="meta" color={c.claret}>
                cały feed
              </Txt>
            </Pressable>
          </View>
        ) : null}

        <View style={{ flex: 1, paddingTop: 12 }}>
          {done ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <EmptyState
                centered
                icon={focusLabel ? 'layers' : 'moon'}
                title={focusLabel ? 'Nic więcej z tego nie mamy.' : 'Na dziś to wszystko.'}
                body={
                  focusLabel
                    ? 'Wróć do całego feedu albo dodaj własny fragment z tej książki.'
                    : 'Wróć jutro po nowe fragmenty albo dodaj własny — pomóż innym przerwać zastój czytelniczy. Margines nie ma nieskończonego feedu i to jest celowe.'
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pomiń fragment"
              accessibilityHint="Przesuwa kartę w lewo"
              onPress={() => {
                void tapLight();
                deckRef.current?.swipe('pass');
              }}
              style={styles.edgeZoneLeft}
            />
            <View style={{ alignItems: 'center' }}>
              <Txt variant="meta" color={c.ink}>
                {Math.min(cursor + 1, queue.length)} / {queue.length}
              </Txt>
              <Txt variant="micro" color={c.inkSoft}>
                w tej sesji
              </Txt>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Zapisz fragment"
              accessibilityHint="Przesuwa kartę w prawo i dodaje ją na półkę"
              onPress={() => deckRef.current?.swipe('like')}
              style={styles.edgeZoneRight}
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

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    padded: { flex: 1, paddingHorizontal: 22 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingTop: 8,
      paddingBottom: 6,
    },
    undoWrap: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
    undo: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    wordmark: {
      fontFamily: fonts.semi,
      fontSize: 20,
      color: c.ink,
      letterSpacing: -0.3,
    },
    hotPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    hotIcon: {
      width: 20,
      height: 20,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 6,
    },
    hotCount: {
      fontFamily: fonts.uiBold,
      fontSize: 13,
      letterSpacing: 0.2,
      color: c.brass,
      fontVariant: ['tabular-nums'],
    },
    focusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: c.ruleSoft,
    },
    notice: {
      backgroundColor: c.forestTint,
      borderRadius: 3,
      paddingHorizontal: 12,
      paddingVertical: 8,
      marginBottom: 6,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      paddingTop: 10,
      paddingBottom: 12,
    },
    edgeZoneLeft: {
      position: 'absolute',
      left: -22,
      top: 0,
      bottom: 0,
      width: 88,
    },
    edgeZoneRight: {
      position: 'absolute',
      right: -22,
      top: 0,
      bottom: 0,
      width: 88,
    },
  });
}
