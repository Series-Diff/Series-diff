    async function fetchMedian(category: string, filename: string): Promise<number | null>{
        const resp = await fetch(`api/timeseries/median?category=${category}&filename=${filename}`);
        if (!resp.ok) {
            console.error("Failed to fetch median:", await resp.text());
            return null;
        }
        const data = await resp.json();
        return data.median ?? null;
    }

    export async function fetchAllMedians(
      filenamesPerCategory: Record<string, string[]>
    ): Promise<Record<string, Record<string, number>>> {
      const medianValues: Record<string, Record<string, number>> = {};

      for (const category of Object.keys(filenamesPerCategory)) {
        for (const filename of filenamesPerCategory[category]) {
          try {
            const median = await fetchMedian(category, filename);
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