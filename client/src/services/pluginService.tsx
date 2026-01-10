/**
 * Plugin service for backend operations only.
 *
 * Plugins are stored locally in cacheAPI (with localStorage fallback).
 * This service handles:
 * - Code validation (security check on backend)
 * - Batch code execution with caching
 * - Template fetching
 */

import { apiLogger } from '../utils/apiLogger';
import { cacheAPI } from '../utils/cacheApiWrapper';

export interface PluginValidationResult {
    valid: boolean;
    error?: string;
}

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
const API_BASE = `${API_URL}/api/plugins`;

const PLUGIN_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Cryptographic hash function using Web Crypto API (SHA-256)
// Fallback to non-cryptographic hash for older browsers
const hashCode = async (str: string): Promise<string> => {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode(str);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (e) {
            // Fallback to simple hash if crypto fails
        }
    }
    
    // Fallback: simple hash (not cryptographically secure, but better than truncated)
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
};

// Cache for computed hashes to avoid recomputing
const hashCache = new Map<string, string>();

const generatePluginCacheKey = async (code: string, category: string, filenames: string[], start?: string | null, end?: string | null): Promise<string> => {
    // Check if hash is already cached
    let codeHash = hashCache.get(code);
    if (!codeHash) {
        codeHash = await hashCode(code);
        hashCache.set(code, codeHash);
    }
    return `plugin|${codeHash}|${category}|${filenames.join(',')}|${start || 'no-start'}|${end || 'no-end'}`;
};

/**
 * Validate plugin code before saving.
 * This calls the backend to check for dangerous patterns and syntax errors.
 */
export async function validatePluginCode(code: string): Promise<PluginValidationResult> {
    const startTime = performance.now();
    apiLogger.logQuery('/api/plugins/validate', 'POST', {
        params: { codeLength: code.length },
    });

    const response = await fetch(`${API_BASE}/validate`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
        },
        body: JSON.stringify({ code })
    });

    const duration = Math.round(performance.now() - startTime);
    handleSessionToken(response);

    if (!response.ok) {
        apiLogger.logQuery('/api/plugins/validate', 'POST', {
            params: { codeLength: code.length },
            duration,
            status: response.status,
        });
        throw new Error('Failed to validate plugin code');
    }

    apiLogger.logQuery('/api/plugins/validate', 'POST', {
        params: { codeLength: code.length },
        duration,
        status: response.status,
    });

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
 * Execute plugin with caching via cacheAPI
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
    start?: string | null,
    end?: string | null
): Promise<PluginExecutionResult> {
    const cacheKey = await generatePluginCacheKey(code, category, filenames, start, end);
    
    // Check cache using cacheAPI
    try {
        const cached = await cacheAPI.get<{ data: PluginExecutionResult; timestamp: number }>(cacheKey);
        if (cached && Date.now() - cached.timestamp < PLUGIN_CACHE_DURATION) {
            apiLogger.logQuery('/api/plugins/execute', 'POST', {
                params: { category, files: filenames.length, start, end },
                fromCache: true,
                cacheKey,
                duration: 0,
                status: 200,
            });
            return cached.data;
        }
    } catch (e) {
        console.warn('Failed to check plugin cache:', e);
    }

    const startTime = performance.now();
    apiLogger.logQuery('/api/plugins/execute', 'POST', {
        params: { category, files: filenames.length, start, end },
    });

    const response = await fetch(`${API_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ code, category, filenames, start, end })
    });

    const duration = Math.round(performance.now() - startTime);
    handleSessionToken(response);
    const result = await response.json();

    if (!response.ok) {
        apiLogger.logQuery('/api/plugins/execute', 'POST', {
            params: { category, files: filenames.length, start, end },
            duration,
            status: response.status,
        });
        return { error: result.error || 'Failed to execute plugin' };
    }

    // Cache result using cacheAPI with TTL
    try {
        await cacheAPI.set(cacheKey, { data: result, timestamp: Date.now() }, PLUGIN_CACHE_DURATION);
    } catch (e) {
        console.warn('Failed to cache plugin result:', e);
    }

    apiLogger.logQuery('/api/plugins/execute', 'POST', {
        params: { category, files: filenames.length, start, end },
        duration,
        status: response.status,
    });

    return result;
}