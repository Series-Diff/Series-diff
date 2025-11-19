// src/services/uploadTimeSeries.ts
export const sendProcessedTimeSeriesData = async (
  data: Record<string, any>, 
  callback?: (success: boolean) => void
) => {
  if (Object.keys(data).length === 0) {
        callback?.(false);
        return;
    }
  try {
    const response = await fetch('/upload-timeseries', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

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