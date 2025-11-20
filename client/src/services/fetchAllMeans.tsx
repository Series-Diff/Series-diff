// services/fetchAllMeans.ts
async function fetchMean(
  category: string,
  filename: string,
  start?: string,
  end?: string
): Promise<number | null> {
  let url = `api/timeseries/mean?category=${category}&filename=${filename}`;
  if (start) url += `&start=${start}`;
  if (end) url += `&end=${end}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    console.error("Failed to fetch mean:", await resp.text());
    return null;
  }

  const data = await resp.json();
  return data.mean ?? null;
}

export async function fetchAllMeans(
  filenamesPerCategory: Record<string, string[]>,
  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const meanValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        // Tutaj przekazujesz start i end dalej
        const mean = await fetchMean(category, filename, start, end);
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
