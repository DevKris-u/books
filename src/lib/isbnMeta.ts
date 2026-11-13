/**
 * Book descriptions by ISBN.
 *
 * The National Library catalogue carries no annotations, so descriptions come
 * from Google Books first and Open Library second. Both are keyed strictly by
 * ISBN; results are cached for the session.
 */

const CACHE_LIMIT = 200;
const REQUEST_TIMEOUT = 8000;
const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_BOOKS_API_KEY;

const cache = new Map<string, Promise<string | null>>();

function cleanIsbn(isbn: string): string | null {
  const digits = isbn.replace(/[^0-9Xx]/g, '').toUpperCase();
  return digits.length === 10 || digits.length === 13 ? digits : null;
}

function descriptionText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (value && typeof value === 'object') {
    const nested = (value as { value?: unknown }).value;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }
  return null;
}

async function getJson(url: string): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') ?? '';
    // Open Library answers a missing edition with an HTML page, not JSON.
    if (!type.includes('json')) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function googleDescription(isbn: string): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;
  const params = new URLSearchParams({ q: `isbn:${isbn}`, key: GOOGLE_API_KEY });
  const data = (await getJson(`https://www.googleapis.com/books/v1/volumes?${params}`)) as {
    items?: { volumeInfo?: { description?: unknown } }[];
  } | null;
  return descriptionText(data?.items?.[0]?.volumeInfo?.description);
}

async function openLibraryDescription(isbn: string): Promise<string | null> {
  const edition = (await getJson(`https://openlibrary.org/isbn/${isbn}.json`)) as {
    description?: unknown;
    works?: { key?: string }[];
  } | null;
  const own = descriptionText(edition?.description);
  if (own) return own;

  const workKey = edition?.works?.[0]?.key;
  if (!workKey) return null;
  const work = (await getJson(`https://openlibrary.org${workKey}.json`)) as {
    description?: unknown;
  } | null;
  return descriptionText(work?.description);
}

export function fetchIsbnDescription(isbn: string): Promise<string | null> {
  const clean = cleanIsbn(isbn);
  if (!clean) return Promise.resolve(null);

  const cached = cache.get(clean);
  if (cached) return cached;

  const request = (async () => {
    const google = await googleDescription(clean);
    if (google) return google;
    return openLibraryDescription(clean);
  })();

  cache.set(clean, request);
  if (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  return request;
}
