/**
 * Cover artwork resolution.
 *
 * Covers come from Google Books and Open Library, always by ISBN. Books saved
 * before the switch to the National Library catalogue still carry a Google
 * volume id, so that id remains a last resort for them.
 */

const VOLUME_ID = /^[A-Za-z0-9_-]{10,14}$/;
const LOCAL_PREFIXES = ['user-', 'import:', 'book-', 'bn:'];

export function normalizeIsbn(value?: string): string | null {
  if (!value) return null;
  const digits = value.replace(/[^0-9Xx]/g, '').toUpperCase();
  return digits.length === 10 || digits.length === 13 ? digits : null;
}

export function googleCoverUrl(bookId: string): string | null {
  if (!bookId || LOCAL_PREFIXES.some((prefix) => bookId.startsWith(prefix))) return null;
  if (!VOLUME_ID.test(bookId)) return null;
  return `https://books.google.com/books/content?id=${encodeURIComponent(bookId)}&printsec=frontcover&img=1&zoom=2&source=gbs_api`;
}

export function googleCoverByIsbn(isbn: string): string | null {
  const clean = normalizeIsbn(isbn);
  if (!clean) return null;
  return `https://books.google.com/books?vid=ISBN${clean}&printsec=frontcover&img=1&zoom=2`;
}

export function openLibraryCoverByIsbn(isbn: string): string | null {
  const clean = normalizeIsbn(isbn);
  if (!clean) return null;
  return `https://covers.openlibrary.org/b/isbn/${clean}-L.jpg?default=false`;
}

/** Primary artwork plus the fallback to try when it does not load. */
export function coverCandidates(book?: {
  id: string;
  isbn?: string;
  coverUrl?: string;
} | null): { primary: string | null; fallback: string | null } {
  if (!book) return { primary: null, fallback: null };
  const isbn = normalizeIsbn(book.isbn);
  return {
    primary: book.coverUrl || (isbn ? googleCoverByIsbn(isbn) : googleCoverUrl(book.id)),
    fallback: isbn ? openLibraryCoverByIsbn(isbn) : null,
  };
}
