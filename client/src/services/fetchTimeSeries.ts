export type TimeSeriesEntry = {
  x: string; // ISO string timestamp
  y: number;
};

export type TimeSeriesResponse = Record<string, TimeSeriesEntry[]>;

const API_URL = process.env.REACT_APP_API_URL || '';

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

export const fetchTimeSeriesData = async (
  start?: string,
  end?: string
): Promise<TimeSeriesResponse> => {
  let url = `${API_URL}/api/timeseries`;
  const params: string[] = [];
  if (start) params.push(`start=${encodeURIComponent(start)}`);
  if (end) params.push(`end=${encodeURIComponent(end)}`);
  if (params.length > 0) url += `?${params.join('&')}`;

  const resp = await fetch(url, {
    headers: {
      ...getAuthHeaders(),
      'Content-Type': 'application/json',
    },
  });

  handleSessionToken(resp);

  if (!resp.ok) throw new Error(await resp.text());

  const json: Record<string, Record<string, Record<string, number>>> = await resp.json();
  const out: TimeSeriesResponse = {};

  for (const [timestamp, timestampData] of Object.entries(json)) {
    if (typeof timestampData !== 'object' || timestampData === null) continue;

    for (const [groupName, seriesData] of Object.entries(timestampData)) {
      if (typeof seriesData !== 'object' || seriesData === null) continue;

      for (const [seriesName, value] of Object.entries(seriesData)) {
        if (typeof value !== 'number') continue;

        const compositeKey = `${groupName}.${seriesName}`;
        if (!out[compositeKey]) out[compositeKey] = [];
        out[compositeKey].push({ x: timestamp, y: value });
      }
    }
  }

  return out;
};

export const fetchRawTimeSeriesData = async (): Promise<Record<string, any[]>> => {
  const resp = await fetch(`${API_URL}/api/timeseries`, {
    headers: getAuthHeaders(),
  });

  handleSessionToken(resp);

  if (!resp.ok) throw new Error(await resp.text());

  return await resp.json();
};
