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
 * Check if an error is a network-level error (connection failed, server unreachable, etc.).
 * This includes "Failed to fetch" and other network-related errors.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) {
    // TypeError with "Failed to fetch" is the standard network error
    // This covers: ERR_EMPTY_RESPONSE, ERR_CONNECTION_REFUSED, ERR_NAME_NOT_RESOLVED, etc.
    if (error.message === 'Failed to fetch' || error.message.includes('fetch')) {
      return true;
    }
  }
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    // Check for common network error patterns
    if (msg.includes('failed to fetch') || 
        msg.includes('network') || 
        msg.includes('connection') ||
        msg.includes('timeout') ||
        msg.includes('aborted')) {
      return true;
    }
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
 * Generic network error message for server crashes, timeouts, etc.
 */
export function getNetworkErrorMessage(): string {
  return 'Server unavailable. The request failed - the server may be overloaded or restarting. Please try again.';
}

/**
 * Convert an error to a user-friendly message, detecting rate limit scenarios.
 * Note: We no longer assume network errors are rate limits - they could be server crashes,
 * OOM kills, or genuine connectivity issues.
 */
export function formatApiError(error: unknown, endpointLabel?: string): string {
  if (isRateLimitError(error)) {
    return error instanceof Error ? error.message : getGenericRateLimitMessage();
  }
  if (isNetworkError(error)) {
    // Network errors can have many causes: server crash, OOM, timeout, connectivity issues.
    // Don't assume it's rate limiting - show a generic server error message.
    return getNetworkErrorMessage();
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}
