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

  return items.map((item: any) => {
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
      imageLinks: info.imageLinks,
      averageRating: info.averageRating,
    };
  });
}
