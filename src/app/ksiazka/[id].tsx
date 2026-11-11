import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShopSheet } from '@/components/ShopSheet';
import {
  Btn,
  Cover,
  EmptyState,
  IconBtn,
  Pill,
  Rule,
  SourceMark,
  Txt,
} from '@/components/ui';
import { SHELF_LABEL, Shelf, SOURCE_LABEL } from '@/data/types';
import { fetchIsbnDescription } from '@/lib/isbnMeta';
import { plural } from '@/lib/utils';
import { useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

const SHELF_HINT: Record<Shelf, string> = {
  want: 'Na półce „Chcę przeczytać”',
  reading: 'Czytasz tę książkę',
  read: 'Przeczytane',
};

export default function BookScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, dispatch } = useStore();
  const c = useColors();
  const [shopsOpen, setShopsOpen] = useState(false);

  const book = state.books.find((b) => b.id === id);
  const item = state.library.find((i) => i.bookId === id);
  const fragments = state.fragments.filter(
    (f) => f.bookId === id && !state.reported.includes(f.id),
  );

  const styles = makeStyles(c);

  // National Library records have no annotation, so it is fetched by ISBN the
  // first time the book is opened.
  useEffect(() => {
    if (!book?.isbn || book.description) return;
    let active = true;
    void fetchIsbnDescription(book.isbn).then((description) => {
      if (active && description) {
        dispatch({ type: 'UPDATE_BOOK', bookId: book.id, patch: { description } });
      }
    });
    return () => {
      active = false;
    };
  }, [book?.id, book?.isbn, book?.description, dispatch]);

  if (!book) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 12, paddingHorizontal: 22 }]}>
        <IconBtn name="chevron-left" label="Wróć" onPress={() => router.back()} size={38} />
        <EmptyState
          title="Nie znaleźliśmy tej książki"
          body="Mogła zostać wyłączona na wniosek wydawcy albo pochodzi z importu, którego nie znamy."
          action={<Btn label="Wróć" variant="ghost" onPress={() => router.back()} />}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
      >
        <View style={styles.header}>
          <IconBtn name="chevron-left" label="Wróć" size={38} onPress={() => router.back()} />
          <SourceMark source={book.source} showLabel />
        </View>

        <View style={styles.top}>
          <Cover book={book} width={92} />
          <View style={{ flex: 1 }}>
            <Txt style={styles.title}>{book.title}</Txt>
            <Txt variant="label" color={c.inkMid} style={{ marginTop: 6 }}>
              {book.author}
            </Txt>
            <Txt variant="small" color={c.inkSoft} style={{ marginTop: 8 }}>
              {book.genre}
              {book.year ? ` · ${book.year}` : ''}
              {book.pages ? ` · ${book.pages} str.` : ''}
            </Txt>
            {book.publisher ? (
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 2 }}>
                {book.publisher}
              </Txt>
            ) : null}
          </View>
        </View>

        {book.source === 'excluded' ? (
          <View style={styles.excluded}>
            <Txt variant="small" color={c.claret}>
              Ta książka została wyłączona na wniosek wydawcy. Fragmenty nie pojawiają się w
              feedzie.
            </Txt>
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
          {item ? (
            <>
              <View style={styles.shelfState}>
                <Feather name="check" size={14} color={c.verified} />
                <Txt variant="small" color={c.ink}>
                  {SHELF_HINT[item.shelf]}
                </Txt>
              </View>
              <Pressable
                onPress={() => dispatch({ type: 'REMOVE_FROM_LIBRARY', bookId: book.id })}
                accessibilityRole="button"
                style={styles.removeBtn}
              >
                <Feather name="x" size={14} color={c.inkMid} />
              </Pressable>
            </>
          ) : (
            <Btn
              label="Chcę przeczytać"
              icon="bookmark"
              onPress={() => dispatch({ type: 'ADD_TO_WANT', bookId: book.id })}
              style={{ flex: 1 }}
              full={false}
            />
          )}
        </View>

        {!item ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Btn
              label="Czytam"
              variant="ghost"
              onPress={() => dispatch({ type: 'SET_SHELF', bookId: book.id, shelf: 'reading' })}
              style={{ flex: 1 }}
              full={false}
            />
            <Btn
              label="Przeczytane"
              variant="ghost"
              onPress={() => dispatch({ type: 'SET_SHELF', bookId: book.id, shelf: 'read' })}
              style={{ flex: 1 }}
              full={false}
            />
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {(['want', 'reading', 'read'] as Shelf[])
              .filter((shelf) => shelf !== item.shelf)
              .map((shelf) => (
                <Pill
                  key={shelf}
                  label={`przenieś: ${SHELF_LABEL[shelf].toLowerCase()}`}
                  onPress={() => dispatch({ type: 'SET_SHELF', bookId: book.id, shelf })}
                />
              ))}
          </View>
        )}

        <Txt variant="body" color={c.inkMid} style={{ marginTop: 20 }}>
          {book.description || 'Nie mamy jeszcze opisu tej książki.'}
        </Txt>

        <Pressable
          onPress={() => setShopsOpen(true)}
          accessibilityRole="button"
          style={styles.shopRow}
        >
          <Feather name="shopping-bag" size={16} color={c.ink} />
          <Txt variant="label" style={{ flex: 1 }}>
            Zobacz, gdzie kupić
          </Txt>
          <Txt variant="meta" color={c.inkSoft}>
            od 33,90 zł
          </Txt>
          <Feather name="chevron-right" size={16} color={c.inkSoft} />
        </Pressable>

        <View style={styles.sourceBox}>
          <Txt variant="meta" color={c.inkSoft}>
            {SOURCE_LABEL[book.source]}
          </Txt>
          <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4, lineHeight: 18 }}>
            {book.source === 'licensed'
              ? 'Wydawca zgodził się na udostępnianie krótkich fragmentów w Marginesie. Hot Peak może promować tę książkę.'
              : book.source === 'public'
                ? 'Prawa autorskie wygasły — fragmenty możemy pokazywać bez ograniczeń.'
                : 'Książkę dodał czytelnik. Jej fragmenty mogą trafić zarówno do feedu, jak i do Hot Peaka.'}
          </Txt>
        </View>

        <View style={{ marginTop: 26 }}>
          <View style={styles.sectionHead}>
            <Txt style={styles.sectionTitle}>Fragmenty z tej książki</Txt>
            <Txt variant="meta" color={c.inkSoft}>
              {fragments.length}{' '}
              {plural(fragments.length, 'fragment', 'fragmenty', 'fragmentów')}
            </Txt>
          </View>

          {fragments.length === 0 ? (
            <Txt variant="body" color={c.inkMid} style={{ marginTop: 10 }}>
              Nie mamy jeszcze fragmentów z tej książki. Możesz dodać pierwszy — to najkrótsza
              droga, żeby ktoś inny ją odkrył.
            </Txt>
          ) : (
            fragments.map((fragment, index) => (
              <View key={fragment.id}>
                {index > 0 ? <Rule /> : null}
                <View style={{ paddingVertical: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                    <Txt variant="micro" color={c.inkSoft}>
                      {fragment.page ? `strona ${fragment.page}` : 'fragment'}
                    </Txt>
                    <Txt variant="micro" color={c.inkSoft}>
                      {fragment.curator.handle}
                    </Txt>
                  </View>
                  <Txt
                    style={{
                      fontFamily: fonts.read,
                      fontSize: 16,
                      lineHeight: 25,
                      color: c.ink,
                      marginTop: 8,
                    }}
                  >
                    {fragment.text}
                  </Txt>
                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                    <View style={{ width: 2, backgroundColor: 'rgba(142,47,54,0.4)' }} />
                    <Txt variant="reaction" color={c.claret} style={{ flex: 1, fontSize: 15 }}>
                      {fragment.reaction}
                    </Txt>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {fragment.tags.map((tag) => (
                      <Pill key={tag} label={tag} small tone="claret" />
                    ))}
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <Pressable
          onPress={() => router.push('/zglos')}
          accessibilityRole="button"
          style={{ marginTop: 24, flexDirection: 'row', alignItems: 'center', gap: 8 }}
        >
          <Feather name="flag" size={13} color={c.inkSoft} />
          <Txt variant="small" color={c.inkSoft}>
            Zgłoś naruszenie praw autorskich
          </Txt>
        </Pressable>
      </ScrollView>

      <ShopSheet book={book} visible={shopsOpen} onClose={() => setShopsOpen(false)} />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 6,
      paddingBottom: 16,
    },
    top: { flexDirection: 'row', gap: 16, alignItems: 'flex-start' },
    title: {
      fontFamily: fonts.semi,
      fontSize: 24,
      lineHeight: 30,
      color: c.ink,
      letterSpacing: -0.3,
    },
    excluded: {
      marginTop: 14,
      backgroundColor: c.claretTint,
      borderLeftWidth: 2,
      borderLeftColor: c.claret,
      padding: 12,
    },
    shelfState: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: c.rule,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    removeBtn: {
      width: 48,
      borderWidth: 1,
      borderColor: c.rule,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    shopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderBottomWidth: 1,
      borderColor: c.rule,
      paddingVertical: 15,
      marginTop: 22,
    },
    sourceBox: {
      marginTop: 16,
      padding: 12,
      backgroundColor: c.paperSoft,
      borderRadius: 12,
    },
    sectionHead: {
      flexDirection: 'row',
      alignItems: 'baseline',
      justifyContent: 'space-between',
      borderBottomWidth: 1,
      borderBottomColor: c.rule,
      paddingBottom: 8,
    },
    sectionTitle: { fontFamily: fonts.semi, fontSize: 19, color: c.ink },
  });
}
