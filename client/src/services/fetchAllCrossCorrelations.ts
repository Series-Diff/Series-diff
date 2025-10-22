// services/fetchAllCrossCorrelations.ts
export async function fetchCrossCorrelation(
  filename1: string,
  filename2: string,
  category: string
): Promise<number | null> {
  const url = `/timeseries/pearson_correlation?filename1=${filename1}&filename2=${filename2}&category=${category}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch correlation for ${filename1} vs ${filename2}:`, await response.text());
      return null;
    }
    const data = await response.json();
    return data.pearson_correlation ?? null;
  } catch (err) {
    console.error(`Error fetching correlation for ${filename1} vs ${filename2}:`, err);
    return null;
  }
}

export async function fetchAllCrossCorrelations(
  filenames: string[],
  category: string
): Promise<Record<string, Record<string, number>>> {
  const correlations: Record<string, Record<string, number>> = {};

  for (const file1 of filenames) {
    correlations[file1] = {};
    for (const file2 of filenames) {
      const value = await fetchCrossCorrelation(file1, file2, category);
      correlations[file1][file2] = value ?? 0;
    }
  }
  return correlations;
}
