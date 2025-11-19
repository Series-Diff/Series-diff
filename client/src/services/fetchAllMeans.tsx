// services/fetchAllMeans.ts

async function fetchMean(category: string, filename: string): Promise<number | null>{
    const resp = await fetch(`/timeseries/mean?category=${category}&filename=${filename}`);
    if (!resp.ok) {
        console.error("Failed to fetch mean:", await resp.text());
        return null;
    }
    const data = await resp.json();
    return data.mean ?? null;
}

export async function fetchAllMeans(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const meanValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const mean = await fetchMean(category, filename);
        if (!meanValues[category]) {
          meanValues[category] = {};
        }
          if (mean != null) {
              meanValues[category][filename] = mean;
          }
      } catch (err) {
        console.warn(`Error fetching mean for ${category}.${filename}:`, err);
      }
    }
  }

  return meanValues;
}