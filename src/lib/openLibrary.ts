/**
 * Open Library artwork fallback.
 *
 * Google Books has no cover for many editions, especially older Polish ones.
 * Open Library's open API is asked only when the Google cover is missing or
 * fails to load, so the normal path costs no extra request. Lookups are cached
 * by title and author for the lifetime of the session.
 */

const SEARCH_URL = 'https://openlibrary.org/search.json';
const CACHE_LIMIT = 400;

const cache = new Map<string, Promise<string | null>>();

function coverUrl(coverId: number): string {
  // `default=false` makes a missing cover answer 404 instead of a blank image,
  // so the Cover component can fall through to the drawn cover.
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg?default=false`;
}

async function searchCover(title: string, author: string): Promise<string | null> {
  const params = new URLSearchParams({
    title,
    fields: 'title,author_name,cover_i',
    limit: '5',
  });

  // Open Library matches authors loosely and a list of co-authors makes the
  // query miss, so only the first one is sent.
  const firstAuthor = author.split(',')[0]?.trim();
  if (firstAuthor && firstAuthor !== 'autor nieznany') params.set('author', firstAuthor);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(`${SEARCH_URL}?${params}`, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    const docs: { cover_i?: number }[] = data.docs ?? [];
    const withCover = docs.find((doc) => typeof doc.cover_i === 'number' && doc.cover_i > 0);
    return withCover?.cover_i ? coverUrl(withCover.cover_i) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function findOpenLibraryCover(input: {
  title: string;
  author: string;
}): Promise<string | null> {
  const title = input.title.trim();
  const author = input.author.trim();
  const key = `${title.toLowerCase()}|${author.toLowerCase()}`;

  const cached = cache.get(key);
  if (cached) return cached;

  const request = searchCover(title, author);
  cache.set(key, request);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return request;
}
