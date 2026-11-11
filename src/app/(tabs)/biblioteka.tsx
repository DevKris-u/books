import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ShopSheet } from '@/components/ShopSheet';
import {
  Btn,
  Cover,
  EmptyState,
  Field,
  IconBtn,
  Pill,
  Rule,
  Sheet,
  Stars,
  Txt,
} from '@/components/ui';
import {
  Book,
  GENRES,
  Genre,
  LibraryItem,
  MOODS,
  Mood,
  SHELF_LABEL,
  Shelf,
} from '@/data/types';
import { plural } from '@/lib/utils';
import { useStore } from '@/state/store';
import { colors, fonts, useColors } from '@/theme';

const SHELVES: Shelf[] = ['want', 'reading', 'read'];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();
  const c = useColors();

  const [shelf, setShelf] = useState<Shelf>('want');
  const [query, setQuery] = useState('');
  const [genre, setGenre] = useState<Genre | null>(null);
  const [mood, setMood] = useState<Mood | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [menuFor, setMenuFor] = useState<Book | null>(null);
  const [editing, setEditing] = useState<Book | null>(null);
  const [shopsFor, setShopsFor] = useState<Book | null>(null);
  const [progressDraft, setProgressDraft] = useState('');
  const [ratingDraft, setRatingDraft] = useState(0);
  const [noteDraft, setNoteDraft] = useState('');

  const all = useMemo(
    () =>
      state.library.flatMap((item) => {
        const match = state.books.find((b) => b.id === item.bookId);
        return match ? [{ item, book: match }] : [];
      }),
    [state.library, state.books],
  );

  const counts = SHELVES.reduce<Record<Shelf, number>>(
    (acc, key) => ({ ...acc, [key]: all.filter((e) => e.item.shelf === key).length }),
    { want: 0, reading: 0, read: 0 },
  );

  const needle = query.trim().toLowerCase();
  const searchActive = needle.length > 0 || !!genre || !!mood;

  // Searching and filtering run over the whole catalogue, so a reader can find
  // a book that is not on their shelves yet. Shelves only scope the plain list.
  const items: { book: Book; item?: LibraryItem }[] = searchActive
    ? state.books
        .filter((book) => book.source !== 'excluded')
        .filter((book) => {
          if (!needle) return true;
          return (
            book.title.toLowerCase().includes(needle) ||
            book.author.toLowerCase().includes(needle) ||
            book.publisher.toLowerCase().includes(needle)
          );
        })
        .filter((book) => (genre ? book.genre === genre : true))
        .filter((book) => (mood ? book.moods.includes(mood) : true))
        .map((book) => ({ book, item: state.library.find((i) => i.bookId === book.id) }))
    : all
        .filter((entry) => entry.item.shelf === shelf)
        .map((entry) => ({ book: entry.book, item: entry.item }));

  const openEdit = (book: Book) => {
    const item = state.library.find((i) => i.bookId === book.id);
    setEditing(book);
    setProgressDraft(item?.progress ? String(item.progress) : '');
    setRatingDraft(item?.rating ?? 0);
    setNoteDraft(item?.note ?? '');
    setMenuFor(null);
  };

  const shelfEmpty = all.filter((entry) => entry.item.shelf === shelf).length === 0;
  const styles = makeStyles(c);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ paddingTop: 10, paddingBottom: 12 }}>
          <Txt style={styles.title}>Biblioteka</Txt>
        </View>

        {searchActive ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              paddingTop: 14,
              paddingBottom: 2,
            }}
          >
            <Txt variant="meta" color={c.inkSoft}>
              w całym katalogu
            </Txt>
            <Txt variant="meta" color={c.inkSoft}>
              {items.length} {plural(items.length, 'książka', 'książki', 'książek')}
            </Txt>
          </View>
        ) : (
        <View style={styles.shelves}>
          {SHELVES.map((key) => {
            const active = shelf === key;
            return (
              <Pressable
                key={key}
                onPress={() => setShelf(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${SHELF_LABEL[key]}, ${counts[key]}`}
                style={[styles.shelfTab, active ? styles.shelfTabActive : null]}
              >
                <Txt
                  numberOfLines={1}
                  style={[styles.shelfLabel, active ? styles.shelfLabelActive : null]}
                >
                  {SHELF_LABEL[key]}
                </Txt>
                <Txt style={[styles.shelfCount, active ? styles.shelfCountActive : null]}>
                  {counts[key]}
                </Txt>
              </Pressable>
            );
          })}
        </View>
        )}

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Szukaj po tytule, autorze lub wydawcy"
              autoCorrect={false}
              style={{ minHeight: 44, paddingVertical: 9 }}
            />
          </View>
          <IconBtn
            name="sliders"
            label="Filtry"
            size={44}
            onPress={() => setFiltersOpen(true)}
            color={genre || mood ? c.claret : c.ink}
          />
        </View>

        {genre || mood ? (
          <View style={{ flexDirection: 'row', gap: 6, marginTop: 10 }}>
            {genre ? (
              <Pill label={genre} active tone="claret" onPress={() => setGenre(null)} />
            ) : null}
            {mood ? (
              <Pill label={`nastrój: ${mood}`} active tone="claret" onPress={() => setMood(null)} />
            ) : null}
          </View>
        ) : null}

        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 14, paddingBottom: 24 }}
        >
          {items.length === 0 ? (
            searchActive ? (
              <EmptyState
                centered
                icon="search"
                title="Brak wyników"
                body="Nie mamy w katalogu książki, która pasuje do tego szukania i filtrów."
                action={
                  <Btn
                    label="Wyczyść szukanie"
                    variant="ghost"
                    onPress={() => {
                      setQuery('');
                      setGenre(null);
                      setMood(null);
                    }}
                  />
                }
              />
            ) : shelfEmpty ? (
              <EmptyState
                centered
                icon={shelf === 'read' ? 'check-circle' : shelf === 'reading' ? 'book-open' : 'bookmark'}
                title={
                  shelf === 'want'
                    ? 'Tu jeszcze nic nie ma.'
                    : shelf === 'reading'
                      ? 'Nic nie czytasz w tej chwili.'
                      : 'Jeszcze nic nie skończyłeś.'
                }
                body={
                  shelf === 'want'
                    ? 'Przesuwaj fragmenty w prawo, aby dodawać książki. Możesz też dopisać tytuł ręcznie z ekranu książki.'
                    : shelf === 'reading'
                      ? 'Oznacz książkę jako „Czytam”, żeby dopisywać postęp i wracać do niej wieczorem.'
                      : 'Oznacz przeczytaną książkę i dodaj jedno zdanie wrażeń. Bez recenzji, bez gwiazdek na pokaz.'
                }
              />
            ) : (
              <EmptyState
                centered
                icon="search"
                title="Brak wyników"
                body="Nie mamy nic, co pasuje do tego szukania i filtrów. Wyczyść filtry i spróbuj jeszcze raz."
                action={
                  <Btn
                    label="Wyczyść filtry"
                    variant="ghost"
                    onPress={() => {
                      setQuery('');
                      setGenre(null);
                      setMood(null);
                    }}
                  />
                }
              />
            )
          ) : (
            items.map(({ item, book }, index) => (
              <View key={book.id}>
                {index > 0 ? <Rule /> : null}
                <View style={styles.row}>
                  <Pressable
                    onPress={() => router.push(`/ksiazka/${book.id}`)}
                    accessibilityRole="button"
                    accessibilityLabel={`${book.title}, ${book.author}`}
                    style={({ pressed }) => [styles.rowMain, pressed ? { opacity: 0.7 } : null]}
                  >
                    <Cover book={book} width={44} />
                    <View style={{ flex: 1 }}>
                      <Txt
                        numberOfLines={1}
                        style={{ fontFamily: fonts.semi, fontSize: 16, color: c.ink }}
                      >
                        {book.title}
                      </Txt>
                      <Txt variant="small" color={c.inkSoft} numberOfLines={1}>
                        {book.author} · {book.genre}
                      </Txt>

                      {item && item.shelf === 'reading' ? (
                        <View style={{ marginTop: 7 }}>
                          <View style={styles.progressTrack}>
                            <View
                              style={{
                                height: 2,
                                backgroundColor: c.claret,
                                width: `${
                                  book.pages && item.progress
                                    ? Math.min(100, Math.round((item.progress / book.pages) * 100))
                                    : 4
                                }%`,
                              }}
                            />
                          </View>
                          <Txt variant="micro" color={c.inkSoft} style={{ marginTop: 4 }}>
                            {item.progress
                              ? `strona ${item.progress} z ${book.pages || '?'}`
                              : 'dodaj postęp czytania'}
                          </Txt>
                        </View>
                      ) : null}

                      {item && item.shelf === 'read' ? (
                        <View style={{ marginTop: 6 }}>
                          <Stars value={item.rating ?? 0} size={13} />
                          {item.note ? (
                            <Txt
                              variant="small"
                              color={c.inkMid}
                              numberOfLines={1}
                              style={{ marginTop: 4, fontFamily: fonts.readItalic }}
                            >
                              „{item.note}”
                            </Txt>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                  {item ? (
                    <Pressable
                      onPress={() => setMenuFor(book)}
                      accessibilityRole="button"
                      accessibilityLabel={`Opcje książki ${book.title}`}
                      hitSlop={8}
                      style={styles.moreBtn}
                    >
                      <Feather name="more-horizontal" size={18} color={c.inkMid} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Filters */}
      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtry">
        <Txt variant="meta" color={c.inkSoft} style={{ marginBottom: 8 }}>
          gatunek
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 18 }}>
          {GENRES.map((option) => (
            <Pill
              key={option.value}
              label={option.label}
              active={genre === option.value}
              tone={genre === option.value ? 'forest' : 'default'}
              onPress={() => setGenre(genre === option.value ? null : option.value)}
            />
          ))}
        </View>
        <Txt variant="meta" color={c.inkSoft} style={{ marginBottom: 8 }}>
          tag emocjonalny
        </Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {MOODS.map((option) => (
            <Pill
              key={option.value}
              label={option.value}
              active={mood === option.value}
              tone={mood === option.value ? 'forest' : 'default'}
              onPress={() => setMood(mood === option.value ? null : option.value)}
            />
          ))}
        </View>
        <Btn label="Pokaż wyniki" onPress={() => setFiltersOpen(false)} />
      </Sheet>

      {/* Item menu */}
      <Sheet visible={!!menuFor} onClose={() => setMenuFor(null)}>
        {menuFor ? (
          <>
            <Txt variant="meta" color={c.inkSoft} style={{ marginBottom: 4 }}>
              {menuFor.author}
            </Txt>
            <Txt variant="title" style={{ marginBottom: 14 }}>
              {menuFor.title}
            </Txt>
            {SHELVES.filter((key) => key !== shelf).map((key) => (
              <Pressable
                key={key}
                onPress={() => {
                  dispatch({ type: 'SET_SHELF', bookId: menuFor.id, shelf: key });
                  setMenuFor(null);
                  setShelf(key);
                }}
                accessibilityRole="button"
                style={styles.menuRow}
              >
                <Feather name="corner-up-right" size={16} color={c.inkMid} />
                <Txt variant="label" style={{ flex: 1 }}>
                  Przenieś na „{SHELF_LABEL[key]}”
                </Txt>
              </Pressable>
            ))}
            <Pressable onPress={() => openEdit(menuFor)} accessibilityRole="button" style={styles.menuRow}>
              <Feather name="edit-3" size={16} color={c.inkMid} />
              <Txt variant="label" style={{ flex: 1 }}>
                {shelf === 'read' ? 'Oceń i dopisz wrażenie' : 'Dodaj postęp czytania'}
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                const target = menuFor;
                setMenuFor(null);
                setShopsFor(target);
              }}
              accessibilityRole="button"
              style={styles.menuRow}
            >
              <Feather name="shopping-bag" size={16} color={c.inkMid} />
              <Txt variant="label" style={{ flex: 1 }}>
                Zobacz, gdzie kupić
              </Txt>
            </Pressable>
            <Pressable
              onPress={() => {
                dispatch({ type: 'REMOVE_FROM_LIBRARY', bookId: menuFor.id });
                setMenuFor(null);
              }}
              accessibilityRole="button"
              style={styles.menuRow}
            >
              <Feather name="trash-2" size={16} color={c.claret} />
              <Txt variant="label" color={c.claret} style={{ flex: 1 }}>
                Usuń z biblioteki
              </Txt>
            </Pressable>
          </>
        ) : null}
      </Sheet>

      {/* Progress / rating */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Sheet
          visible={!!editing}
          onClose={() => setEditing(null)}
          title={editing ? editing.title : ''}
        >
          {editing ? (
            <>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: -10, marginBottom: 16 }}>
                {editing.author}
              </Txt>
              <Field
                label="Na której stronie jesteś?"
                value={progressDraft}
                onChangeText={(value) => setProgressDraft(value.replace(/[^0-9]/g, '').slice(0, 5))}
                placeholder={editing.pages ? `1–${editing.pages}` : 'np. 120'}
                keyboardType="number-pad"
                hint={editing.pages ? `Książka ma ${editing.pages} stron.` : undefined}
              />
              <Txt variant="label" color={c.inkMid} style={{ marginTop: 18, marginBottom: 8 }}>
                Ocena
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Stars value={ratingDraft} onChange={setRatingDraft} />
                <Txt variant="small" color={c.inkSoft}>
                  {ratingDraft ? `${ratingDraft}/5` : 'opcjonalnie'}
                </Txt>
              </View>
              <View style={{ height: 14 }} />
              <Field
                label="Jedno zdanie wrażeń"
                value={noteDraft}
                onChangeText={setNoteDraft}
                maxLength={120}
                counter={`${noteDraft.length}/120`}
                placeholder="np. Czytałam w autobusie i przegapiłam przystanek."
                multiline
                style={{ minHeight: 72, textAlignVertical: 'top' }}
              />
              <View style={{ height: 18 }} />
              <Btn
                label="Zapisz"
                onPress={() => {
                  dispatch({
                    type: 'SET_SHELF',
                    bookId: editing.id,
                    shelf: shelf,
                    progress: progressDraft ? Number(progressDraft) : undefined,
                    rating: ratingDraft || undefined,
                    note: noteDraft.trim() || undefined,
                  });
                  setEditing(null);
                }}
              />
            </>
          ) : null}
        </Sheet>
      </KeyboardAvoidingView>

      <ShopSheet book={shopsFor} visible={!!shopsFor} onClose={() => setShopsFor(null)} />
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    title: {
      fontFamily: fonts.semi,
      fontSize: 26,
      lineHeight: 32,
      color: c.ink,
      letterSpacing: -0.3,
    },
    shelves: {
      flexDirection: 'row',
      gap: 4,
      padding: 4,
      borderRadius: 12,
      backgroundColor: c.paperDeep,
    },
    shelfTab: {
      flex: 1,
      height: 42,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1,
    },
    shelfTabActive: {
      backgroundColor: c.forest,
    },
    shelfLabel: {
      fontFamily: fonts.uiMedium,
      fontSize: 11.5,
      lineHeight: 15,
      letterSpacing: 0.1,
      color: c.inkSoft,
    },
    shelfLabelActive: {
      color: c.onDark,
    },
    shelfCount: {
      fontFamily: fonts.uiMedium,
      fontSize: 9.5,
      lineHeight: 12,
      letterSpacing: 0.2,
      color: c.inkSoft,
      fontVariant: ['tabular-nums'],
    },
    shelfCountActive: {
      color: c.brass,
    },
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
    rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    moreBtn: { padding: 6 },
    progressTrack: { height: 2, backgroundColor: c.ruleSoft, width: '100%' },
    menuRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 15,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.ruleSoft,
    },
  });
}
