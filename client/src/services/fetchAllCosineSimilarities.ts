// services/fetchAllCosineSimilarities.ts

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
  const token = localStorage.getItem('session_token');
  return token ? { 'X-Session-ID': token } : {};
};

const handleSessionToken = (response: Response) => {
  const newToken = response.headers.get('X-Session-ID');
  if (newToken) {
    localStorage.setItem('session_token', newToken);
  }
};

// Funkcja pobiera cosine similarity między dwoma plikami
export async function fetchCosineSimilarity(
  filename1: string,
  filename2: string,
  category: string
): Promise<number | null> {
  // Tworzymy adres endpointu API z parametrami
  const url = `${API_URL}/api/timeseries/cosine_similarity?filename1=${encodeURIComponent(filename1.trim())}&filename2=${encodeURIComponent(filename2.trim())}&category=${encodeURIComponent(category.trim())}`;
  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(response);

    // Jeśli zapytanie nie powiodło się — logujemy błąd i rzucamy exception dla poważnych błędów
    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Failed to fetch cosine similarity for ${filename1} vs ${filename2}:`,
        errorText
      );
      // Throw exception for 429/500/400 errors so they can be caught and displayed
      if (response.status === 429 || response.status === 500 || response.status === 400) {
        const details = errorText ? ` - ${errorText}` : '';
        const error = new Error(`HTTP ${response.status}: ${response.statusText}${details}`);
        (error as any).status = response.status;
        (error as any).body = errorText;
        throw error;
      }
      return null;
    }

    // Parsujemy odpowiedź JSON i zwracamy wartość cosine similarity (lub null, jeśli brak)
    const data = await response.json();
    return data.cosine_similarity ?? null;
  } catch (err) {
    // Re-throw network errors and HTTP errors so they propagate to useMetricCalculations
    if (err instanceof TypeError || (err as any)?.status) {
      throw err;
    }
    console.error(`Error fetching cosine similarity for ${filename1} vs ${filename2}:`, err);
    return null;
  }
}

// Funkcja pobiera macierz cosine similarity między wszystkimi plikami w danej kategorii
export async function fetchAllCosineSimilarities(
  filenames: string[],
  category: string
): Promise<Record<string, Record<string, number>>> {
  const similarities: Record<string, Record<string, number>> = {};

  // Dla każdej pary plików pobieramy cosine similarity z API
  for (const file1 of filenames) {
    similarities[file1] = {};
    for (const file2 of filenames) {
      try {
        const value = await fetchCosineSimilarity(file1, file2, category);
        similarities[file1][file2] = value ?? 0;
      } catch (err) {
        // Re-throw errors so they propagate to useMetricCalculations
        throw err;
      }
    }
  }

  // Zwracamy pełną macierz cosine similarity w formacie: file1 -> (file2 -> wartość)
  return similarities;
}
