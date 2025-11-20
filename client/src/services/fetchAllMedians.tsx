    async function fetchMedian(category: string, filename: string, start?: string,
  end?: string): Promise<number | null>{
    let url=`api/timeseries/median?category=${category}&filename=${filename}`;
      if (start) url += `&start=${start}`;
      if (end) url += `&end=${end}`;

        const resp = await fetch(url);
        if (!resp.ok) {
            console.error("Failed to fetch median:", await resp.text());
            return null;
        }
        const data = await resp.json();
        return data.median ?? null;
    }



    export async function fetchAllMedians(
      filenamesPerCategory: Record<string, string[]>,  start?: string,
  end?: string
    ): Promise<Record<string, Record<string, number>>> {
      const medianValues: Record<string, Record<string, number>> = {};

      for (const category of Object.keys(filenamesPerCategory)) {
        for (const filename of filenamesPerCategory[category]) {
          try {
            const median = await fetchMedian(category, filename,start, end);
            if (!medianValues[category]) {
              medianValues[category] = {};
            }
              if (median != null) {
                  medianValues[category][filename] = median;
              }
          } catch (err) {
            console.warn(`Error fetching median for ${category}.${filename}:`, err);
          }
        }
      }

      return medianValues;
    }