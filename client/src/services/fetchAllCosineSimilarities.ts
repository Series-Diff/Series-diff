// services/fetchAllCosineSimilarities.ts

const API_URL = process.env.REACT_APP_API_URL || '';

// Funkcja pobiera cosine similarity między dwoma plikami
export async function fetchCosineSimilarity(
  filename1: string,
  filename2: string,
  category: string
): Promise<number | null> {
  // Tworzymy adres endpointu API z parametrami
  const url = `${API_URL}/api/timeseries/cosine_similarity?filename1=${filename1}&filename2=${filename2}&category=${category}`;
  try {
    const response = await fetch(url);

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
  const numFiles = filenames.length;

  // Inicjalizacja macierzy - przekątna = 1 (cosine similarity z samym sobą)
  for (const file1 of filenames) {
    similarities[file1] = {};
    for (const file2 of filenames) {
      similarities[file1][file2] = file1 === file2 ? 1 : 0;
    }
  }

  // Oblicz tylko górny trójkąt macierzy (unikalne pary)
  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchCosineSimilarity(file1, file2, category);
      const similarity = value ?? 0;

      // Ustawiamy wartość symetrycznie
      similarities[file1][file2] = similarity;
      similarities[file2][file1] = similarity;
    }
  }

  return similarities;
}
