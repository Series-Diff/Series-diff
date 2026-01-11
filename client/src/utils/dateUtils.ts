/**
 * Utility functions for date handling and clamping to data bounds.
 * Used across multiple hooks to ensure consistent date range handling.
 */

export interface DateBounds {
  minBound: Date | null;
  maxBound: Date | null;
}

export interface EffectiveDateRange {
  effectiveStart: string | null;
  effectiveEnd: string | null;
}

/**
 * Clamp a date string to data bounds to avoid unnecessary API calls
 * when user selects dates outside the actual data range.
 * 
 * @param dateIso - ISO date string to clamp (or null)
 * @param isStart - true if this is the start date, false for end date
 * @param bounds - Object containing minBound and maxBound Date objects
 * @returns Clamped ISO string, or original if within bounds, or null if input is null
 */
export function clampDateToDataBounds(
  dateIso: string | null,
  isStart: boolean,
  bounds: DateBounds
): string | null {
  if (!dateIso) return null;
  
  const date = new Date(dateIso);
  const { minBound, maxBound } = bounds;
  
  // Clamp start date: if before minBound, use minBound
  if (isStart && minBound && date < minBound) {
    return minBound.toISOString();
  }
  // Clamp end date: if after maxBound, use maxBound
  if (!isStart && maxBound && date > maxBound) {
    return maxBound.toISOString();
  }
  
  return dateIso;
}

/**
 * Generate effective start/end dates for API calls and cache keys.
 * Normalizes null/undefined values to data bounds and clamps out-of-range dates.
 * 
 * This ensures that:
 * 1. When user selects "full range" (null), we use actual data bounds
 * 2. When user selects dates outside data range, they are clamped to bounds
 * 3. Cache keys are consistent regardless of how user selects the same effective range
 * 
 * @param start - Start date string (null/undefined = use full data range)
 * @param end - End date string (null/undefined = use full data range)
 * @param minBound - Minimum date boundary (from data)
 * @param maxBound - Maximum date boundary (from data)
 * @returns Object with effectiveStart and effectiveEnd ISO strings (or null if no bounds)
 */
export function getEffectiveDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  minBound: Date | null | undefined,
  maxBound: Date | null | undefined
): EffectiveDateRange {
  const bounds: DateBounds = {
    minBound: minBound ?? null,
    maxBound: maxBound ?? null,
  };
  
  const defaultMinIso = bounds.minBound ? bounds.minBound.toISOString() : null;
  const defaultMaxIso = bounds.maxBound ? bounds.maxBound.toISOString() : null;
  
  // If null/undefined, use data bounds; otherwise clamp to data bounds
  const effectiveStart = (!start)
    ? defaultMinIso
    : clampDateToDataBounds(start, true, bounds);
  
  const effectiveEnd = (!end)
    ? defaultMaxIso
    : clampDateToDataBounds(end, false, bounds);
  
  return { effectiveStart, effectiveEnd };
}

/**
 * Generate a cache key string from effective date range.
 * 
 * @param effectiveStart - Effective start date ISO string (or null)
 * @param effectiveEnd - Effective end date ISO string (or null)
 * @returns Cache key string in format "{start}_to_{end}" where null values become "no-start" or "no-end"
 */
export function getDateRangeCacheKey(effectiveStart: string | null, effectiveEnd: string | null): string {
  return `${effectiveStart || 'no-start'}_to_${effectiveEnd || 'no-end'}`;
}
