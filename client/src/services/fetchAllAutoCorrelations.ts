// services/fetchAllAutoCorrelations.ts

async function fetchAutocorrelation(category: string, filename: string, start?: string,
  end?: string): Promise<number | null>{
    let url=`api/timeseries/autocorrelation?category=${category}&filename=${filename}`
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error("Failed to fetch autocorrelation:", await resp.text());
        return null;
    }
    const data = await resp.json();
    return data.autocorrelation ?? null;
}

export async function fetchAllAutoCorrelations(
  filenamesPerCategory: Record<string, string[]>,  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const autocorrelationsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const autocorrelation = await fetchAutocorrelation(category, filename, start,end);
        if (!autocorrelationsValues[category]) {
          autocorrelationsValues[category] = {};
        }
          if (autocorrelation != null) {
              autocorrelationsValues[category][filename] = autocorrelation;
          }
      } catch (err) {
        console.warn(`Error fetching autocorrelation for ${category}.${filename}:`, err);
      }
    }
  }

  return autocorrelationsValues;
}