import {
  Book,
  EMOTION_TAGS,
  EmotionTag,
  Fragment,
  GENRES,
  Genre,
  MOODS,
  Mood,
  PURPOSES,
  Purpose,
  Source,
} from '@/data/types';
import { supabase } from './supabase';

/* ---------------------------------- rows ---------------------------------- */

type BookRow = {
  id: string;
  title: string;
  author: string;
  genre: string;
  moods: string[];
  year: string | number | null;
  publisher: string;
  pages: string | number | null;
  description: string;
  source: string;
  color: string;
  cover_link: string | null;
};

type FragmentRow = {
  id: string;
  book_id: string;
  text: string;
  reaction: string;
  tags: string[];
  page: number | null;
  purpose: string;
  curator_name: string;
  curator_handle: string;
  author_key: string | null;
  author_id: string | null;
  likes: number;
  image_uri: string | null;
  created_at: string;
};

type ProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  created_at: string | null;
};

export type AuthProfile = {
  id: string;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  joinedAt: string;
};

const GENRE_SET = new Set<string>(GENRES.map((g) => g.value));
const MOOD_SET = new Set<string>(MOODS.map((m) => m.value));
const TAG_SET = new Set<string>(EMOTION_TAGS);
const PURPOSE_SET = new Set<string>(PURPOSES.map((p) => p.value));
const SOURCE_SET = new Set<string>(['licensed', 'public', 'unverified', 'excluded']);

/**
 * The catalogue stores two genres as slugs (`reportaz`, `literatura_piekna`),
 * so they need mapping in both directions.
 */
const GENRE_FROM_SLUG: Record<string, Genre> = {
  reportaz: 'reportaż',
  literatura_piekna: 'literatura piękna',
};

const GENRE_TO_SLUG: Partial<Record<Genre, string>> = {
  reportaż: 'reportaz',
  'literatura piękna': 'literatura_piekna',
};

function toGenre(value: string): Genre {
  const genre = GENRE_FROM_SLUG[value] ?? value;
  return GENRE_SET.has(genre) ? (genre as Genre) : 'literatura piękna';
}

/** Genre as stored in Postgres, used by filters and writes. */
function toGenreSlug(genre: Genre): string {
  return GENRE_TO_SLUG[genre] ?? genre;
}

function toSource(value: string): Source {
  return SOURCE_SET.has(value) ? (value as Source) : 'unverified';
}

/** `books.pages` and `books.year` are text columns, so they arrive as strings. */
function toNumber(value: string | number | null | undefined): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: toGenre(row.genre),
    moods: (row.moods ?? []).filter((m): m is Mood => MOOD_SET.has(m)),
    year: toNumber(row.year),
    publisher: row.publisher,
    pages: toNumber(row.pages),
    description: row.description,
    source: toSource(row.source),
    color: row.color,
    coverUrl: row.cover_link?.trim() || undefined,
  };
}

function toFragment(
  row: FragmentRow,
  deviceKey: string | null,
  userId: string | null,
): Fragment {
  return {
    id: row.id,
    bookId: row.book_id,
    text: row.text,
    reaction: row.reaction,
    tags: (row.tags ?? []).filter((t): t is EmotionTag => TAG_SET.has(t)),
    page: row.page ?? undefined,
    purpose: PURPOSE_SET.has(row.purpose) ? (row.purpose as Purpose) : 'analiza',
    curator: { name: row.curator_name, handle: row.curator_handle },
    createdAt: new Date(row.created_at).getTime(),
    likes: row.likes,
    imageUri: row.image_uri ?? undefined,
    mine: userId ? row.author_id === userId : !!deviceKey && row.author_key === deviceKey,
  };
}

function toProfile(row: ProfileRow): AuthProfile {
  return {
    id: row.id,
    displayName: (row.display_name ?? '').trim() || (row.handle ?? 'czytelnik'),
    handle: row.handle ?? 'czytelnik',
    avatarUrl: row.avatar_url,
    joinedAt: row.created_at ? row.created_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  };
}

function fail(context: string, error: { message: string } | null): never {
  throw new Error(`${context}: ${error?.message ?? 'nieznany błąd'}`);
}

/* -------------------------------- catalog --------------------------------- */

/** Only the columns the app renders, so a search result stays small. */
const BOOK_COLUMNS =
  'id,title,author,genre,moods,year,publisher,pages,description,source,color,cover_link';

const BOOKS_PAGE = 200;

export type Catalog = { books: Book[]; fragments: Fragment[] };

/** Loads specific books by id, in chunks small enough for a GET query. */
export async function fetchBooksByIds(ids: string[]): Promise<Book[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  const books: Book[] = [];

  for (let index = 0; index < unique.length; index += BOOKS_PAGE) {
    const chunk = unique.slice(index, index + BOOKS_PAGE);
    const { data, error } = await supabase.from('books').select(BOOK_COLUMNS).in('id', chunk);
    if (error) fail('Nie udało się pobrać książek', error);
    books.push(...((data ?? []) as BookRow[]).map(toBook));
  }

  return books;
}

export async function fetchBookById(id: string): Promise<Book | null> {
  const { data, error } = await supabase
    .from('books')
    .select(BOOK_COLUMNS)
    .eq('id', id)
    .maybeSingle();

  if (error) fail('Nie udało się pobrać książki', error);
  return data ? toBook(data as BookRow) : null;
}

export type BookSearchOptions = {
  limit?: number;
  genre?: Genre | null;
  mood?: Mood | null;
};

