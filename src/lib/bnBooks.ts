import type { Book, Genre } from '@/data/types';

/**
 * Catalogue search in the National Library of Poland (data.bn.org.pl).
 *
 * The API exposes MARC records; the flattened fields it returns are cleaned
 * where they are good enough (title, ISBN) and read from MARC where they are
 * not (authors, publisher, page count). Descriptions are not part of the
 * response and are hydrated by ISBN from Google Books / Open Library.
 */

const API_URL = 'https://data.bn.org.pl/api/bibs.json';
const REQUEST_TIMEOUT = 8000;

type MarcSubfield = Record<string, string>;
type MarcField = Record<string, { subfields?: MarcSubfield[] }>;

type BnRecord = {
  id: number;
  title?: string;
  author?: string;
  publisher?: string;
  isbnIssn?: string;
  language?: string;
  genre?: string;
  subject?: string;
  domain?: string;
  formOfWork?: string;
  audienceGroup?: string;
  demographicGroup?: string;
  publicationYear?: string;
  marc?: { fields?: MarcField[] };
};

/** Palette for drawn fallback covers, shared by every place that adds a book. */
export const COVER_COLORS = [
  '#5B2A2E',
  '#1F3B34',
  '#2A3550',
  '#4A3B26',
  '#3E2F44',
  '#6B3A22',
  '#243C46',
];

/* -------------------------------- mapping -------------------------------- */

function fieldsFor(record: BnRecord, tag: string): MarcSubfield[][] {
  const fields = record.marc?.fields ?? [];
  const out: MarcSubfield[][] = [];
  for (const field of fields) {
    for (const [key, value] of Object.entries(field)) {
      if (key === tag && value?.subfields?.length) out.push(value.subfields);
    }
  }
  return out;
}

function subfield(subfields: MarcSubfield[] | undefined, code: string): string | undefined {
  return subfields?.find((entry) => entry[code] !== undefined)?.[code];
}

