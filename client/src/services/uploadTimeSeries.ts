// src/services/uploadTimeSeries.ts

const API_URL = process.env.REACT_APP_API_URL || '';

const getAuthHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('session_token');
  return token ? { 'X-Session-ID': token } : {};
};

const handleSessionToken = (response: Response) => {
  const newToken = response.headers.get('X-Session-ID');
  if (newToken) {
    localStorage.setItem('session_token', newToken);
  }
};

export const sendProcessedTimeSeriesData = async (
  data: Record<string, any>, 
  callback?: (success: boolean) => void
) => {
  if (Object.keys(data).length === 0) {
        callback?.(false);
        return;
    }
  try {
    const response = await fetch(`${API_URL}/api/upload-timeseries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify(data),
    });

    handleSessionToken(response);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server error:', errorText);
      throw new Error(errorText);
    }

    const result = await response.json();
    callback?.(true);
    return result;
  } catch (error) {
    console.error('Error uploading time series data:', error);
    callback?.(false);
    throw error;
  }
};