/**
 * Catalogue search runs in Postgres. The table holds thousands of books, so
 * downloading it whole would be wasteful and PostgREST would cut it at 1000
 * rows anyway. Title and author are matched case-insensitively.
 */
export async function searchBooks(
  query: string,
  options: BookSearchOptions = {},
): Promise<Book[]> {
  const { limit = 20, genre = null, mood = null } = options;
  // Commas, parentheses and quotes would break PostgREST's `or(...)` syntax.
  const term = query.trim().replace(/[,()*%\\"]+/g, ' ').trim();

  let request = supabase
    .from('books')
    .select(BOOK_COLUMNS)
    .order('title', { ascending: true })
    .limit(limit);

  if (term) {
    request = request.or(
      `title.ilike.%${term}%,author.ilike.%${term}%,publisher.ilike.%${term}%`,
    );
  }
  if (genre) request = request.eq('genre', toGenreSlug(genre));
  if (mood) request = request.contains('moods', [mood]);

  const { data, error } = await request;
  if (error) fail('Nie udało się wyszukać książek', error);
  return ((data ?? []) as BookRow[]).map(toBook);
}

/**
 * The feed only needs the books its fragments point at, plus whatever the
 * reader keeps in their library (`extraBookIds`). Everything else is fetched
 * on demand by the search screens.
 */
export async function fetchCatalog(
  deviceKey: string | null,
  userId: string | null = null,
  extraBookIds: string[] = [],
): Promise<Catalog> {
  const fragmentsResult = await supabase
    .from('fragments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1000);

  if (fragmentsResult.error) fail('Nie udało się pobrać fragmentów', fragmentsResult.error);

  const fragmentRows = (fragmentsResult.data ?? []) as FragmentRow[];
  const bookIds = [...fragmentRows.map((row) => row.book_id), ...extraBookIds];
  const books = await fetchBooksByIds(bookIds);
  const known = new Set(books.map((b) => b.id));
  const fragments = fragmentRows
    .filter((row) => known.has(row.book_id))
    .map((row) => toFragment(row, deviceKey, userId));

  return { books, fragments };
}

/* --------------------------------- writes --------------------------------- */

/**
 * Writes a book to the catalogue. Idempotent: an existing id is left untouched
 * instead of failing on the primary key, so it can be used to make sure a book
 * is present before a fragment references it.
 */
export async function publishBook(book: Book): Promise<Book> {
  const { error } = await supabase.from('books').upsert(
    {
      id: book.id,
      title: book.title,
      author: book.author,
      genre: toGenreSlug(book.genre),
      moods: book.moods,
      year: book.year ? String(book.year) : null,
      publisher: book.publisher,
      pages: book.pages ? String(book.pages) : null,
      description: book.description,
      source: book.source,
      color: book.color,
      cover_link: book.coverUrl ?? null,
    },
    { onConflict: 'id', ignoreDuplicates: true },
  );
  if (error) fail('Nie udało się dodać książki', error);
  return book;
}

export type NewFragment = {
  bookId: string;
  text: string;
  reaction: string;
  tags: EmotionTag[];
  page?: number;
  purpose: Purpose;
  curator: { name: string; handle: string };
  imageUri?: string;
};

export async function publishFragment(
  input: NewFragment,
  identity: { deviceKey: string | null; userId: string | null },
): Promise<Fragment> {
  const { deviceKey, userId } = identity;
  const { data, error } = await supabase
    .from('fragments')
    .insert({
      book_id: input.bookId,
      text: input.text,
      reaction: input.reaction,
      tags: input.tags,
      page: input.page ?? null,
      purpose: input.purpose,
      curator_name: input.curator.name,
      curator_handle: input.curator.handle,
      author_key: userId ? null : deviceKey,
      author_id: userId,
      image_uri: input.imageUri ?? null,
    })
    .select('*')
    .single();

  if (error) {
    // 23503: fragments.book_id points at a book that is not in the catalogue.
    if (error.code === '23503') {
      throw new Error('Nie mamy tej książki w bazie. Dodaj ją ponownie i spróbuj jeszcze raz.');
    }
    // 23505: the same fragment is already stored.
    if (error.code === '23505') {
      throw new Error('Ten fragment już jest w bazie. Wybierz inny fragment z tej książki.');
    }
    fail('Nie udało się opublikować fragmentu', error);
  }
  return toFragment(data as FragmentRow, deviceKey, userId);
}

/* -------------------------------- profiles -------------------------------- */

export async function fetchProfile(userId: string): Promise<AuthProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) fail('Nie udało się pobrać profilu', error);
  return data ? toProfile(data as ProfileRow) : null;
}

export async function insertProfile(input: {
  id: string;
  email: string | null;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
}): Promise<AuthProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .insert({
      id: input.id,
      email: input.email,
      display_name: input.displayName,
      handle: input.handle,
      avatar_url: input.avatarUrl,
    })
    .select('*')
    .single();

  if (error) throw error;
  return toProfile(data as ProfileRow);
}

export async function updateMyProfile(
  userId: string,
  input: { displayName: string; handle: string },
): Promise<AuthProfile> {
  const { data, error } = await supabase
    .from('profiles')
    .update({ display_name: input.displayName, handle: input.handle })
    .eq('id', userId)
    .select('*')
    .single();

  if (error) throw error;
  return toProfile(data as ProfileRow);
}

export async function deleteMyAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_my_account');
  if (error) fail('Nie udało się usunąć konta', error);
}
