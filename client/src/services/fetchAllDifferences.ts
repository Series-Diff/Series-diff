// services/fetchAllDifferences.ts

import {TimeSeriesEntry} from "../services/fetchTimeSeries";

async function fetchDifference(category: string, filename1: string, filename2: string, tolerance?: string, start?: string,
  end?: string): Promise<TimeSeriesEntry[] | null> {
    const toleranceParam = tolerance !== undefined ? String(tolerance) : undefined;
    let url=`/timeseries/difference?category=${category}&filename1=${filename1}&filename2=${filename2}` + (toleranceParam ? `&tolerance=${toleranceParam}` : "")
    if (start) url += `&start=${start}`;
    if (end) url += `&end=${end}`;

    const resp = await fetch(url);
    if (!resp.ok) {
        console.error(`Failed to fetch difference for ${filename1} - ${filename2} in ${category}:`, await resp.text());
        return null;
    }
    const data = await resp.json();
    if (data.difference) {
        return Object.entries(data.difference).map(([x, y]) => ({ x, y: y as number }));
    }
    return null;
}

// New function to fetch all differences for all meaningful pairs
export async function fetchAllDifferences(
  filenamesPerCategory: Record<string, string[]>,
  tolerance: number | null | undefined,  start?: string,
  end?: string
): Promise<Record<string, Record<string, TimeSeriesEntry[]>>> {
  const differenceValues: Record<string, Record<string, TimeSeriesEntry[]>> = {};

    const toleranceString = tolerance !== null ? `${tolerance}T` : undefined;

  for (const category of Object.keys(filenamesPerCategory)) {
    const files = filenamesPerCategory[category];
    if (files.length < 2) continue; // Need at least two files to calculate a difference

      if (!differenceValues[category]) {
        differenceValues[category] = {};
    }
    for (let i = 0; i < files.length; i++) {
      for (let j = i + 1; j < files.length; j++) {
        const filename1 = files[i];
        const filename2 = files[j];
        const differenceKey = `${filename1} - ${filename2}`;

        try {
          const diffSeries = await fetchDifference(category, filename1, filename2, toleranceString);
          if (diffSeries) {
            if (!differenceValues[category]) {
              differenceValues[category] = {};
            }
            // Sort the difference series by date
            differenceValues[category][differenceKey] = diffSeries.sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
            console.log("fetchAllDifferences result:", differenceValues);

          }

        } catch (err) {
          console.warn(`Error fetching difference for ${category}.${differenceKey}:`, err);
        }
      }
    }
  }
  return differenceValues;
}