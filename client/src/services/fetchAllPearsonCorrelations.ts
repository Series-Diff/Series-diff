// services/fetchAllPearsonCorrelations.ts
const API_URL = process.env.REACT_APP_API_URL || '';

// Funkcja pobiera współczynnik korelacji Pearsona między dwoma plikami
export async function fetchPearsonCorrelation(
  filename1: string,
  filename2: string,
  category: string
): Promise<number | null> {
  // Tworzymy adres endpointu API z parametrami
  const url = `${API_URL}/api/timeseries/pearson_correlation?filename1=${filename1}&filename2=${filename2}&category=${category}`;
  try {
    const response = await fetch(url);

    // Jeśli zapytanie nie powiodło się — logujemy błąd i zwracamy null
    if (!response.ok) {
      console.error(`Failed to fetch correlation for ${filename1} vs ${filename2}:`, await response.text());
      return null;
    }

    // Parsujemy odpowiedź JSON i zwracamy wartość korelacji (lub null, jeśli brak)
    const data = await response.json();
    return data.pearson_correlation ?? null;
  } catch (err) {
    console.error(`Error fetching correlation for ${filename1} vs ${filename2}:`, err);
    return null;
  }
}

// Funkcja pobiera macierz korelacji między wszystkimi plikami w danej kategorii
export async function fetchAllPearsonCorrelations(
  filenames: string[],
  category: string
): Promise<Record<string, Record<string, number>>> {
  const correlations: Record<string, Record<string, number>> = {};
  const numFiles = filenames.length;

  // Inicjalizacja macierzy - przekątna = 1 (korelacja z samym sobą)
  for (const file1 of filenames) {
    correlations[file1] = {};
    for (const file2 of filenames) {
      correlations[file1][file2] = file1 === file2 ? 1 : 0;
    }
  }

  // Oblicz tylko górny trójkąt macierzy (unikalne pary)
  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchPearsonCorrelation(file1, file2, category);
      const correlation = value ?? 0;

      // Ustawiamy wartość symetrycznie
      correlations[file1][file2] = correlation;
      correlations[file2][file1] = correlation;
    }
  }

  return correlations;
}
