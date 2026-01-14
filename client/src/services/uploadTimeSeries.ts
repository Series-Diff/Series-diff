// src/services/uploadTimeSeries.ts
import { formatRateLimitMessage, formatApiError, formatServerResponseMessage } from '../utils/apiError';

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
      // Try parse JSON error body first using a clone to avoid "body stream already read"
      let errorText = '';
      try {
        const clone = response.clone();
        const json = await clone.json();
        if (json && (json.message || json.error)) {
          errorText = json.message || json.error;
        } else {
          errorText = JSON.stringify(json);
        }
      } catch (e) {
        // fallback to plain text using clone (safer) or response.statusText
        try {
          const textClone = response.clone();
          errorText = await textClone.text();
        } catch (e2) {
          errorText = response.statusText || '';
        }
      }
      console.error('Server error:', errorText);
      callback?.(false);
      // Map some server responses to user-friendly messages
      const friendly = formatServerResponseMessage(errorText || response.statusText || 'Upload failed');
      throw new Error(friendly);
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