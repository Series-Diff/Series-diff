import {useState} from 'react';
import type {ScatterPoint} from '../components';

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


export const useScatterPlot = () => {
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

    const handleCellClick = async (file1: string, file2: string, category: string) => {
        setSelectedPair({file1, file2, category});
        setScatterPoints([]); // Clean old data
        setIsScatterLoading(true);
        setIsScatterOpen(true);

        try {
            const params = new URLSearchParams({
                filename1: file1,
                filename2: file2,
                category: category,
            });

            const response = await fetch(`${API_URL}/api/timeseries/scatter_data?${params}`, {
                headers: {
                    ...getAuthHeaders(),
                },
            });
            handleSessionToken(response);
            if (!response.ok) throw new Error("Failed to fetch scatter data");

            const data: ScatterPoint[] = await response.json();
            setScatterPoints(data);
        } catch (err) {
            console.error(err);
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