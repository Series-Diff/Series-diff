import {useState} from 'react';
import type {ScatterPoint} from '../components';
import { useGlobalCache, type CacheEntry } from '../contexts/CacheContext';
import { apiLogger } from '../utils/apiLogger';
import { cacheAPI } from '../utils/cacheApiWrapper';

const API_URL = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');

const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('session_token');
    return token ? {'X-Session-ID': token} : {};
};

const handleSessionToken = (response: Response) => {
    const newToken = response.headers.get('X-Session-ID');
    if (newToken) {
        localStorage.setItem('session_token', newToken);
    }
};

// Generate cache key for scatter data query
const generateScatterCacheKey = (file1: string, file2: string, category: string): string => {
    return `scatter:${file1}:${file2}:${category}`;
};

const SCATTER_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

export const useScatterPlot = () => {
    const { scatterCache } = useGlobalCache();
    const [scatterPoints, setScatterPoints] = useState<ScatterPoint[]>([]);
    const [isScatterLoading, setIsScatterLoading] = useState(false);
    const [isScatterOpen, setIsScatterOpen] = useState(false);
    const [selectedPair, setSelectedPair] = useState<{
        file1: string | null;
        file2: string | null;
        category: string | null;
    }>({
        file1: null,
        file2: null,
        category: null,
    });

    const handleCellClick = async (file1: string, file2: string, category: string, startDate?: Date | null, endDate?: Date | null) => {
        setSelectedPair({file1, file2, category});
        setScatterPoints([]); // Clean old data
        setIsScatterLoading(true);
        setIsScatterOpen(true);

        try {
            const cacheKey = generateScatterCacheKey(file1, file2, category);
            
            // Check cache first (in-memory then cacheAPI)
            let cachedEntry = scatterCache.get(cacheKey);
            if (!cachedEntry) {
                try {
                    const cached = await cacheAPI.get<CacheEntry<ScatterPoint[]>>(cacheKey);
                    if (cached) {
                        cachedEntry = cached;
                    }
                } catch (e) {
                    console.warn('Failed to check cacheAPI for scatter:', e);
                }
            }
            
            if (cachedEntry && typeof cachedEntry.expiresAt === 'number' && cachedEntry.expiresAt > Date.now()) {
                // Use cached data
                setScatterPoints(cachedEntry.data);
                setIsScatterLoading(false);
                return;
            }

            const params = new URLSearchParams({
                filename1: file1,
                filename2: file2,
                category: category,
            });
            if (startDate) {
                params.append('start_date', startDate.toISOString());
            }
            if (endDate) {
                params.append('end_date', endDate.toISOString());
            }

            const startTime = Date.now();
            const response = await fetch(`${API_URL}/api/timeseries/scatter_data?${params}`, {
                headers: {
                    ...getAuthHeaders(),
                },
            });
            const duration = Date.now() - startTime;
            
            handleSessionToken(response);
            if (!response.ok) throw new Error("Failed to fetch scatter data");

            const data: ScatterPoint[] = await response.json();
            
            // Cache the result - both in-memory and in cacheAPI
            const cacheEntry: CacheEntry<ScatterPoint[]> = {
                data,
                timestamp: Date.now(),
                expiresAt: Date.now() + SCATTER_CACHE_DURATION,
                cacheKey,
            };
            scatterCache.set(cacheKey, cacheEntry);
            
            // Also persist to cacheAPI for cross-session access
            try {
                await cacheAPI.set(cacheKey, cacheEntry, SCATTER_CACHE_DURATION);
            } catch (e) {
                console.warn('Failed to cache scatter data in cacheAPI:', e);
            }

            // Log the successful query
            apiLogger.logQuery(`/api/timeseries/scatter_data`, 'GET', {
                params: { filename1: file1, filename2: file2, category },
                fromCache: false,
                status: response.status,
                duration,
                cacheKey,
            });

            setScatterPoints(data);
        } catch (err) {
            console.error(err);
            // Log the error
            apiLogger.logQuery(`/api/timeseries/scatter_data`, 'GET', {
                fromCache: false,
                status: 500,
                params: { filename1: file1, filename2: file2, category },
            });
        } finally {
            setIsScatterLoading(false);
        }
    };

    const handleCloseScatter = () => {
        setIsScatterOpen(false);
        setSelectedPair({file1: null, file2: null, category: null});
    };

    return {
        scatterPoints,
        isScatterLoading,
        isScatterOpen,
        selectedPair,
        handleCellClick,
        handleCloseScatter,
    };
};