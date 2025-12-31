    const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

    const getAuthHeaders = (): HeadersInit => {
      const token = localStorage.getItem('session_token');
      return token ? { 'X-Session-ID': token } : {};
    };

    const handleSessionToken = (response: Response) => {
      const newToken = response.headers.get('X-Session-ID');
      if (newToken) {
        localStorage.setItem('session_token', newToken);
      }
    };

    async function fetchMedian(category: string, filename: string): Promise<number | null> {
        try {
          const resp = await fetch(`${API_URL}/api/timeseries/median?category=${category}&filename=${filename}`, {
            headers: {
              ...getAuthHeaders(),
            },
          });
          handleSessionToken(resp);

          if (!resp.ok) {
            const bodyText = await resp.text();
            console.error(`Failed to fetch median for ${category}.${filename}:`, bodyText);
            return null;
          }

          const data = await resp.json();
          const value = data.median ?? null;
          if (value !== null && Number.isNaN(value)) {
            console.error(`Invalid median value (NaN) for ${category}.${filename}`);
            return null;
          }
          return value;
        } catch (err) {
          console.error(`Error fetching median for ${category}.${filename}:`, err);
          return null;
        }
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