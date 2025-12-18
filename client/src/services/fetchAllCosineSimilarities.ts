// services/fetchAllCosineSimilarities.ts

const API_URL = process.env.REACT_APP_API_URL || '';

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
  const url = `${API_URL}/api/timeseries/cosine_similarity?filename1=${filename1}&filename2=${filename2}&category=${category}`;
  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(response);

    // Jeśli zapytanie nie powiodło się — logujemy błąd i zwracamy null
    if (!response.ok) {
      console.error(
        `Failed to fetch cosine similarity for ${filename1} vs ${filename2}:`,
        await response.text()
      );
      return null;
    }

    // Parsujemy odpowiedź JSON i zwracamy wartość cosine similarity (lub null, jeśli brak)
    const data = await response.json();
    return data.cosine_similarity ?? null;
  } catch (err) {
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
      const value = await fetchCosineSimilarity(file1, file2, category);
      similarities[file1][file2] = value ?? 0;
    }
  }

  // Zwracamy pełną macierz cosine similarity w formacie: file1 -> (file2 -> wartość)
  return similarities;
}
