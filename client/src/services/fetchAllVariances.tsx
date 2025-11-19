async function fetchVariance(category: string, filename: string): Promise<number | null>{
    const resp = await fetch(`/timeseries/variance?category=${category}&filename=${filename}`);
    if (!resp.ok) {
        console.error("Failed to fetch variance:", await resp.text());
        return null;
    }
    const data = await resp.json();
    return data.variance ?? null;
}

export async function fetchAllVariances(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const varianceValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const variance = await fetchVariance(category, filename);
        if (!varianceValues[category]) {
          varianceValues[category] = {};
        }
          if (variance != null) {
              varianceValues[category][filename] = variance;
          }
      } catch (err) {
        console.warn(`Error fetching variance for ${category}.${filename}:`, err);
      }
    }
  }

  return varianceValues;
}