export type Genre =
  | 'romance'
  | 'thriller'
  | 'fantasy'
  | 'sci-fi'
  | 'obyczajowa'
  | 'reportaż'
  | 'horror'
  | 'YA'
  | 'literatura piękna'
  | 'non-fiction';

export type Mood =
  | 'wzruszenie'
  | 'strach'
  | 'śmiech'
  | 'myślenie'
  | 'ucieczka'
  | 'zakochanie'
  | 'napięcie'
  | 'spokój';

export type EmotionTag =
  | 'wzruszenie'
  | 'napięcie'
  | 'śmiech'
  | 'złość'
  | 'romans'
  | 'strach'
  | 'refleksja'
  | 'zaskoczenie';

export type Source = 'licensed' | 'public' | 'unverified' | 'excluded';

export type Purpose = 'analiza' | 'krytyka' | 'polemika' | 'emocje';

export type Shelf = 'want' | 'reading' | 'read';

export type Curator = { name: string; handle: string };

export type Book = {
  id: string;
  title: string;
  author: string;
  genre: Genre;
  moods: Mood[];
  year: number;
  publisher: string;
  pages: number;
  description: string;
  source: Source;
  color: string;
  coverUrl?: string;
  /** False when the source API explicitly reported no cover artwork. */
  hasCover?: boolean;
};

export type Fragment = {
  id: string;
  bookId: string;
  text: string;
  reaction: string;
  tags: EmotionTag[];
  page?: number;
  purpose: Purpose;
  curator: Curator;
  createdAt: number;
  likes: number;
  imageUri?: string;
  mine?: boolean;
};

export type LibraryItem = {
  bookId: string;
  shelf: Shelf;
  progress?: number;
  rating?: number;
  note?: string;
  addedAt: number;
};

export type Shop = { id: string; name: string; price: number; note?: string };

export const GENRES: { value: Genre; label: string }[] = [
  { value: 'romance', label: 'romance' },
  { value: 'thriller', label: 'thriller' },
  { value: 'fantasy', label: 'fantasy' },
  { value: 'sci-fi', label: 'sci-fi' },
  { value: 'obyczajowa', label: 'literatura obyczajowa' },
  { value: 'reportaż', label: 'reportaż' },
  { value: 'horror', label: 'horror' },
  { value: 'YA', label: 'YA' },
  { value: 'literatura piękna', label: 'literatura piękna' },
  { value: 'non-fiction', label: 'non-fiction' },
];

export const MOODS: { value: Mood; label: string }[] = [
  { value: 'wzruszenie', label: 'chcę się wzruszyć' },
  { value: 'strach', label: 'chcę się bać' },
  { value: 'śmiech', label: 'chcę się śmiać' },
  { value: 'myślenie', label: 'chcę myśleć' },
  { value: 'ucieczka', label: 'chcę uciec od rzeczywistości' },
  { value: 'zakochanie', label: 'chcę się zakochać' },
  { value: 'napięcie', label: 'chcę napięcia' },
  { value: 'spokój', label: 'chcę spokoju' },
];

export const EMOTION_TAGS: EmotionTag[] = [
  'wzruszenie',
  'napięcie',
  'śmiech',
  'złość',
  'romans',
  'strach',
  'refleksja',
  'zaskoczenie',
];

export const PURPOSES: { value: Purpose; label: string; hint: string }[] = [
  { value: 'analiza', label: 'Analiza', hint: 'co mnie w tym fragmencie urzekło' },
  { value: 'krytyka', label: 'Krytyka', hint: 'co mnie w tym fragmencie irytuje' },
  { value: 'polemika', label: 'Polemika', hint: 'nie zgadzam się z tym fragmentem' },
  { value: 'emocje', label: 'Emocje', hint: 'ten fragment wywołał we mnie emocje' },
];

export const SOURCE_LABEL: Record<Source, string> = {
  licensed: 'źródło licencjonowane',
  public: 'domena publiczna',
  unverified: 'źródło niezweryfikowane',
  excluded: 'wyłączone na wniosek wydawcy',
};

export const SHELF_LABEL: Record<Shelf, string> = {
  want: 'Chcę przeczytać',
  reading: 'Czytam',
  read: 'Przeczytane',
};
