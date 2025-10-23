// services/fetchAllAutoCorrelations.ts

async function fetchAutocorrelation(category: string, filename: string): Promise<number | null>{
    const resp = await fetch(`api/timeseries/autocorrelation?category=${category}&filename=${filename}`);
    if (!resp.ok) {
        console.error("Failed to fetch autocorrelation:", await resp.text());
        return null;
    }
    const data = await resp.json();
    return data.autocorrelation ?? null;
}

export async function fetchAllAutoCorrelations(
  filenamesPerCategory: Record<string, string[]>
): Promise<Record<string, Record<string, number>>> {
  const autocorrelationsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const autocorrelation = await fetchAutocorrelation(category, filename);
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