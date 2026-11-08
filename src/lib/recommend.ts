import { Book, EmotionTag, Fragment } from '@/data/types';
import { State } from '@/state/store';

export type Candidate = Fragment & { book: Book };

const HOUR = 60 * 60 * 1000;

/** Fragments the feed may show: not seen, not reported, book not excluded. */
export function eligible(state: State, opts: { includeOwn?: boolean } = {}): Candidate[] {
  const readBooks = new Set(
    state.library.filter((i) => i.shelf === 'read').map((i) => i.bookId),
  );
  return state.fragments
    .map((fragment) => {
      const book = state.books.find((b) => b.id === fragment.bookId);
      return book ? { ...fragment, book } : null;
    })
    .filter((f): f is Candidate => {
      if (!f) return false;
      if (state.seen[f.id]) return false;
      if (state.reported.includes(f.id)) return false;
      if (f.book.source === 'excluded') return false;
      if (state.hiddenAuthors.includes(f.book.author)) return false;
      if (readBooks.has(f.bookId)) return false;
      if (!opts.includeOwn && f.mine) return false;
      return true;
    });
}

export function scoreFragment(state: State, candidate: Candidate): number {
  const { book } = candidate;
  const genre = state.signals.genres[book.genre] ?? 0;
  const tagAvg =
    candidate.tags.reduce((sum, tag) => sum + (state.signals.tags[tag] ?? 0), 0) /
    Math.max(1, candidate.tags.length);
  const author = state.signals.authors[book.author] ?? 0;
  const bookWeight = state.signals.books[book.id] ?? 0;

  let score =
    genre * 1.9 + tagAvg * 1.25 + author * 0.7 + bookWeight * 1.1;

  if (state.prefs.genres.includes(book.genre)) score += 1.3;
  const moodHits = book.moods.filter((mood) => state.prefs.moods.includes(mood)).length;
  score += moodHits * 0.9;

  const hoursOld = (Date.now() - candidate.createdAt) / HOUR;
  if (hoursOld < 24) score += 1.8 * (1 - hoursOld / 24);

  if (book.source === 'licensed') score += 0.7;
  else if (book.source === 'public') score += 0.5;

  score += Math.log10(1 + candidate.likes) * 0.35;
  return score;
}

type QueueOptions = {
  focus?: { bookId?: string; tag?: EmotionTag };
  limit?: number;
};

/**
 * Builds one swipe session. Constraint order matters:
 * no back-to-back book, no more than six of one genre in a row, one author
 * per ten cards, then a softmax pick among the strongest remaining scores so
 * the deck never feels like a single sorted list.
 */
export function buildQueue(state: State, opts: QueueOptions = {}): Candidate[] {
  let pool = eligible(state);

  if (opts.focus?.bookId) {
    pool = pool.filter((f) => f.bookId === opts.focus!.bookId);
  }
  if (opts.focus?.tag) {
    pool = pool.filter((f) => f.tags.includes(opts.focus!.tag!));
  }

  const scored = pool
    .map((f) => ({ f, score: scoreFragment(state, f) }))
    .sort((a, b) => b.score - a.score);

  const remaining = [...scored];
  const out: Candidate[] = [];
  let lastBookId: string | null = null;
  let run: { genre: string | null; count: number } = { genre: null, count: 0 };

  while (remaining.length) {
    let pickable = remaining.filter(({ f }) => f.bookId !== lastBookId);
    if (!pickable.length) pickable = remaining;

    if (run.count >= 6) {
      const other = pickable.filter(({ f }) => f.book.genre !== run.genre);
      if (other.length) pickable = other;
    }

    const recentAuthors = out.slice(-9).map((c) => c.book.author);
    const authorFresh = pickable.filter(({ f }) => !recentAuthors.includes(f.book.author));
    if (authorFresh.length) pickable = authorFresh;

    const top = pickable.slice(0, 7);
    const min = Math.min(...top.map((s) => s.score));
    const weights = top.map((s) => Math.exp((s.score - min) / 2.2));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = Math.random() * total;
    let chosenIndex = 0;
    for (let i = 0; i < weights.length; i += 1) {
      roll -= weights[i];
      if (roll <= 0) {
        chosenIndex = i;
        break;
      }
    }

    const chosen = top[chosenIndex];
    out.push(chosen.f);
    remaining.splice(remaining.indexOf(chosen), 1);

    lastBookId = chosen.f.bookId;
    if (run.genre === chosen.f.book.genre) run = { ...run, count: run.count + 1 };
    else run = { genre: chosen.f.book.genre, count: 1 };
  }

  if (opts.limit) return out.slice(0, opts.limit);
  return out;
}

export function pickHotPeak(state: State): Candidate | null {
  const pool = eligible(state)
    .filter((f) => f.book.source === 'licensed' || f.book.source === 'public')
    .filter((f) => !state.wantToRead.includes(f.bookId))
    .filter(
      (f) => !state.library.some((i) => i.bookId === f.bookId && i.shelf === 'read'),
    );

  if (!pool.length) return null;

  return pool
    .map((f) => {
      const sourceBonus = f.book.source === 'licensed' ? 1.5 : 0.6;
      return { f, score: scoreFragment(state, f) + sourceBonus };
    })
    .sort((a, b) => b.score - a.score)[0].f;
}

/** Human-readable reasons, used only on the Hot Peak screen. */
export function hotPeakReasons(state: State, candidate: Candidate): string[] {
  const reasons: string[] = [];
  const genreName = candidate.book.genre;
  const genreWeight = state.signals.genres[genreName] ?? 0;

  if (genreWeight >= 2) reasons.push(`najczęściej zatrzymujesz się przy ${genreName}`);
  else if (state.prefs.genres.includes(candidate.book.genre))
    reasons.push(`${genreName} jest w Twoich preferencjach`);

  const mood = candidate.book.moods.find((m) => state.prefs.moods.includes(m));
  if (mood) {
    const labels: Record<string, string> = {
      wzruszenie: 'chcesz się wzruszyć',
      strach: 'chcesz się bać',
      śmiech: 'chcesz się śmiać',
      myślenie: 'chcesz myśleć',
      ucieczka: 'chcesz uciec od rzeczywistości',
      zakochanie: 'chcesz się zakochać',
      napięcie: 'szukasz napięcia',
      spokój: 'chcesz spokoju',
    };
    reasons.push(labels[mood] ?? mood);
  }

  const tag = candidate.tags.find((t) => (state.signals.tags[t] ?? 0) > 1);
  if (tag) reasons.push(`tag „${tag}” czyta się u Ciebie najlepiej`);

  if (candidate.book.source === 'public') reasons.push('klasyka w domenie publicznej');
  else reasons.push('źródło licencjonowane przez wydawcę');

  return reasons.slice(0, 3);
}
