/**
 * Build a user-facing rate limit error message from a Response.
 * Uses `Retry-After` header when available and adds endpoint-specific hints.
 */
export function formatRateLimitMessage(resp: Response, endpointLabel: string): string {
  const retryAfter = resp.headers.get('Retry-After');
  const seconds = retryAfter ? parseInt(retryAfter, 10) : NaN;
  const hasSeconds = Number.isFinite(seconds) && seconds > 0;
  
  // Global limit hint
  const limitHint = '5000/day, 1000/hour';
  
  if (hasSeconds) {
    return `Rate limit exceeded. Please wait ${seconds}s and try again. Limit: ${limitHint}.`;
  }
  return `Rate limit exceeded. Please try again later. Limit: ${limitHint}.`;
}

/**
 * Check if an error message indicates a rate limit was exceeded.
 */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('Rate limit exceeded') || 
           error.message.includes('429') ||
           error.message.includes('Too Many Requests');
  }
  return false;
}

/**
 * Check if an error is a network-level "Failed to fetch" that might be caused by rate limiting.
 * This happens when the browser blocks the request due to CORS issues on 429 responses.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return true;
  }
  if (error instanceof Error && error.message.includes('Failed to fetch')) {
    return true;
  }
  return false;
}

/**
 * Generic rate limit message for when response is not available (e.g., network errors during 429).
 */
export function getGenericRateLimitMessage(): string {
  return 'Rate limit exceeded. Please try again later. Limit: 5000/day, 1000/hour.';
}

/**
 * Convert an error to a user-friendly message, detecting rate limit scenarios.
 */
export function formatApiError(error: unknown, endpointLabel?: string): string {
  if (isRateLimitError(error)) {
    return error instanceof Error ? error.message : getGenericRateLimitMessage();
  }
  if (isNetworkError(error)) {
    // Network errors during API calls are often caused by rate limiting blocking CORS preflight
    return getGenericRateLimitMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}
