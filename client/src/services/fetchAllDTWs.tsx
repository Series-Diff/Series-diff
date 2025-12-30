// services/fetchAllDTWs.ts

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

export async function fetchDTW(
  filename1: string,
  filename2: string,
  category: string,
  start?: string,
  end?: string

): Promise<number | null> {
  let url = `${API_URL}/api/timeseries/dtw?filename1=${encodeURIComponent(encodeURIComponent(filename1.trim()))}&filename2=${encodeURIComponent(encodeURIComponent(filename2.trim()))}&category=${encodeURIComponent(encodeURIComponent(category.trim()))}`;
  if (start) url += `&start=${encodeURIComponent(start)}`;
  if (end) url += `&end=${encodeURIComponent(end)}`;

  try {
    const response = await fetch(url, {
      headers: {
        ...getAuthHeaders(),
      },
    });

    handleSessionToken(response);

    if (!response.ok) {
      console.error(`Failed to fetch DTW for ${filename1} vs ${filename2}:`, await response.text());
      return null;
    }

    const data = await response.json();
    return data.dtw_distance ?? 0;
  } catch (err) {
    console.error(`Error fetching DTW for ${filename1} vs ${filename2}:`, err);
    return null;
  }
}

export async function fetchAllDTWs(
  filenames: string[],
  category: string,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const DTWs: Record<string, Record<string, number>> = {};
  const numFiles = filenames.length;

  // Inicjalizacja macierzy DTW
  for (const file1 of filenames) {
    DTWs[file1] = {};
    for (const file2 of filenames) {
      DTWs[file1][file2] = 0.0;
    }
  }

  // Obliczamy tylko górny trójkąt macierzy (unikalne pary)
  for (let i = 0; i < numFiles; i++) {
    const file1 = filenames[i];

    for (let j = i + 1; j < numFiles; j++) {
      const file2 = filenames[j];

      const value = await fetchDTW(file1, file2, category, start, end);
      const dtwValue = value ?? 0;

      DTWs[file1][file2] = dtwValue;
      DTWs[file2][file1] = dtwValue;
    }
  }

  return DTWs;
}
