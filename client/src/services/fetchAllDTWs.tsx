// services/fetchAllDTWs.ts

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

export async function fetchDTW(
  filename1: string,
  filename2: string,
  category: string
): Promise<number | null> {
  // Tworzymy adres endpointu API z parametrami
  const url = `${API_URL}/api/timeseries/dtw?filename1=${filename1}&filename2=${filename2}&category=${category}`;
  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });
    handleSessionToken(response);

    // Jeśli zapytanie nie powiodło się — logujemy błąd i zwracamy null
    if (!response.ok) {
      console.error(`Failed to fetch DTW for ${filename1} vs ${filename2}:`, await response.text());
      return null;
    }

    // Parsujemy odpowiedź JSON i zwracamy wartość DTW (lub null, jeśli brak)
    const data = await response.json();
    return data.dtw_distance ?? 0;
  } catch (err) {
    console.error(`Error fetching DTW for ${filename1} vs ${filename2}:`, err);
    return null;
  }
}

// Funkcja pobiera macierz DTW między wszystkimi plikami w danej kategorii
export async function fetchAllDTWs(
  filenames: string[],
  category: string
): Promise<Record<string, Record<string, number>>> {
  const DTWs: Record<string, Record<string, number>> = {};
  const numFiles = filenames.length;
  // Dla każdej pary plików pobieramy DTW z API
  for (const file1 of filenames) {
    DTWs[file1] = {};
    for (const file2 of filenames) {
        DTWs[file1][file2] = 0.0;
    }
  }
  // Oblicz tylko górny trójkąt macierzy (unikalne pary)
  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    // Przekątna jest zawsze 0 (DTW(A, A) = 0), nie musimy jej obliczać

    // Pętla wewnętrzna startuje od i + 1, aby uniknąć duplikatów i przekątnej
    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchDTW(file1, file2, category);
      const dtwValue = value ?? 0;

      // Ustawiamy wartość symetrycznie
      DTWs[file1][file2] = dtwValue; // np. DTW(A, B)
      DTWs[file2][file1] = dtwValue; // np. DTW(B, A)
    }
  }
  return DTWs;
}
