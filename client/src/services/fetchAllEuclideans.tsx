// services/fetchAllEuclidean.tsx

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

export async function fetchEuclidean(
    category: string,
    filename1: string,
    filename2: string,
    tolerance?: string
): Promise<number | null> {
    const toleranceParam = tolerance !== undefined ? String(tolerance) : undefined;
    const params = new URLSearchParams({
        category: category.trim(),
        filename1: filename1.trim(),
        filename2: filename2.trim(),
        ...(toleranceParam && { tolerance: toleranceParam })
    });

    try {
        const resp = await fetch(`${API_URL}/api/timeseries/euclidean_distance?${params}`, {
            headers: {
                ...getAuthHeaders(),
            },
        });
        handleSessionToken(resp);
        if (!resp.ok) {
          const bodyText = await resp.text();
          console.error("Failed to fetch euclidean distance:", bodyText);
          if ([429, 500, 400].includes(resp.status)) {
            const details = bodyText ? ` - ${bodyText}` : '';
            const error = new Error(`HTTP ${resp.status}: ${resp.statusText}${details}`);
            (error as any).status = resp.status;
            (error as any).body = bodyText;
            throw error;
          }
          return null;
        }
        const data = await resp.json();
        return data.euclidean_distance ?? 0;
      } catch (err) {
        // Rethrow to allow callers/tests to observe network errors
        throw err;
      }
}
    // Funkcja pobiera macierz odległości euklidesowych między wszystkimi plikami w danej kategorii
export async function fetchAllEuclideans(
  filenames: string[],
  tolerance: number | null | undefined,
  category: string

): Promise<Record<string, Record<string, number>>> {
  const euclideans: Record<string, Record<string, number>> = {};
  const toleranceString = tolerance !== null ? `${tolerance}T` : undefined;

    const numFiles = filenames.length;
  // Dla każdej pary plików pobieramy euclidean distance z API
  for (const file1 of filenames) {
    euclideans[file1] = {};
    for (const file2 of filenames) {
        euclideans[file1][file2] = 0.0;
    }
  }
  // Oblicz tylko górny trójkąt macierzy (unikalne pary)
  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    // Przekątna jest zawsze 0 (euclidean(A, A) = 0), nie musimy jej obliczać

    // Pętla wewnętrzna startuje od i + 1, aby uniknąć duplikatów i przekątnej
    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchEuclidean(category, file1, file2, toleranceString);
      const euclidean = value ?? 0;

      // Ustawiamy wartość symetrycznie
      euclideans[file1][file2] = euclidean; // np. euclidean(A, B)
      euclideans[file2][file1] = euclidean; // np. euclidean(B, A)
    }
  }
  return euclideans;
}
