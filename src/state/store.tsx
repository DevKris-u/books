import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { seedBooks, seedFragments } from '@/data/seed';
import {
  Book,
  EmotionTag,
  Fragment,
  Genre,
  LibraryItem,
  Mood,
  Shelf,
} from '@/data/types';

const STORAGE_KEY = 'margines:state:v1';
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => todayKey(new Date(Date.now() - n * DAY));

export type NotificationKey =
  | 'hotPeak'
  | 'likes'
  | 'readingGoal'
  | 'newFragments'
  | 'streak';

export type HotUse = { ts: number; kind: 'free' | 'pro' };

type Signals = {
  genres: Record<string, number>;
  tags: Record<string, number>;
  authors: Record<string, number>;
  books: Record<string, number>;
  likes: number;
  passes: number;
};

export type Prefs = {
  genres: Genre[];
  moods: Mood[];
  dailyGoal: number | null;
  dailyGoalUnit: 'pages' | 'minutes';
  importedTitles: string[];
};

export type State = {
  hydrated: boolean;
  onboarded: boolean;
  profile: { name: string; handle: string; joinedAt: string };
  prefs: Prefs;
  signals: Signals;
  seen: Record<string, 'like' | 'pass'>;
  lastAction: { fragmentId: string; dir: 'like' | 'pass'; dwellMs: number } | null;
  library: LibraryItem[];
  books: Book[];
  fragments: Fragment[];
  posts: Fragment[];
  hiddenAuthors: string[];
  reported: string[];
  activityDays: string[];
  pro: boolean;
  hotUses: HotUse[];
  adsWatched: number[];
  adsWatchedTotal: number;
  notifications: Record<NotificationKey, boolean>;
  wantToRead: string[];
  purchases: number;
};

export const todayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const hourKey = (d = new Date()) => d.toISOString().slice(0, 13);


const initialSignals: Signals = {
  genres: {},
  tags: {},
  authors: {},
  books: {},
  likes: 0,
  passes: 0,
};

const initialState: State = {
  hydrated: false,
  onboarded: false,
  profile: { name: 'Ola', handle: 'ola.czyta', joinedAt: '2026-05-12' },
  prefs: { genres: [], moods: [], dailyGoal: null, dailyGoalUnit: 'pages', importedTitles: [] },
  signals: initialSignals,
  seen: {},
  lastAction: null,
  library: [],
  books: seedBooks,
  fragments: seedFragments,
  posts: [],
  hiddenAuthors: [],
  reported: [],
  activityDays: [1, 2, 3, 4].map(daysAgo),
  pro: false,
  hotUses: [],
  adsWatched: [],
  adsWatchedTotal: 0,
  notifications: {
    hotPeak: true,
    likes: true,
    readingGoal: true,
    newFragments: false,
    streak: true,
  },
  wantToRead: [],
  purchases: 0,
};

type Action =
  | { type: 'HYDRATE'; state: Partial<State> }
  | { type: 'ONBOARD'; prefs: Prefs }
  | { type: 'SWIPE'; fragmentId: string; dir: 'like' | 'pass'; dwellMs: number }
  | { type: 'UNDO' }
  | { type: 'ADD_TO_WANT'; bookId: string }
  | { type: 'SET_SHELF'; bookId: string; shelf: Shelf; progress?: number; rating?: number; note?: string }
  | { type: 'REMOVE_FROM_LIBRARY'; bookId: string }
  | { type: 'SIGNAL_BUY'; bookId: string }
  | { type: 'ADD_POST'; fragment: Fragment }
  | { type: 'HIDE_AUTHOR'; author: string }
  | { type: 'REPORT'; fragmentId: string }
  | { type: 'SET_PRO'; pro: boolean }
  | { type: 'CONSUME_HOT' }
  | { type: 'WATCH_AD' }
  | { type: 'TOGGLE_NOTIFICATION'; key: NotificationKey }
  | { type: 'UPDATE_PROFILE'; name: string; handle?: string }
  | { type: 'ADD_BOOK'; book: Book }
  | { type: 'EXCLUDE_TITLE'; title: string }
  | { type: 'LOGOUT' }
  | { type: 'RESET' };

const bump = (map: Record<string, number>, key: string, by: number) => ({
  ...map,
  [key]: (map[key] ?? 0) + by,
});

