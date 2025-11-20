async function fetchStdDev(category: string, filename: string, start?: string,
  end?: string): Promise<number | null>{
        let url=`api/timeseries/standard_deviation?category=${category}&filename=${filename}`;
      if (start) url += `&start=${start}`;
      if (end) url += `&end=${end}`;

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error("Failed to fetch standard deviation:", await resp.text());
        return null;
    }
    const data = await resp.json();
    return data.standard_deviation ?? null;
}

export async function fetchAllStdDevs(
  filenamesPerCategory: Record<string, string[]>,  start?: string,
  end?: string
): Promise<Record<string, Record<string, number>>> {
  const stdDevsValues: Record<string, Record<string, number>> = {};

  for (const category of Object.keys(filenamesPerCategory)) {
    for (const filename of filenamesPerCategory[category]) {
      try {
        const stdDev = await fetchStdDev(category, filename);
        if (!stdDevsValues[category]) {
          stdDevsValues[category] = {};
        }
          if (stdDev != null) {
              stdDevsValues[category][filename] = stdDev;
          }
      } catch (err) {
        console.warn(`Error fetching standard deviation for ${category}.${filename}:`, err);
      }
    }
  }

  return stdDevsValues;
}