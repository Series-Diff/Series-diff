// src/services/uploadTimeSeries.ts
import { formatRateLimitMessage, formatApiError } from '../utils/apiError';

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

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
  data: Record<string, unknown>, 
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
      if (response.status === 429) {
        const message = formatRateLimitMessage(response, 'POST /api/upload-timeseries');
        callback?.(false);
        throw new Error(message);
      }
      const errorText = await response.text();
      console.error('Server error:', errorText);
      callback?.(false);
      throw new Error(errorText || 'Upload failed');
    }

    const result = await response.json();
    callback?.(true);
    return result;
  } catch (error) {
    const message = formatApiError(error, 'POST /api/upload-timeseries');
    console.error('Error uploading time series data:', message);
    callback?.(false);
    throw new Error(message);
  }
};