function learn(
  signals: Signals,
  fragment: Fragment,
  book: Book | undefined,
  dir: 'like' | 'pass',
  dwellMs: number,
): Signals {
  const sign = dir === 'like' ? 1 : -1;
  const genre = book?.genre ?? 'literatura piękna';
  const dwellNudge = dir === 'like' && dwellMs > 5000 ? 0.25 : 0;
  const fastSkip = dir === 'pass' && dwellMs < 1000 ? -0.2 : 0;

  let tags = signals.tags;
  if (dir === 'like') {
    for (const tag of fragment.tags) tags = bump(tags, tag, 0.8);
  } else {
    for (const tag of fragment.tags) tags = bump(tags, tag, -0.35);
  }

  return {
    genres: bump(signals.genres, genre, 1 * sign + dwellNudge + fastSkip),
    tags,
    authors: bump(signals.authors, book?.author ?? '', 0.6 * sign),
    books: bump(signals.books, fragment.bookId, 0.4 * sign),
    likes: signals.likes + (dir === 'like' ? 1 : 0),
    passes: signals.passes + (dir === 'pass' ? 1 : 0),
  };
}

function markActivity(state: State): Pick<State, 'activityDays'> {
  const key = todayKey();
  if (state.activityDays.includes(key)) return { activityDays: state.activityDays };
  return { activityDays: [...state.activityDays, key] };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'HYDRATE':
      return { ...state, ...action.state, hydrated: true };

    case 'ONBOARD': {
      const signals: Signals = {
        ...state.signals,
        genres: { ...state.signals.genres },
        tags: { ...state.signals.tags },
      };
      for (const genre of action.prefs.genres) {
        signals.genres[genre] = (signals.genres[genre] ?? 0) + 1.4;
      }

      // Imported titles become lightweight, unverified books so they can sit in
      // the library; they never reach the feed because they have no fragments.
      const importedBooks: Book[] = [];
      const importedItems: LibraryItem[] = [];
      for (const raw of action.prefs.importedTitles) {
        const [rawTitle, rawAuthor] = raw.split(' — ');
        const title = (rawTitle ?? '').trim();
        if (!title) continue;
        const existing = state.books.find(
          (b) => b.title.toLowerCase() === title.toLowerCase(),
        );
        if (existing) {
          if (!state.library.some((i) => i.bookId === existing.id)) {
            importedItems.push({ bookId: existing.id, shelf: 'want', addedAt: Date.now() });
          }
          continue;
        }
        const id = `import:${title.toLowerCase().replace(/[^a-z0-9ąćęłńóśźż]+/gi, '-')}`;
        importedBooks.push({
          id,
          title,
          author: (rawAuthor ?? '').trim() || 'autor nieznany',
          genre: 'literatura piękna',
          moods: [],
          year: 0,
          publisher: 'import z listy',
          pages: 0,
          description: 'Tytuł zaimportowany z Twojej listy czytelniczej.',
          source: 'unverified',
          color: '#4A4238',
        });
        importedItems.push({ bookId: id, shelf: 'want', addedAt: Date.now() });
      }

      return {
        ...state,
        onboarded: true,
        prefs: action.prefs,
        signals,
        books: [...importedBooks, ...state.books],
        library: [...state.library, ...importedItems],
      };
    }

    case 'SWIPE': {
      if (state.seen[action.fragmentId]) return state;
      const fragment = state.fragments.find((f) => f.id === action.fragmentId);
      if (!fragment) return state;
      const book = state.books.find((b) => b.id === fragment.bookId);
      return {
        ...state,
        seen: { ...state.seen, [action.fragmentId]: action.dir },
        lastAction: { fragmentId: action.fragmentId, dir: action.dir, dwellMs: action.dwellMs },
        signals: learn(state.signals, fragment, book, action.dir, action.dwellMs),
        ...markActivity(state),
      };
    }

    case 'UNDO': {
      if (!state.lastAction) return state;
      const { fragmentId, dir } = state.lastAction;
      const seen = { ...state.seen };
      delete seen[fragmentId];
      // Undo restores the card and drops the swipe from the counts. Taste weights
      // keep their history — one reversal should not erase what the reader likes.
      return {
        ...state,
        seen,
        lastAction: null,
        signals: {
          ...state.signals,
          likes: Math.max(0, state.signals.likes - (dir === 'like' ? 1 : 0)),
          passes: Math.max(0, state.signals.passes - (dir === 'pass' ? 1 : 0)),
        },
      };
    }

    case 'ADD_TO_WANT': {
      const exists = state.library.find((i) => i.bookId === action.bookId);
      const library = exists
        ? state.library.map((i) =>
            i.bookId === action.bookId && i.shelf === 'want'
              ? i
              : i.bookId === action.bookId
                ? { ...i, shelf: 'want' as Shelf }
                : i,
          )
        : [
            ...state.library,
            { bookId: action.bookId, shelf: 'want' as Shelf, addedAt: Date.now() },
          ];
      const book = state.books.find((b) => b.id === action.bookId);
      return {
        ...state,
        library,
        wantToRead: state.wantToRead.includes(action.bookId)
          ? state.wantToRead
          : [...state.wantToRead, action.bookId],
        signals: book
          ? {
              ...state.signals,
              genres: bump(state.signals.genres, book.genre, 2),
              authors: bump(state.signals.authors, book.author, 1.2),
              books: bump(state.signals.books, book.id, 1.5),
            }
          : state.signals,
        ...markActivity(state),
      };
    }

    case 'SET_SHELF': {
      const exists = state.library.find((i) => i.bookId === action.bookId);
      const library = exists
        ? state.library.map((i) =>
            i.bookId === action.bookId
              ? {
                  ...i,
                  shelf: action.shelf,
                  progress: action.progress ?? i.progress,
                  rating: action.rating ?? i.rating,
                  note: action.note ?? i.note,
                }
              : i,
          )
        : [
            ...state.library,
            {
              bookId: action.bookId,
              shelf: action.shelf,
              progress: action.progress,
              rating: action.rating,
              note: action.note,
              addedAt: Date.now(),
            },
          ];
      return { ...state, library, ...markActivity(state) };
    }

    case 'REMOVE_FROM_LIBRARY':
      return {
        ...state,
        library: state.library.filter((i) => i.bookId !== action.bookId),
        wantToRead: state.wantToRead.filter((id) => id !== action.bookId),
      };

    case 'SIGNAL_BUY': {
      const book = state.books.find((b) => b.id === action.bookId);
      return {
        ...state,
        purchases: state.purchases + 1,
        signals: book
          ? {
              ...state.signals,
              genres: bump(state.signals.genres, book.genre, 2.5),
              authors: bump(state.signals.authors, book.author, 1.4),
              books: bump(state.signals.books, book.id, 1.8),
            }
          : state.signals,
        ...markActivity(state),
      };
    }

    case 'ADD_POST':
      return {
        ...state,
        posts: [action.fragment, ...state.posts],
        fragments: [action.fragment, ...state.fragments],
        ...markActivity(state),
      };

    case 'HIDE_AUTHOR':
      return {
        ...state,
        hiddenAuthors: state.hiddenAuthors.includes(action.author)
          ? state.hiddenAuthors
          : [...state.hiddenAuthors, action.author],
      };

    case 'REPORT':
      return {
        ...state,
        reported: state.reported.includes(action.fragmentId)
          ? state.reported
          : [...state.reported, action.fragmentId],
      };

    case 'SET_PRO':
      return { ...state, pro: action.pro };

    case 'CONSUME_HOT':
      return {
        ...state,
        hotUses: [...state.hotUses, { ts: Date.now(), kind: state.pro ? 'pro' : 'free' }],
      };

    case 'WATCH_AD':
      return {
        ...state,
        adsWatchedTotal: state.adsWatchedTotal + 1,
        adsWatched: [...state.adsWatched, Date.now()],
      };

    case 'TOGGLE_NOTIFICATION':
      return {
        ...state,
        notifications: {
          ...state.notifications,
          [action.key]: !state.notifications[action.key],
        },
      };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: {
          ...state.profile,
          name: action.name,
          handle: action.handle?.trim() || state.profile.handle,
        },
      };

    case 'ADD_BOOK':
      return {
        ...state,
        books: state.books.some((b) => b.id === action.book.id)
          ? state.books
          : [action.book, ...state.books],
      };

    case 'EXCLUDE_TITLE': {
      const needle = action.title.trim().toLowerCase();
      const matched = state.books.filter(
        (b) => b.title.toLowerCase().includes(needle) || b.author.toLowerCase().includes(needle),
      );
      if (!matched.length) return state;
      const ids = new Set(matched.map((b) => b.id));
      return {
        ...state,
        books: state.books.map((b) => (ids.has(b.id) ? { ...b, source: 'excluded' } : b)),
        fragments: state.fragments.filter((f) => !ids.has(f.bookId)),
        posts: state.posts.filter((f) => !ids.has(f.bookId)),
        library: state.library.filter((i) => !ids.has(i.bookId)),
      };
    }

    case 'LOGOUT':
      return { ...state, onboarded: false };

    case 'RESET':
      return { ...initialState, hydrated: true };

    default:
      return state;
  }
}

