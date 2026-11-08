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
import { Book, GENRES, Genre, MOODS, Mood, SHELF_LABEL, Shelf } from '@/data/types';
import { useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const SHELVES: Shelf[] = ['want', 'reading', 'read'];

export default function LibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch } = useStore();

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

  const items = all
    .filter((entry) => entry.item.shelf === shelf)
    .filter((entry) => {
      const needle = query.trim().toLowerCase();
      if (!needle) return true;
      return (
        entry.book.title.toLowerCase().includes(needle) ||
        entry.book.author.toLowerCase().includes(needle)
      );
    })
    .filter((entry) => (genre ? entry.book.genre === genre : true))
    .filter((entry) => (mood ? entry.book.moods.includes(mood) : true));

  const openEdit = (book: Book) => {
    const item = state.library.find((i) => i.bookId === book.id);
    setEditing(book);
    setProgressDraft(item?.progress ? String(item.progress) : '');
    setRatingDraft(item?.rating ?? 0);
    setNoteDraft(item?.note ?? '');
    setMenuFor(null);
  };

  const shelfEmpty = all.filter((entry) => entry.item.shelf === shelf).length === 0;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={{ flex: 1, paddingHorizontal: 22 }}>
        <View style={{ paddingTop: 10, paddingBottom: 12 }}>
          <Txt style={styles.title}>Biblioteka</Txt>
          <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
            {all.length} {all.length === 1 ? 'książka' : 'książek'} na trzech półkach
          </Txt>
        </View>

        <View style={styles.shelves}>
          {SHELVES.map((key) => {
            const active = shelf === key;
            return (
              <Pressable
                key={key}
                onPress={() => setShelf(key)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={styles.shelfTab}
              >
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Txt
                    variant="label"
                    color={active ? colors.ink : colors.inkSoft}
                    style={{ fontSize: 14 }}
                  >
                    {SHELF_LABEL[key]}
                  </Txt>
                  <Txt variant="micro" color={colors.inkSoft}>
                    {counts[key]}
                  </Txt>
                </View>
                <View
                  style={{
                    height: 2,
                    marginTop: 7,
                    backgroundColor: active ? colors.claret : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </View>

        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 14 }}>
          <View style={{ flex: 1 }}>
            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Szukaj po tytule lub autorze"
              autoCorrect={false}
              style={{ minHeight: 44, paddingVertical: 9 }}
            />
          </View>
          <IconBtn
            name="sliders"
            label="Filtry"
            size={44}
            onPress={() => setFiltersOpen(true)}
            color={genre || mood ? colors.claret : colors.ink}
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
            shelfEmpty ? (
              <EmptyState
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
                action={
                  <Btn
                    label="Wróć do feedu"
                    variant="ghost"
                    onPress={() => router.navigate('/')}
                  />
                }
              />
            ) : (
              <EmptyState
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
                        style={{ fontFamily: fonts.semi, fontSize: 16, color: colors.ink }}
                      >
                        {book.title}
                      </Txt>
                      <Txt variant="small" color={colors.inkSoft} numberOfLines={1}>
                        {book.author} · {book.genre}
                      </Txt>

                      {item.shelf === 'reading' ? (
                        <View style={{ marginTop: 7 }}>
                          <View style={styles.progressTrack}>
                            <View
                              style={{
                                height: 2,
                                backgroundColor: colors.claret,
                                width: `${
                                  book.pages && item.progress
                                    ? Math.min(100, Math.round((item.progress / book.pages) * 100))
                                    : 4
                                }%`,
                              }}
                            />
                          </View>
                          <Txt variant="micro" color={colors.inkSoft} style={{ marginTop: 4 }}>
                            {item.progress
                              ? `strona ${item.progress} z ${book.pages || '?'}`
                              : 'dodaj postęp czytania'}
                          </Txt>
                        </View>
                      ) : null}

                      {item.shelf === 'read' ? (
                        <View style={{ marginTop: 6 }}>
                          <Stars value={item.rating ?? 0} size={13} />
                          {item.note ? (
                            <Txt
                              variant="small"
                              color={colors.inkMid}
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
                  <Pressable
                    onPress={() => setMenuFor(book)}
                    accessibilityRole="button"
                    accessibilityLabel={`Opcje książki ${book.title}`}
                    hitSlop={8}
                    style={styles.moreBtn}
                  >
                    <Feather name="more-horizontal" size={18} color={colors.inkMid} />
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </View>

      {/* Filters */}
      <Sheet visible={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filtry">
        <Txt variant="meta" color={colors.inkSoft} style={{ marginBottom: 8 }}>
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
        <Txt variant="meta" color={colors.inkSoft} style={{ marginBottom: 8 }}>
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
            <Txt variant="meta" color={colors.inkSoft} style={{ marginBottom: 4 }}>
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
                <Feather name="corner-up-right" size={16} color={colors.inkMid} />
                <Txt variant="label" style={{ flex: 1 }}>
                  Przenieś na „{SHELF_LABEL[key]}”
                </Txt>
              </Pressable>
            ))}
            <Pressable onPress={() => openEdit(menuFor)} accessibilityRole="button" style={styles.menuRow}>
              <Feather name="edit-3" size={16} color={colors.inkMid} />
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
              <Feather name="shopping-bag" size={16} color={colors.inkMid} />
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
              <Feather name="trash-2" size={16} color={colors.claret} />
              <Txt variant="label" color={colors.claret} style={{ flex: 1 }}>
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
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: -10, marginBottom: 16 }}>
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
              <Txt variant="label" color={colors.inkMid} style={{ marginTop: 18, marginBottom: 8 }}>
                Ocena
              </Txt>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <Stars value={ratingDraft} onChange={setRatingDraft} />
                <Txt variant="small" color={colors.inkSoft}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  title: {
    fontFamily: fonts.semi,
    fontSize: 26,
    lineHeight: 32,
    color: colors.ink,
    letterSpacing: -0.3,
  },
  shelves: { flexDirection: 'row', gap: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.rule },
  shelfTab: { flex: 1, paddingBottom: 0 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 10 },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  moreBtn: { padding: 6 },
  progressTrack: { height: 2, backgroundColor: colors.ruleSoft, width: '100%' },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 15,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.ruleSoft,
  },
});
