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
  year: number;
  publisher: string;
  pages: number;
  description: string;
  source: string;
  color: string;
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

function toGenre(value: string): Genre {
  return GENRE_SET.has(value) ? (value as Genre) : 'literatura piękna';
}

function toSource(value: string): Source {
  return SOURCE_SET.has(value) ? (value as Source) : 'unverified';
}

function toBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    genre: toGenre(row.genre),
    moods: (row.moods ?? []).filter((m): m is Mood => MOOD_SET.has(m)),
    year: row.year,
    publisher: row.publisher,
    pages: row.pages,
    description: row.description,
    source: toSource(row.source),
    color: row.color,
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

export type Catalog = { books: Book[]; fragments: Fragment[] };

export async function fetchCatalog(
  deviceKey: string | null,
  userId: string | null = null,
): Promise<Catalog> {
  const [booksResult, fragmentsResult] = await Promise.all([
    supabase.from('books').select('*').order('title', { ascending: true }),
    supabase.from('fragments').select('*').order('created_at', { ascending: false }),
  ]);

  if (booksResult.error) fail('Nie udało się pobrać książek', booksResult.error);
  if (fragmentsResult.error) fail('Nie udało się pobrać fragmentów', fragmentsResult.error);

  const books = ((booksResult.data ?? []) as BookRow[]).map(toBook);
  const known = new Set(books.map((b) => b.id));
  const fragments = ((fragmentsResult.data ?? []) as FragmentRow[])
    .filter((row) => known.has(row.book_id))
    .map((row) => toFragment(row, deviceKey, userId));

  return { books, fragments };
}

/* --------------------------------- writes --------------------------------- */

export async function publishBook(book: Book): Promise<Book> {
  const { error } = await supabase.from('books').insert({
    id: book.id,
    title: book.title,
    author: book.author,
    genre: book.genre,
    moods: book.moods,
    year: book.year,
    publisher: book.publisher,
    pages: book.pages,
    description: book.description,
    source: book.source,
    color: book.color,
  });
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

  if (error) fail('Nie udało się opublikować fragmentu', error);
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
