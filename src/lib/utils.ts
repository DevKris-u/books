import { Book } from '@/data/types';
import { shops } from '@/data/seed';

/** Mock pricing per partner, deterministic per title. */
export function offersFor(book: Book) {
  const drift = (book.title.length % 7) - 3;
  return shops.map((shop) => ({
    ...shop,
    price: Math.round((shop.price + drift) * 100) / 100,
  }));
}

/** Deep link to the partner shop with our affiliate parameters. */
export function shopUrl(shopId: string, book: Book, placement: string) {
  const q = `q=${encodeURIComponent(`${book.title} ${book.author}`)}`;
  const affiliate = `utm_source=margines&utm_medium=afiliacja&utm_campaign=${placement}`;
  const base =
    shopId === 'legimi'
      ? 'https://www.legimi.pl/szukaj/'
      : shopId === 'sk'
        ? 'https://www.swiatksiazki.pl/szukaj'
        : 'https://www.empik.com/szukaj/produkt';
  return `${base}?${q}&${affiliate}`;
}

export function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

export function timeAgo(ts: number) {
  const minutes = Math.max(1, Math.round((Date.now() - ts) / 60000));
  if (minutes < 60) return `${minutes} min temu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} godz. temu`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'wczoraj' : `${days} dni temu`;
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[\s\u00a0]+/g, ' ')
    .replace(/[„”"'’.,;:!?…—–-]/g, '')
    .trim();
}

export function formatDate(iso: string) {
  // Dates are stored as plain YYYY-MM-DD; build them in local time so they do
  // not drift a day in timezones behind UTC.
  const [year, month, day] = iso.split('-').map(Number);
  const date =
    year && month && day ? new Date(year, month - 1, day) : new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