type StoreValue = {
  state: State;
  dispatch: React.Dispatch<Action>;
  bookById: (id: string) => Book | undefined;
  fragmentById: (id: string) => Fragment | undefined;
  libraryItem: (bookId: string) => LibraryItem | undefined;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        const parsed = raw ? (JSON.parse(raw) as State) : null;
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', state: parsed ?? {} });
        }
      } catch {
        if (!cancelled) dispatch({ type: 'HYDRATE', state: {} });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => {
      const { hydrated, ...persisted } = state;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persisted)).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [state]);

  const bookById = useCallback(
    (id: string) => state.books.find((b) => b.id === id),
    [state.books],
  );
  const fragmentById = useCallback(
    (id: string) => state.fragments.find((f) => f.id === id),
    [state.fragments],
  );
  const libraryItem = useCallback(
    (bookId: string) => state.library.find((i) => i.bookId === bookId),
    [state.library],
  );

  const value = useMemo(
    () => ({ state, dispatch, bookById, fragmentById, libraryItem }),
    [state, bookById, fragmentById, libraryItem],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

/* ------------------------------ derived data ------------------------------ */

export function streakFrom(activityDays: string[]): number {
  const days = new Set(activityDays);
  let streak = 0;
  const start = days.has(todayKey()) ? 0 : 1;
  for (let i = start; i < 400; i += 1) {
    if (days.has(daysAgo(i))) streak += 1;
    else break;
  }
  return streak;
}

export const FREE_HOT_PEAKS_PER_DAY = 1;
export const FREE_ADS_PER_DAY = 3;
export const PRO_HOT_PEAKS_PER_HOUR = 15;
export const DAILY_POST_LIMIT = 5;

export function hotPeakStatus(state: State) {
  const now = new Date();
  const usedToday = state.hotUses.filter(
    (u) => todayKey(new Date(u.ts)) === todayKey(now),
  ).length;
  const usedThisHour = state.hotUses.filter(
    (u) => hourKey(new Date(u.ts)) === hourKey(now),
  ).length;
  const adsToday = state.adsWatched.filter(
    (ts) => todayKey(new Date(ts)) === todayKey(now),
  ).length;

  if (state.pro) {
    const remaining = Math.max(0, PRO_HOT_PEAKS_PER_HOUR - usedThisHour);
    return {
      remaining,
      quota: PRO_HOT_PEAKS_PER_HOUR,
      label: `${usedThisHour}/${PRO_HOT_PEAKS_PER_HOUR} na godzinę`,
      adsLeft: 0,
      canWatchAd: false,
      usedToday,
      usedThisHour,
      adsToday,
    };
  }

  const allowance = FREE_HOT_PEAKS_PER_DAY + adsToday;
  const remaining = Math.max(0, allowance - usedToday);
  return {
    remaining,
    quota: allowance,
    label: `${remaining}/${allowance}`,
    adsLeft: Math.max(0, FREE_ADS_PER_DAY - adsToday),
    canWatchAd: adsToday < FREE_ADS_PER_DAY,
    usedToday,
    usedThisHour,
    adsToday,
  };
}

export function postsToday(state: State) {
  return state.posts.filter(
    (p) => todayKey(new Date(p.createdAt)) === todayKey(),
  ).length;
}

export function favouriteGenres(state: State, limit = 3): Genre[] {
  const ranked = Object.entries(state.signals.genres)
    .filter(([, weight]) => weight > 0.2)
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre as Genre);
  if (ranked.length) return ranked.slice(0, limit);
  return state.prefs.genres.slice(0, limit);
}

export function favouriteTags(state: State, limit = 3): EmotionTag[] {
  return Object.entries(state.signals.tags)
    .filter(([, weight]) => weight > 0.2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag as EmotionTag);
}
