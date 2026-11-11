import type { Book, Genre } from '@/data/types';

const API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

if (!API_KEY) {
  throw new Error(
    'Brakuje EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY. Uzupełnij .env.local.',
  );
}

const BASE_URL = 'https://www.googleapis.com/books/v1/volumes';

export type GoogleBook = {
  id: string;
  title: string;
  authors: string[];
  publisher?: string;
  publishedDate?: string;
  pageCount?: number;
  description?: string;
  categories?: string[];
  language?: string;
  imageLinks?: { smallThumbnail?: string; thumbnail?: string };
  averageRating?: number;
};

export async function searchGoogleBooks(
  query: string,
  maxResults = 20,
): Promise<GoogleBook[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: Math.min(maxResults, 40).toString(),
    // The app is Polish-only, so the catalogue never mixes languages. Results
    // are filtered by language again below, in case a volume is tagged loosely.
    langRestrict: 'pl',
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}?${params}`, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `Google Books API zwrócił błąd ${res.status}${text ? ': ' + text : ''}`,
    );
  }

  const data = await res.json();
  const items = data.items ?? [];

  const books: GoogleBook[] = items.map((item: any) => {
    const info = item.volumeInfo ?? {};
    return {
      id: item.id,
      title: info.title || 'Bez tytułu',
      authors: info.authors ?? [],
      publisher: info.publisher,
      publishedDate: info.publishedDate,
      pageCount: info.pageCount,
      description: info.description,
      categories: info.categories,
      language: info.language,
      imageLinks: info.imageLinks,
      averageRating: info.averageRating,
    };
  });

  return books.filter((book) => book.language === 'pl');
}

/* ------------------------------ book mapping ------------------------------ */

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

type GenreRule = { genre: Genre; words: string[]; hints?: string[] };

/**
 * Google Books categories arrive in Polish or English and often as a path
 * ("Fiction / Romance"). Rules are ordered from the most specific genre to the
 * broadest one, so "Fantastyka naukowa" wins over "Fantastyka", and
 * "True Crime" is a reportage rather than a thriller. `hints` is a smaller,
 * safer subset used when a volume has no categories and we fall back to its
 * description — words like "historia" are too ambiguous for prose.
 */
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
    hints: ['science fiction', 'sci-fi', 'fantastyka naukowa', 'space opera', 'cyberpunk'],
  },
  {
    genre: 'fantasy',
    words: ['fantasy', 'fantastyka', 'magia', 'magic', 'basnie', 'fairy tales'],
    hints: ['fantasy', 'fantastyka', 'magia'],
  },
  {
    genre: 'horror',
    words: ['horror', 'horrory', 'groza', 'gothic'],
    hints: ['horror', 'groza'],
  },
  {
    genre: 'YA',
    words: ['young adult', 'dla mlodziezy', 'mlodziez', 'juvenile'],
    hints: ['young adult', 'dla mlodziezy', 'mlodziez'],
  },
  {
    genre: 'romance',
    words: ['romance', 'romans', 'milos', 'milose', 'love story'],
    hints: ['romans', 'romance', 'milos'],
  },
  {
    genre: 'reportaż',
    words: ['reportaz', 'reportage', 'literatura faktu', 'true crime', 'dziennikarstwo'],
    hints: ['reportaz', 'reportage', 'literatura faktu'],
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
    ],
    hints: ['thriller', 'kryminal', 'sensacja', 'suspense'],
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
      'nauka',
      'science',
      'esej',
      'essays',
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
    hints: [
      'biografia',
      'autobiografia',
      'reportaz',
      'poradnik',
      'psychologia',
      'popular science',
      'non-fiction',
      'esej',
    ],
  },
  {
    genre: 'obyczajowa',
    words: ['obyczaj', 'spoleczn', 'social', 'saga', 'rodzin', 'family'],
    hints: ['obyczaj', 'saga rodzin'],
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
    ],
    hints: ['literatura piekna', 'poezja', 'dramat'],
  },
];

/** Lowercase and strip Polish diacritics so categories in either form match. */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/Ł/g, 'l')
    .toLowerCase();
}

function matchGenre(text: string | undefined, key: 'words' | 'hints'): Genre | null {
  if (!text) return null;
  const haystack = ` ${normalize(text)} `;
  for (const rule of GENRE_RULES) {
    const words = rule[key];
    if (words?.some((word) => haystack.includes(word))) return rule.genre;
  }
  return null;
}

function mapGoogleGenre(categories?: string[], description?: string): Genre {
  return (
    matchGenre(categories?.join(' / '), 'words') ??
    matchGenre(description, 'hints') ??
    'literatura piękna'
  );
}

function parseGoogleYear(publishedDate?: string): number {
  if (!publishedDate) return new Date().getFullYear();
  const match = publishedDate.match(/\d{4}/);
  return match ? Number(match[0]) : new Date().getFullYear();
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return hash;
}

/** Turns one Google Books result into the book shape the rest of the app uses. */
export function googleBookToBook(gb: GoogleBook): Book {
  return {
    id: gb.id,
    title: gb.title,
    author: gb.authors.join(', ') || 'autor nieznany',
    genre: mapGoogleGenre(gb.categories, gb.description),
    moods: [],
    year: parseGoogleYear(gb.publishedDate),
    publisher: gb.publisher || 'wydanie własne',
    pages: gb.pageCount || 0,
    description:
      gb.description?.slice(0, 300) || 'Książka znaleziona przez Google Books.',
    source: 'unverified',
    color: COVER_COLORS[Math.abs(hashString(gb.id)) % COVER_COLORS.length],
    // The search response tells us whether Google has artwork for this volume;
    // without it the cover component goes straight to Open Library.
    hasCover: !!gb.imageLinks,
  };
}