/** "Prus, Bolesław" → "Bolesław Prus", dates and punctuation removed. */
function formatAuthor(raw: string): string {
  const name = raw
    .replace(/\.\s*$/, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const [last, ...rest] = name.split(',');
  const firstName = rest.join(',').trim();
  return firstName ? `${firstName} ${last.trim()}` : name;
}

function authorsOf(record: BnRecord): string[] {
  const names: string[] = [];
  for (const tag of ['100', '700', '110', '710', '111', '711']) {
    for (const field of fieldsFor(record, tag)) {
      // 710/4 = pbl is the publisher, not an author.
      if (subfield(field, '4') === 'pbl') continue;
      const name = subfield(field, 'a');
      if (name) names.push(formatAuthor(name));
    }
  }
  if (names.length) return [...new Set(names)];

  const fallback = (record.author ?? '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return fallback ? [fallback] : [];
}

function titleOf(record: BnRecord): string {
  const main = fieldsFor(record, '245')[0];
  const title = [subfield(main, 'a'), subfield(main, 'b')].filter(Boolean).join(' : ');
  return (title || record.title || 'Bez tytułu')
    .replace(/\s*\/\s*$/, '')
    .replace(/\s*[,:;]\s*$/, '')
    .trim();
}

function publisherOf(record: BnRecord): string {
  const imprint = fieldsFor(record, '260')[0] ?? fieldsFor(record, '264')[0];
  const raw = subfield(imprint, 'b') ?? record.publisher ?? '';
  return raw.replace(/\s*[,;:/]+\s*$/, '').trim() || 'wydanie własne';
}

function yearOf(record: BnRecord): number {
  const fromField = Number((record.publicationYear ?? '').match(/\d{4}/)?.[0]);
  if (fromField > 0) return fromField;
  const imprint = fieldsFor(record, '260')[0] ?? fieldsFor(record, '264')[0];
  const match = subfield(imprint, 'c')?.match(/\d{4}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}

/** The physical description holds several numbers ("2 t. w 1 wol. (615 s.)");
 *  the page count is the largest of them. */
function pagesOf(record: BnRecord): number {
  const raw = subfield(fieldsFor(record, '300')[0], 'a');
  if (!raw) return 0;
  const numbers = raw.match(/\d+/g)?.map(Number) ?? [];
  return numbers.length ? Math.max(...numbers) : 0;
}

function isbnOf(record: BnRecord): string | undefined {
  const candidates = (record.isbnIssn ?? '')
    .split(/[\s,;]+/)
    .map((value) => value.replace(/[^0-9Xx]/g, '').toUpperCase())
    .filter((value) => value.length === 10 || value.length === 13);
  return candidates.find((value) => value.length === 13) ?? candidates[0];
}

/* --------------------------------- genre --------------------------------- */

type GenreRule = { genre: Genre; words: string[] };

/** Ordered from the most specific genre to the broadest one. */
const GENRE_RULES: GenreRule[] = [
  {
    genre: 'sci-fi',
    words: [
      'science fiction',
      'sci-fi',
      'scifi',
      'fantastyka naukowa',
      'space opera',
      'dystopia',
      'cyberpunk',
    ],
  },
  {
    genre: 'fantasy',
    words: ['fantasy', 'fantastyka', 'fantasy i baśnie', 'basnie', 'fairy tales'],
  },
  { genre: 'horror', words: ['horror', 'horrory', 'groza', 'gothic'] },
  { genre: 'YA', words: ['young adult', 'dla mlodziezy', 'mlodziez', 'juvenile'] },
  { genre: 'romance', words: ['romance', 'romans', 'milos', 'milose', 'love story'] },
  {
    genre: 'reportaż',
    words: ['reportaz', 'reportage', 'literatura faktu', 'true crime', 'dziennikarstwo'],
  },
  {
    genre: 'thriller',
    words: [
      'thriller',
      'kryminal',
      'crime',
      'mystery',
      'detektyw',
      'sledczy',
      'sensacja',
      'suspense',
      'szpiegowsk',
    ],
  },
  {
    genre: 'non-fiction',
    words: [
      'non-fiction',
      'nonfiction',
      'biografia',
      'biography',
      'autobiografia',
      'autobiography',
      'historia',
      'history',
      'poradnik',
      'self-help',
      'psychologia',
      'psychology',
      'biznes',
      'business',
      'popular science',
      'popularnonauk',
      'nauka',
      'nauki',
      'science',
      'esej',
      'essays',
      'publicystyka',
      'filozofia',
      'philosophy',
      'socjologia',
      'sociology',
      'zdrowie',
      'health',
      'kuchnia',
      'cooking',
      'podroz',
      'travel',
    ],
  },
  {
    genre: 'obyczajowa',
    words: ['obyczaj', 'spoleczn', 'social', 'saga', 'rodzin', 'family'],
  },
  {
    genre: 'literatura piękna',
    words: [
      'literatura piekna',
      'literary',
      'poezja',
      'poetry',
      'dramat',
      'drama',
      'klasyka',
      'classics',
      'fiction',
      'literature',
      'proza',
      'powiesc',
      'opowiadania',
      'nowele',
    ],
  },
];

/** Lowercase and strip Polish diacritics so either spelling matches. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase();
}

function mapGenre(record: BnRecord): Genre {
  const text = normalize(
    [
      record.genre,
      record.subject,
      record.domain,
      record.formOfWork,
      record.audienceGroup,
      record.demographicGroup,
    ]
      .filter(Boolean)
      .join(' / '),
  );
  for (const rule of GENRE_RULES) {
    if (rule.words.some((word) => text.includes(word))) return rule.genre;
  }
  return 'literatura piękna';
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/* -------------------------------- searching ------------------------------- */

function toBook(record: BnRecord): Book {
  const isbn = isbnOf(record);
  return {
    id: `bn:${record.id}`,
    title: titleOf(record),
    author: authorsOf(record).join(', ') || 'autor nieznany',
    genre: mapGenre(record),
    moods: [],
    year: yearOf(record),
    publisher: publisherOf(record),
    pages: pagesOf(record),
    // Filled in by ISBN from Google Books / Open Library once the book is used.
    description: '',
    source: 'unverified',
    color: COVER_COLORS[Math.abs(hashString(String(record.id))) % COVER_COLORS.length],
    isbn,
  };
}

async function requestBibs(
  params: Record<string, string>,
  signal: AbortSignal,
): Promise<BnRecord[]> {
  const search = new URLSearchParams({ limit: '20', kind: 'książka', ...params });
  const res = await fetch(`${API_URL}?${search}`, {
    headers: { Accept: 'application/json' },
    signal,
  });
  if (!res.ok) {
    throw new Error(`Biblioteka Narodowa zwróciła błąd ${res.status}`);
  }
  const data = await res.json();
  return (data.bibs ?? []) as BnRecord[];
}

/**
 * Searches BN by title and by author (or by ISBN when the phrase looks like
 * one) and merges both result sets. Records in other languages are dropped:
 * the catalogue is Polish-only.
 */
export async function searchBnBooks(query: string, maxResults = 20): Promise<Book[]> {
  const term = query.trim();
  if (!term) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const digits = term.replace(/[^0-9Xx]/g, '');
    const isIsbn = digits.length === 10 || digits.length === 13;
    const groups = await Promise.all([
      requestBibs({ title: term }, controller.signal),
      requestBibs(isIsbn ? { isbnIssn: digits } : { author: term }, controller.signal),
    ]);

    const seen = new Set<string>();
    const books: Book[] = [];
    for (const record of groups.flat()) {
      if (record.language && record.language !== 'polski') continue;
      const book = toBook(record);
      if (!book.title || seen.has(book.id)) continue;
      seen.add(book.id);
      books.push(book);
      if (books.length === maxResults) break;
    }
    return books;
  } catch (caught) {
    if (caught instanceof Error && caught.name === 'AbortError') {
      throw new Error('Biblioteka Narodowa nie odpowiedziała na czas. Spróbuj ponownie.');
    }
    throw caught;
  } finally {
    clearTimeout(timeout);
  }
}
