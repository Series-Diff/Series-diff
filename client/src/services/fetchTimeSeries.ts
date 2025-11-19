export type TimeSeriesEntry = {
        x: string;
        y: number;
    };


export type TimeSeriesResponse = Record<string, TimeSeriesEntry[]>;


export const fetchTimeSeriesData = async (): Promise<TimeSeriesResponse> => {
  const resp = await fetch("/timeseries");
  if (!resp.ok) throw new Error(await resp.text());
  const json: Record<string, Record<string, Record<string, number>>> = await resp.json();
  const out: TimeSeriesResponse = {};

  // Iterujemy po każdym wpisie w obiekcie, gdzie kluczem jest `timestamp`.
  for (const [timestamp, timestampData] of Object.entries(json)) {
    if (typeof timestampData !== 'object' || timestampData === null) continue;

    // Iterujemy po grupach w danym punkcie czasowym (np. "humidity", "temperature").
    for (const [groupName, seriesData] of Object.entries(timestampData)) {
      if (typeof seriesData !== 'object' || seriesData === null) continue;

      // Iterujemy po konkretnych seriach danych dla danej grupy.
      for (const [seriesName, value] of Object.entries(seriesData)) {
        if (typeof value !== 'number') continue;

        // Tworzymy unikalny, złożony klucz dla serii danych, np. "humidity.data_1".
        const compositeKey = `${groupName}.${seriesName}`;

        // Jeśli tablica dla tego klucza jeszcze nie istnieje w wynikowym obiekcie, tworzymy ją.
        if (!out[compositeKey]) {
          out[compositeKey] = [];
        }

        // Dodajemy nowy punkt danych (wpis szeregu czasowego) do odpowiedniej serii.
        out[compositeKey].push({
          x: timestamp, // `x` to nasz klucz główny z oryginalnego JSON
          y: value,     // `y` to wartość liczbowa
        });
      }
    }
  }


  for (const key in out) {
      out[key].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  }

  return out;
};


export const fetchRawTimeSeriesData = async (): Promise<Record<string, any[]>> => {
  const resp = await fetch("/timeseries");
  if (!resp.ok) throw new Error(await resp.text());

  const rawJson = await resp.json();
  return rawJson;
};