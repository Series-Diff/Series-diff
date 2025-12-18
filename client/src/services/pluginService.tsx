/**
 * Plugin service for backend operations only.
 *
 * Plugins are stored locally in localStorage (see useLocalPlugins hook).
 * This service handles:
 * Code validation (security check on backend)
 * Code execution
 * Template fetching
 */

export interface PluginValidationResult {
    valid: boolean;
    error?: string;
}

export interface PluginExecutionResult {
    result?: number;
    error?: string;
}

const API_BASE = '/api/plugins';

/**
 * Validate plugin code before saving.
 * This calls the backend to check for dangerous patterns and syntax errors.
 */
export async function validatePluginCode(code: string): Promise<PluginValidationResult> {
    const response = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
    });

    if (!response.ok) {
        throw new Error('Failed to validate plugin code');
    }

    return response.json();
}

/**
 * Get a template for creating a new plugin.
 */
export async function fetchPluginTemplate(
    name: string = 'Custom Metric',
    description: string = ''
): Promise<string> {
    const params = new URLSearchParams({ name, description });
    const response = await fetch(`${API_BASE}/template?${params}`);

    if (!response.ok) {
        throw new Error('Failed to fetch plugin template');
    }

    return response.text();
}

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

/**
 * Execute plugin code on two time series.
 * The code is sent directly to the backend for sandboxed execution.
 *
 * @param code - The Python code to execute
 * @param filename1 - First file name
 * @param filename2 - Second file name
 * @param category - Category name
 * @param start - Optional start time
 * @param end - Optional end time
 */
export async function executePluginCode(
    code: string,
    filename1: string,
    filename2: string,
    category: string,
    start?: string,
    end?: string
): Promise<PluginExecutionResult> {
    const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code, filename1, filename2, category, start, end })
    });
    handleSessionToken(response);
    const result = await response.json();

    if (!response.ok) {
        return { error: result.error || 'Failed to execute plugin' };
    }

    return result;
}