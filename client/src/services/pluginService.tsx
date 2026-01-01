/**
 * Plugin service for backend operations only.
 *
 * Plugins are stored locally in localStorage (see useLocalPlugins hook).
 * This service handles:
 * - Code validation (security check on backend)
 * - Batch code execution
 * - Template fetching
 */

export interface PluginValidationResult {
    valid: boolean;
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
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ code })
    });

    handleSessionToken(response);

    if (!response.ok) {
        throw new Error('Failed to validate plugin code');
    }

    return response.json();
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


export interface PluginExecutionResult {
    results?: Record<string, Record<string, number | null>>;
    error?: string;
}

/**
 * @param code - The Python code to execute
 * @param category - Category name
 * @param filenames - List of filenames to compare
 * @param start - Optional start time
 * @param end - Optional end time
 */
export async function executePlugin(
    code: string,
    category: string,
    filenames: string[],
    start?: string,
    end?: string
): Promise<PluginExecutionResult> {
    const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code, category, filenames, start, end })
    });
    handleSessionToken(response);
    const result = await response.json();

    if (!response.ok) {
        return { error: result.error || 'Failed to execute plugin' };
    }

    return result;
}