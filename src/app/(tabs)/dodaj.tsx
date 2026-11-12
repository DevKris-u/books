import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FragmentCard } from '@/components/FragmentCard';
import { Btn, Cover, Field, Pill, Rule, Txt } from '@/components/ui';
import {
  Book,
  EMOTION_TAGS,
  EmotionTag,
  Genre,
  GENRES,
  Purpose,
  PURPOSES,
} from '@/data/types';
import { recogniseFragment } from '@/lib/ocr';
import { tapLight } from '@/lib/haptics';
import { getDeviceKey } from '@/lib/device';
import { COVER_COLORS } from '@/lib/covers';
import { publishBook, publishFragment, searchBooks } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { normalizeText, plural } from '@/lib/utils';
import { Candidate } from '@/lib/recommend';
import { DAILY_POST_LIMIT, postsToday, useStore } from '@/state/store';
import { fonts, useColors } from '@/theme';

const MAX_REACTION = 200;
const MAX_FRAGMENT = 500;

const BLOCKED = ['nienawidzę cię', 'zabij się', 'kurwa mać'];

const STEPS = ['Reakcja', 'Fragment', 'Książka', 'Podgląd'];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch, bookById } = useStore();
  const { user } = useAuth();
  const c = useColors();
  const styles = makeStyles(c);

  const [step, setStep] = useState(0);
  const [reaction, setReaction] = useState('');
  const [purpose, setPurpose] = useState<Purpose | null>(null);
  const [tags, setTags] = useState<EmotionTag[]>([]);
  const [text, setText] = useState('');
  const [page, setPage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [recognizing, setRecognizing] = useState(false);
  const [ocrDemo, setOcrDemo] = useState(false);
  const [pickerNote, setPickerNote] = useState<string | null>(null);
  const [bookId, setBookId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Book[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newGenre, setNewGenre] = useState<Genre>('obyczajowa');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState<'live' | 'moderation' | null>(null);
  const checkAnim = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!published) return;
    Animated.parallel([
      Animated.timing(checkAnim, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(checkOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
  }, [published, checkAnim, checkOpacity]);

  const todayCount = postsToday(state);
  const limitReached = todayCount >= DAILY_POST_LIMIT;
  const book = bookId ? bookById(bookId) : undefined;
  // Titles a publisher took down stay hidden, even if Postgres still returns them.
  const visibleResults = searchResults.filter((item) => bookById(item.id)?.source !== 'excluded');

  // Search runs in Postgres, so the whole catalogue is reachable without
  // downloading thousands of books. An empty query shows a few recent titles.
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    const requestId = ++searchRequestRef.current;

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const results = await searchBooks(query, { limit: query.trim() ? 20 : 6 });
        if (requestId === searchRequestRef.current) setSearchResults(results);
      } catch (caught) {
        if (requestId === searchRequestRef.current) {
          setSearchError(
            caught instanceof Error ? caught.message : 'Nie udało się wyszukać książek.',
          );
          setSearchResults([]);
        }
      } finally {
        if (requestId === searchRequestRef.current) setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [query]);

  const toggleTag = (tag: EmotionTag) => {
    setTags((current) =>
      current.includes(tag)
        ? current.filter((t) => t !== tag)
        : current.length >= 3
          ? current
          : [...current, tag],
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    setPickerNote(null);
    try {
      const permission =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickerNote('Bez dostępu do zdjęć możesz wpisać fragment ręcznie — to zajmuje tyle samo czasu.');
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ quality: 0.7, mediaTypes: ['images'] })
          : await ImagePicker.launchImageLibraryAsync({ quality: 0.7, mediaTypes: ['images'] });
      if (result.canceled) return;
      setImageUri(result.assets[0].uri);
      setRecognizing(true);
      const ocr = await recogniseFragment(result.assets[0].uri);
      setText((current) => (current.trim() ? current : ocr.text));
      setOcrDemo(true);
      setRecognizing(false);
    } catch {
      setRecognizing(false);
      setPickerNote('Nie udało się otworzyć zdjęcia. Spróbuj ponownie albo wpisz fragment ręcznie.');
    }
  };

  const createBook = async () => {
    if (saving) return;
    if (!newTitle.trim() || !newAuthor.trim()) {
      setError('Do nowej książki potrzebujemy tytułu i autora.');
      return;
    }
    const id = `user-${Date.now()}`;
    const created: Book = {
      id,
      title: newTitle.trim(),
      author: newAuthor.trim(),
      genre: newGenre,
      moods: [],
      year: new Date().getFullYear(),
      publisher: newPublisher.trim() || 'wydanie własne',
      pages: 0,
      description: 'Książka dodana przez czytelnika. Nie mamy jeszcze jej opisu.',
      source: 'unverified',
      color: COVER_COLORS[state.books.length % COVER_COLORS.length],
    };
    setSaving(true);
    setError(null);
    try {
      await publishBook(created);
      dispatch({ type: 'ADD_BOOK', book: created });
      setBookId(id);
      setCreating(false);
      setQuery('');
    } catch {
      setError(
        'Nie udało się dodać książki do bazy. Sprawdź połączenie i spróbuj ponownie.',
      );
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    if (!book || !purpose || saving) return;
    const cleanText = text.trim();
    const cleanReaction = reaction.trim();

    if (normalizeText(`${cleanText} ${cleanReaction}`).match(new RegExp(BLOCKED.join('|')))) {
      setPublished('moderation');
      return;
    }

    const duplicate = state.posts.some(
      (post) => post.bookId === book.id && normalizeText(post.text) === normalizeText(cleanText),
    );
    if (duplicate) {
      setError('Ten fragment już dodałeś z tej książki. Wybierz inny — feed ma być różnorodny.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      // A fragment references its book through a foreign key, so the book has
      // to exist in Postgres first. Books added by readers only live in local
      // state until now; publishing is idempotent for books already there.
      await publishBook(book);
      const deviceKey = state.deviceKey ?? (await getDeviceKey());
      const fragment = await publishFragment(
        {
          bookId: book.id,
          text: cleanText,
          reaction: cleanReaction,
          tags,
          page: page.trim() ? Number(page.trim()) : undefined,
          purpose,
          curator: { name: state.profile.name, handle: state.profile.handle },
          imageUri: imageUri ?? undefined,
        },
        { deviceKey, userId: user?.id ?? null },
      );
      dispatch({ type: 'ADD_POST', fragment });
      setPublished('live');
    } catch (caught) {
      setError(
        caught instanceof Error && caught.message.startsWith('Nie ')
          ? caught.message
          : 'Nie udało się opublikować fragmentu. Sprawdź połączenie i spróbuj ponownie.',
      );
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setStep(0);
    setReaction('');
    setPurpose(null);
    setTags([]);
    setText('');
    setPage('');
    setImageUri(null);
    setOcrDemo(false);
    setBookId(null);
    setQuery('');
    setCreating(false);
    setPublished(null);
    setError(null);
  };

  const canNext =
    !saving &&
    (() => {
      if (step === 0) return reaction.trim().length > 0 && !!purpose && tags.length > 0;
      if (step === 1) return text.trim().length > 0 && text.length <= MAX_FRAGMENT;
      if (step === 2) return !!book;
      return !!book && !!purpose;
    })();

  const draft: Candidate | null =
    book && purpose
      ? {
          id: 'draft',
          bookId: book.id,
          text: text.trim() || 'Twój fragment pojawi się tutaj.',
          reaction: reaction.trim() || 'Twoja reakcja',
          tags: tags.length ? tags : ['refleksja'],
          page: page ? Number(page) : undefined,
          purpose,
          curator: { name: state.profile.name, handle: state.profile.handle },
          createdAt: Date.now(),
          likes: 0,
          book,
        }
      : null;

  if (published) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20, paddingHorizontal: 22 }]}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Animated.View
            style={[
              styles.doneMark,
              { transform: [{ scale: checkAnim }], opacity: checkOpacity },
            ]}
          >
            <Feather
              name={published === 'live' ? 'check' : 'shield'}
              size={40}
              color={c.forest}
            />
          </Animated.View>
          <Txt style={styles.doneTitle}>
            {published === 'live'
              ? 'Twój fragment jest już w feedzie.'
              : 'Fragment trafił do moderacji.'}
          </Txt>
          <Txt variant="body" color={c.inkMid} style={{ marginTop: 10, maxWidth: 330 }}>
            {published === 'live'
              ? 'Ktoś właśnie dostanie powód, żeby otworzyć tę książkę. Dziękujemy — to jest cała idea Marginesu.'
              : 'Sprawdzimy go w ciągu 48 godzin. To rzadkie, ale wolimy dmuchać na zimne przy treściach, które mogą kogoś skrzywdzić.'}
          </Txt>
          <View style={{ marginTop: 30, gap: 10 }}>
            <Btn label="Wróć do feedu" onPress={() => router.navigate('/')} />
            <Btn label="Dodaj kolejny" variant="ghost" onPress={reset} />
          </View>
        </View>
      </View>
    );
  }

  if (limitReached) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 20, paddingHorizontal: 22 }]}>
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Txt variant="meta" color={c.inkSoft}>
            dzienny limit
          </Txt>
          <Txt style={[styles.doneTitle, { marginTop: 8 }]}>
            Dodałeś dziś już 5 fragmentów.
          </Txt>
          <Txt variant="body" color={c.inkMid} style={{ marginTop: 10 }}>
            Wróć jutro — dbamy o jakość feedu. A tymczasem zobacz, co dodali inni.
          </Txt>
          <View style={{ marginTop: 28, gap: 10 }}>
            <Btn label="Wróć do feedu" onPress={() => router.navigate('/')} />
            <Btn
              label="Moje wpisy w profilu"
              variant="ghost"
              onPress={() => router.navigate('/profil')}
            />
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingHorizontal: 22 }}>
        <View style={styles.header}>
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityRole="button"
              accessibilityLabel="Wstecz"
              style={styles.backBtn}
            >
              <Feather name="chevron-left" size={15} color={c.inkMid} />
            </Pressable>
          ) : null}
          <View style={{ width: '100%', alignItems: 'center' }}>
            <Txt style={[styles.title, { textAlign: 'center', width: '100%' }]}>Dodaj fragment</Txt>
            <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4, textAlign: 'center', width: '100%' }}>
              {todayCount}/{DAILY_POST_LIMIT}
            </Txt>
          </View>
        </View>

        <View style={styles.progress}>
          {STEPS.map((label, index) => (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  height: 2,
                  backgroundColor: index <= step ? c.claret : c.ruleSoft,
                }}
              />
              <Txt
                variant="micro"
                color={index === step ? c.ink : c.inkSoft}
                numberOfLines={1}
                style={{ fontSize: 9.5 }}
              >
                {label}
              </Txt>
            </View>
          ))}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 18, paddingBottom: 30 }}
      >
        {step === 0 ? (
          <View style={{ gap: 20 }}>
            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Co czujesz? Co myślisz?
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                Twoja reakcja jest najważniejsza.
              </Txt>
            </View>

            <Field
              value={reaction}
              onChangeText={setReaction}
              placeholder="np. ONI SIĘ POCALOWALI 🥰❤️"
              multiline
              maxLength={MAX_REACTION}
              counter={`${reaction.length}/${MAX_REACTION}`}
              style={{ minHeight: 92, textAlignVertical: 'top' }}
              error={reaction.length >= MAX_REACTION ? 'Krótko. To ma być reakcja, nie recenzja.' : undefined}
            />

            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Po co cytujesz?
              </Txt>
              <View style={styles.purposeGrid}>
                {PURPOSES.map((option) => {
                  const active = purpose === option.value;
                  return (
                    <View key={option.value} style={styles.purposeCell}>
                      <Pressable
                        onPress={() => setPurpose(option.value)}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: active }}
                        style={[styles.purposeCard, active ? styles.purposeCardActive : null]}
                      >
                        <View style={styles.purposeHead}>
                          <Txt variant="label" color={active ? c.onDark : c.ink}>
                            {option.label}
                          </Txt>
                          {active ? <Feather name="check" size={13} color={c.brass} /> : null}
                        </View>
                        <Txt
                          variant="small"
                          color={active ? c.onDarkSoft : c.inkSoft}
                          style={{ marginTop: 2 }}
                        >
                          {option.hint}
                        </Txt>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Emocje we fragmencie
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4, marginBottom: 10 }}>
                Wybierz 1–3 tagi.
              </Txt>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {EMOTION_TAGS.map((tag) => (
                  <Pill
                    key={tag}
                    label={tag}
                    active={tags.includes(tag)}
                    onPress={() => toggleTag(tag)}
                    tone={tags.includes(tag) ? 'forest' : 'default'}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}

        {step === 1 ? (
          <View style={{ gap: 18 }}>
            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Fragment, który Cię zainspirował
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                Maksymalnie 3–4 zdania.
              </Txt>
            </View>

            {imageUri ? (
              <View>
                <Image source={{ uri: imageUri }} style={styles.photo} resizeMode="cover" />
                <Pressable
                  onPress={() => {
                    setImageUri(null);
                    setOcrDemo(false);
                  }}
                  style={styles.removePhoto}
                  accessibilityRole="button"
                  accessibilityLabel="Usuń zdjęcie"
                >
                  <Feather name="x" size={13} color={c.onDark} />
                  <Txt variant="micro" color={c.onDark}>
                    usuń zdjęcie
                  </Txt>
                </Pressable>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Btn
                  label="Zrób zdjęcie"
                  icon="camera"
                  onPress={() => void pickImage('camera')}
                  style={{ flex: 1 }}
                  full={false}
                />
                <Btn
                  label="Z galerii"
                  icon="image"
                  variant="ghost"
                  onPress={() => void pickImage('library')}
                  style={{ flex: 1 }}
                  full={false}
                />
              </View>
            )}

            {recognizing ? (
              <View style={styles.recognizing}>
                <ActivityIndicator size="small" color={c.claret} />
                <Txt variant="small" color={c.inkMid}>
                  Odczytujemy tekst ze zdjęcia…
                </Txt>
              </View>
            ) : null}

            {pickerNote ? (
              <Txt variant="small" color={c.inkMid}>
                {pickerNote}
              </Txt>
            ) : null}

            <Field
              value={text}
              onChangeText={setText}
              placeholder="Wpisz fragment albo zrób zdjęcie strony — tekst pojawi się tutaj."
              multiline
              maxLength={700}
              counter={`${text.length}/${MAX_FRAGMENT}`}
              style={{ minHeight: 150, textAlignVertical: 'top', fontFamily: fonts.read }}
              error={
                text.length > MAX_FRAGMENT
                  ? 'Fragment nie może być dłuższy niż 500 znaków — wybierz najważniejsze zdanie.'
                  : undefined
              }
              hint={
                ocrDemo
                  ? 'Rozpoznawanie tekstu w tej wersji jest demonstracyjne — popraw tekst pod zdjęciem.'
                  : 'Publikujemy tylko ten skrót.'
              }
            />

            <Field
              label="Strona (opcjonalnie)"
              value={page}
              onChangeText={(value) => setPage(value.replace(/[^0-9]/g, '').slice(0, 4))}
              placeholder="np. 214"
              keyboardType="number-pad"
            />

            <Rule />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Feather name="info" size={14} color={c.inkSoft} />
              <Txt variant="small" color={c.inkSoft} style={{ flex: 1 }}>
                Fragmenty z mową nienawiści i treści dla dorosłych bez oznaczenia nie przechodzą
                automatycznej weryfikacji.
              </Txt>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 16 }}>
            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Jakiej książki?
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                Szukamy po tytule i autorze. Jeśli jej nie ma, dodaj ją — to 20 sekund.
              </Txt>
            </View>

            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Wpisz tytuł lub autora"
              autoCorrect={false}
            />

            {searchLoading ? (
              <View style={{ paddingVertical: 10, alignItems: 'center' }}>
                <ActivityIndicator size="small" color={c.claret} />
              </View>
            ) : searchError ? (
              <Txt variant="small" color={c.claret} style={{ marginTop: 6 }}>
                {searchError}
              </Txt>
            ) : (
              visibleResults.map((item) => {
                const active = bookId === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      if (bookById(item.id) == null) {
                        dispatch({ type: 'ADD_BOOK', book: item });
                      }
                      setBookId(item.id);
                      setQuery('');
                    }}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: active }}
                    style={[styles.bookRow, { borderColor: active ? c.ink : c.rule }]}
                  >
                    <Cover book={item} width={40} />
                    <View style={{ flex: 1 }}>
                      <Txt variant="label" numberOfLines={1} color={c.ink}>
                        {item.title}
                      </Txt>
                      <Txt variant="small" color={c.inkSoft} numberOfLines={1}>
                        {item.author || 'autor nieznany'}
                      </Txt>
                    </View>
                    {active ? (
                      <Feather name="check" size={16} color={c.claret} />
                    ) : (
                      <View
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: 4,
                          backgroundColor: c.inkSoft,
                        }}
                      />
                    )}
                  </Pressable>
                );
              })
            )}

            {!searchLoading && !searchError && query.trim() && !visibleResults.length ? (
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 6 }}>
                Nie znaleziono książek. Spróbuj innej frazy albo dodaj własną.
              </Txt>
            ) : null}

            {!creating ? (
              <Btn
                label="Dodaj nową książkę"
                variant="ghost"
                icon="plus"
                onPress={() => {
                  setCreating(true);
                  setNewTitle(query);
                }}
              />
            ) : (
              <View style={styles.newBook}>
                <Txt variant="label" color={c.ink} style={{ marginBottom: 12 }}>
                  Nowa książka
                </Txt>
                <View style={{ gap: 12 }}>
                  <Field
                    label="Tytuł"
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="np. Drugie dno"
                  />
                  <Field
                    label="Autor"
                    value={newAuthor}
                    onChangeText={setNewAuthor}
                    placeholder="np. Piotr Lange"
                  />
                  <Field
                    label="Wydawnictwo (opcjonalnie)"
                    value={newPublisher}
                    onChangeText={setNewPublisher}
                    placeholder="np. Wydawnictwo Nurt"
                  />
                  <View>
                    <Txt variant="label" color={c.inkMid} style={{ marginBottom: 8 }}>
                      Gatunek
                    </Txt>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      {GENRES.map((genre) => (
                        <Pill
                          key={genre.value}
                          label={genre.label}
                          small
                          active={newGenre === genre.value}
                          tone={newGenre === genre.value ? 'forest' : 'default'}
                          onPress={() => setNewGenre(genre.value)}
                        />
                      ))}
                    </View>
                  </View>
                  {error ? (
                    <Txt variant="small" color={c.claret}>
                      {error}
                    </Txt>
                  ) : null}
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <Btn
                      label="Dodaj książkę"
                      onPress={createBook}
                      style={{ flex: 1 }}
                      full={false}
                    />
                    <Btn
                      label="Anuluj"
                      variant="ghost"
                      onPress={() => {
                        setCreating(false);
                        setError(null);
                      }}
                      style={{ flex: 1 }}
                      full={false}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>
        ) : null}

        {step === 3 && draft ? (
          <View style={{ gap: 16 }}>
            <View>
              <Txt variant="label" color={c.ink} style={{ fontSize: 16 }}>
                Tak będzie wyglądać w feedzie
              </Txt>
              <Txt variant="small" color={c.inkSoft} style={{ marginTop: 4 }}>
                Ostatnie spojrzenie przed publikacją.
              </Txt>
            </View>

            <View style={{ marginTop: 12 }}>
              <FragmentCard card={draft} />
            </View>

            <View style={styles.metaBox}>
              <Row label="Cel cytatu" value={PURPOSES.find((p) => p.value === purpose)?.label ?? '—'} styles={styles} />
              <Row label="Książka" value={`${book?.title} · ${book?.author}`} styles={styles} />
              <Row label="Tagi" value={tags.join(', ') || '—'} styles={styles} />
              <Row
                label="Źródło"
                value={
                  book?.source === 'licensed'
                    ? 'licencjonowane'
                    : book?.source === 'public'
                      ? 'domena publiczna'
                      : 'niezweryfikowane'
                }
                styles={styles}
              />
            </View>

            {error ? (
              <Txt variant="small" color={c.claret}>
                {error}
              </Txt>
            ) : null}

            <Txt variant="small" color={c.inkSoft}>
              Publikując, potwierdzasz, że cytujesz w celach analizy, krytyki, polemiki lub
              emocji. Dziś dodałeś {todayCount} z {DAILY_POST_LIMIT}{' '}
              {plural(DAILY_POST_LIMIT, 'fragmentu', 'fragmentów', 'fragmentów')}.
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={step === 3 ? 'Opublikuj' : 'Dalej'}
          accessibilityState={{ disabled: !canNext }}
          disabled={!canNext}
          onPress={() => {
            if (!canNext) return;
            void tapLight();
            if (step < 3) {
              setError(null);
              setStep(step + 1);
            } else {
              void publish();
            }
          }}
          style={({ pressed }) => [
            styles.nextBtn,
            canNext ? styles.nextBtnReady : styles.nextBtnIdle,
            pressed && canNext ? styles.nextBtnPressed : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={c.onDark} />
          ) : (
            <>
              <Txt
                variant="label"
                color={canNext ? c.onDark : c.inkSoft}
                style={{ fontSize: 15 }}
              >
                {step === 3 ? 'Opublikuj' : 'Dalej'}
              </Txt>
              <Feather
                name={step === 3 ? 'check' : 'arrow-right'}
                size={16}
                color={canNext ? c.onDark : c.inkSoft}
                style={{ marginLeft: 8 }}
              />
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value, styles }: { label: string; value: string; styles: ReturnType<typeof makeStyles> }) {
  const c = useColors();
  return (
    <View style={styles.metaRow}>
      <Txt variant="meta" color={c.inkSoft}>
        {label}
      </Txt>
      <Txt variant="small" color={c.ink} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

function makeStyles(c: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.paper },
    header: {
      position: 'relative',
      paddingTop: 10,
      paddingBottom: 12,
    },
    backBtn: {
      position: 'absolute',
      left: 22,
      top: 10,
      padding: 6,
    },
    title: {
      fontFamily: fonts.semi,
      fontSize: 24,
      lineHeight: 30,
      color: c.ink,
      letterSpacing: -0.2,
    },
    progress: { flexDirection: 'row', gap: 8 },
    purposeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: 10,
      marginHorizontal: -4,
    },
    purposeCell: {
      width: '50%',
      paddingHorizontal: 4,
      paddingBottom: 8,
    },
    purposeCard: {
      flexGrow: 1,
      borderWidth: 1,
      borderColor: c.rule,
      borderRadius: 12,
      padding: 10,
    },
    purposeCardActive: {
      backgroundColor: c.forest,
      borderColor: c.forest,
    },
    purposeHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 6,
    },
    photo: { width: '100%', height: 170, borderRadius: 12 },
    removePhoto: {
      position: 'absolute',
      right: 8,
      bottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(11,36,30,0.8)',
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 12,
    },
    recognizing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    bookRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderWidth: 1,
      borderRadius: 12,
      padding: 10,
    },
    newBook: {
      borderWidth: 1,
      borderColor: c.rule,
      borderRadius: 12,
      padding: 14,
      backgroundColor: c.paperSoft,
    },
    metaBox: {
      borderTopWidth: 1,
      borderTopColor: c.rule,
      paddingTop: 10,
      gap: 8,
    },
    metaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
    footer: {
      paddingHorizontal: 22,
      paddingTop: 12,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: c.ruleSoft,
      backgroundColor: c.paper,
    },
    nextBtn: {
      height: 56,
      borderRadius: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtnReady: {
      backgroundColor: c.forest,
      ...(Platform.select({
        web: { boxShadow: '0 10px 26px rgba(11,36,30,0.25)' } as object,
        default: {
          shadowColor: c.forestDeep,
          shadowOpacity: 0.28,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 10 },
          elevation: 6,
        },
      }) ?? {}),
    },
    nextBtnIdle: {
      backgroundColor: 'transparent',
    },
    nextBtnPressed: {
      opacity: 0.92,
      transform: [{ translateY: 1 }],
    },
    doneMark: {
      marginBottom: 24,
    },
    doneTitle: {
      fontFamily: fonts.semi,
      fontSize: 26,
      lineHeight: 33,
      color: c.ink,
      letterSpacing: -0.3,
    },
  });
}
