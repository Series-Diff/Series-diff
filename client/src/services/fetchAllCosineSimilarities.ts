// services/fetchAllCosineSimilarities.ts
import { formatRateLimitMessage, formatApiError } from '../utils/apiError';

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

export async function fetchCosineSimilarity(
  filename1: string,
  filename2: string,
  category: string,
  start?: string,
  end?: string
): Promise<number | null> {
 const params = new URLSearchParams({
    filename1: filename1.trim(),
    filename2: filename2.trim(),
    category: category.trim(),
  });
  if (start) {
    params.append('start', start);
  }
  if (end) {
    params.append('end', end);
  }
  const url = `${API_URL}/api/timeseries/cosine_similarity?${params.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    handleSessionToken(response);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(formatRateLimitMessage(response, '/api/timeseries/cosine_similarity'));
      }
      console.error(
        `Failed to fetch cosine similarity for ${filename1} vs ${filename2}:`,
        await response.text()
      );
      return null;
    }

    const data = await response.json();
    return data.cosine_similarity ?? null;
  } catch (err) {
    console.error(`Error fetching cosine similarity for ${filename1} vs ${filename2}:`, err);
    throw new Error(formatApiError(err, '/api/timeseries/cosine_similarity'));
  }
}

export async function fetchAllCosineSimilarities(
  filenames: string[],
  category: string,
  start?: string,
  end?: string
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

      const value = await fetchCosineSimilarity(file1, file2, category,start,end);
      const similarity = value ?? 0;

      // Ustawiamy wartość symetrycznie
      similarities[file1][file2] = similarity;
      similarities[file2][file1] = similarity;
    }
  }

  return similarities;
}
