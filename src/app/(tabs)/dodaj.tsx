import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { normalizeText, plural } from '@/lib/utils';
import { Candidate } from '@/lib/recommend';
import { DAILY_POST_LIMIT, postsToday, useStore } from '@/state/store';
import { colors, fonts } from '@/theme';

const MAX_REACTION = 200;
const MAX_FRAGMENT = 500;
const COVER_COLORS = ['#5B2A2E', '#1F3B34', '#2A3550', '#4A3B26', '#3E2F44', '#6B3A22', '#243C46'];

const BLOCKED = ['nienawidzę cię', 'zabij się', 'kurwa mać'];

const STEPS = ['Reakcja', 'Fragment', 'Książka', 'Podgląd'];

export default function AddScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { state, dispatch, bookById } = useStore();

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
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newPublisher, setNewPublisher] = useState('');
  const [newGenre, setNewGenre] = useState<Genre>('obyczajowa');
  const [error, setError] = useState<string | null>(null);
  const [published, setPublished] = useState<'live' | 'moderation' | null>(null);

  const todayCount = postsToday(state);
  const limitReached = todayCount >= DAILY_POST_LIMIT;
  const book = bookId ? bookById(bookId) : undefined;

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

  const searchResults = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return state.books.filter((b) => b.source !== 'excluded').slice(0, 5);
    return state.books
      .filter((b) => b.source !== 'excluded')
      .filter(
        (b) =>
          b.title.toLowerCase().includes(needle) ||
          b.author.toLowerCase().includes(needle),
      )
      .slice(0, 8);
  }, [query, state.books]);

  const createBook = () => {
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
    dispatch({ type: 'ADD_BOOK', book: created });
    setBookId(id);
    setCreating(false);
    setError(null);
    setQuery('');
  };

  const publish = () => {
    if (!book || !purpose) return;
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

    const fragment = {
      id: `post-${Date.now()}`,
      bookId: book.id,
      text: cleanText,
      reaction: cleanReaction,
      tags,
      page: page.trim() ? Number(page.trim()) : undefined,
      purpose,
      curator: { name: state.profile.name, handle: state.profile.handle },
      createdAt: Date.now(),
      likes: 0,
      imageUri: imageUri ?? undefined,
      mine: true,
    };

    dispatch({ type: 'ADD_POST', fragment });
    setPublished('live');
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

  const canNext = (() => {
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
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <View style={styles.doneMark}>
            <Feather
              name={published === 'live' ? 'check' : 'shield'}
              size={22}
              color={colors.onDark}
            />
          </View>
          <Txt style={styles.doneTitle}>
            {published === 'live'
              ? 'Twój fragment jest już w feedzie.'
              : 'Fragment trafił do moderacji.'}
          </Txt>
          <Txt variant="body" color={colors.inkMid} style={{ marginTop: 10, maxWidth: 330 }}>
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
          <Txt variant="meta" color={colors.inkSoft}>
            dzienny limit
          </Txt>
          <Txt style={[styles.doneTitle, { marginTop: 8 }]}>
            Dodałeś dziś już 5 fragmentów.
          </Txt>
          <Txt variant="body" color={colors.inkMid} style={{ marginTop: 10 }}>
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
          <View style={{ flex: 1 }}>
            <Txt style={styles.title}>Dodaj fragment</Txt>
            <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
              Zdjęcie strony, jedna reakcja, gotowe. Dziś: {todayCount}/{DAILY_POST_LIMIT}.
            </Txt>
          </View>
          {step > 0 ? (
            <Pressable
              onPress={() => setStep(step - 1)}
              accessibilityRole="button"
              style={styles.backRow}
            >
              <Feather name="chevron-left" size={15} color={colors.inkMid} />
              <Txt variant="meta" color={colors.inkMid}>
                wstecz
              </Txt>
            </Pressable>
          ) : null}
        </View>

        <View style={styles.progress}>
          {STEPS.map((label, index) => (
            <View key={label} style={{ flex: 1, gap: 6 }}>
              <View
                style={{
                  height: 2,
                  backgroundColor: index <= step ? colors.claret : colors.ruleSoft,
                }}
              />
              <Txt
                variant="micro"
                color={index === step ? colors.ink : colors.inkSoft}
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
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Co czujesz? Co myślisz?
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
                Twoja reakcja jest najważniejsza — to ona jest wpisem. Fragment dołączysz w
                następnym kroku.
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
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Po co cytujesz?
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4, marginBottom: 10 }}>
                Wybór zapisujemy przy wpisie. Pokazujemy go w szczegółach, nie na karcie.
              </Txt>
              <View style={{ gap: 8 }}>
                {PURPOSES.map((option) => {
                  const active = purpose === option.value;
                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => setPurpose(option.value)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}
                      style={[
                        styles.purposeRow,
                        {
                          borderColor: active ? colors.ink : colors.rule,
                          backgroundColor: active ? colors.forest : 'transparent',
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.radio,
                          { borderColor: active ? colors.onDark : colors.rule },
                        ]}
                      >
                        {active ? <View style={styles.radioDot} /> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Txt variant="label" color={active ? colors.onDark : colors.ink}>
                          {option.label}
                        </Txt>
                        <Txt
                          variant="small"
                          color={active ? colors.onDarkSoft : colors.inkSoft}
                          style={{ marginTop: 2 }}
                        >
                          {option.hint}
                        </Txt>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View>
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Emocje we fragmencie
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4, marginBottom: 10 }}>
                Wybierz 1–3 tagi. Pojawią się na karcie w feedzie.
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
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Fragment, który Cię zainspirował
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
                Maksymalnie 500 znaków — około 3–4 zdań. Reszta zostaje w książce.
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
                  <Feather name="x" size={13} color={colors.onDark} />
                  <Txt variant="micro" color={colors.onDark}>
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
                <ActivityIndicator size="small" color={colors.claret} />
                <Txt variant="small" color={colors.inkMid}>
                  Odczytujemy tekst ze zdjęcia…
                </Txt>
              </View>
            ) : null}

            {pickerNote ? (
              <Txt variant="small" color={colors.inkMid}>
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
                  : 'Oryginalna strona zostaje na zdjęciu. Publikujemy tylko ten skrót.'
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
              <Feather name="info" size={14} color={colors.inkSoft} />
              <Txt variant="small" color={colors.inkSoft} style={{ flex: 1 }}>
                Fragmenty z mową nienawiści i treści dla dorosłych bez oznaczenia nie przechodzą
                automatycznej weryfikacji.
              </Txt>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={{ gap: 16 }}>
            <View>
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Jakiej książki?
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
                Szukamy po tytule i autorze. Jeśli jej nie ma, dodaj ją — to 20 sekund.
              </Txt>
            </View>

            <Field
              value={query}
              onChangeText={setQuery}
              placeholder="Wpisz tytuł lub autora"
              autoCorrect={false}
            />

            {searchResults.map((item) => {
              const active = bookId === item.id;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setBookId(item.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  style={[
                    styles.bookRow,
                    { borderColor: active ? colors.ink : colors.rule },
                  ]}
                >
                  <Cover book={item} width={36} />
                  <View style={{ flex: 1 }}>
                    <Txt variant="label" numberOfLines={1} color={colors.ink}>
                      {item.title}
                    </Txt>
                    <Txt variant="small" color={colors.inkSoft} numberOfLines={1}>
                      {item.author}
                    </Txt>
                  </View>
                  {active ? (
                    <Feather name="check" size={16} color={colors.claret} />
                  ) : (
                    <View
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: 4,
                        backgroundColor:
                          item.source === 'licensed'
                            ? colors.verified
                            : item.source === 'public'
                              ? '#3E5A78'
                              : colors.inkSoft,
                      }}
                    />
                  )}
                </Pressable>
              );
            })}

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
                <Txt variant="label" color={colors.ink} style={{ marginBottom: 12 }}>
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
                    <Txt variant="label" color={colors.inkMid} style={{ marginBottom: 8 }}>
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
                    <Txt variant="small" color={colors.claret}>
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

            <Txt variant="small" color={colors.inkSoft}>
              Książki dodane przez czytelników mają szare oznaczenie źródła i nie trafiają do
              Hot Peaków, dopóki wydawca ich nie potwierdzi.
            </Txt>
          </View>
        ) : null}

        {step === 3 && draft ? (
          <View style={{ gap: 16 }}>
            <View>
              <Txt variant="label" color={colors.ink} style={{ fontSize: 16 }}>
                Tak będzie wyglądać w feedzie
              </Txt>
              <Txt variant="small" color={colors.inkSoft} style={{ marginTop: 4 }}>
                Ostatnie spojrzenie przed publikacją.
              </Txt>
            </View>

            <View style={{ height: 430 }}>
              <FragmentCard card={draft} />
            </View>

            <View style={styles.metaBox}>
              <Row label="Cel cytatu" value={PURPOSES.find((p) => p.value === purpose)?.label ?? '—'} />
              <Row label="Książka" value={`${book?.title} · ${book?.author}`} />
              <Row label="Tagi" value={tags.join(', ') || '—'} />
              <Row
                label="Źródło"
                value={
                  book?.source === 'licensed'
                    ? 'licencjonowane'
                    : book?.source === 'public'
                      ? 'domena publiczna'
                      : 'niezweryfikowane'
                }
              />
            </View>

            {error ? (
              <Txt variant="small" color={colors.claret}>
                {error}
              </Txt>
            ) : null}

            <Txt variant="small" color={colors.inkSoft}>
              Publikując, potwierdzasz, że cytujesz w celach analizy, krytyki, polemiki lub
              emocji. Dziś dodałeś {todayCount} z {DAILY_POST_LIMIT}{' '}
              {plural(DAILY_POST_LIMIT, 'fragmentu', 'fragmentów', 'fragmentów')}.
            </Txt>
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <Btn
          label={step === 3 ? 'Opublikuj' : 'Dalej'}
          onPress={() => {
            if (step < 3) {
              setError(null);
              setStep(step + 1);
            } else {
              publish();
            }
          }}
          disabled={!canNext}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaRow}>
      <Txt variant="meta" color={colors.inkSoft}>
        {label}
      </Txt>
      <Txt variant="small" color={colors.ink} style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Txt>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
    paddingBottom: 12,
    gap: 12,
  },
  title: {
    fontFamily: fonts.semi,
    fontSize: 24,
    lineHeight: 30,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingTop: 6 },
  progress: { flexDirection: 'row', gap: 8 },
  purposeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 3,
    padding: 12,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.claret,
  },
  photo: { width: '100%', height: 170, borderRadius: 3 },
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
    borderRadius: 3,
  },
  recognizing: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 3,
    padding: 10,
  },
  newBook: {
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: 3,
    padding: 14,
    backgroundColor: colors.paperSoft,
  },
  metaBox: {
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 10,
    gap: 8,
  },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  footer: {
    paddingHorizontal: 22,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.rule,
    backgroundColor: colors.paper,
  },
  doneMark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  doneTitle: {
    fontFamily: fonts.semi,
    fontSize: 26,
    lineHeight: 33,
    color: colors.ink,
    letterSpacing: -0.3,
  },
});
