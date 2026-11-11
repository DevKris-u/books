/**
 * Cover artwork resolution.
 *
 * Books picked from Google Books keep the volume id as their id, so the real
 * cover can be derived without storing anything extra. Local ids (books created
 * by a reader or imported from a list) have no artwork and fall back to the
 * drawn cover in `Cover`.
 */

const VOLUME_ID = /^[A-Za-z0-9_-]{10,14}$/;

const LOCAL_PREFIXES = ['user-', 'import:', 'book-'];

export function googleCoverUrl(bookId: string): string | null {
  if (!bookId || LOCAL_PREFIXES.some((prefix) => bookId.startsWith(prefix))) return null;
  if (!VOLUME_ID.test(bookId)) return null;
  return `https://books.google.com/books/content?id=${encodeURIComponent(bookId)}&printsec=frontcover&img=1&zoom=2&source=gbs_api`;
}

export function coverUriFor(book?: { id: string; coverUrl?: string } | null): string | null {
  if (!book) return null;
  return book.coverUrl || googleCoverUrl(book.id);
}
