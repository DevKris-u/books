import { Shop } from './types';

/**
 * Partner stores are mocked; the app only hands off to their site. Books and
 * fragments come from Supabase (see `src/lib/api.ts`), not from the bundle.
 */
export const shops: Shop[] = [
  { id: 'empik', name: 'Empik', price: 44.99, note: 'miękka oprawa, wysyłka 24 h' },
  { id: 'legimi', name: 'Legimi', price: 33.9, note: 'ebook, dostęp od razu' },
  { id: 'sk', name: 'Świat Książki', price: 42.5, note: 'odbiór w salonie' },
];
