import { useState, useEffect } from 'react';

const COMPACT_BREAKPOINT = 1650;

/**
 * Hook to detect if the UI should be in compact mode based on window width.
 * Compact mode is enabled when window width is less than 1650px.
 */
export const useCompactMode = () => {
    const [windowWidth, setWindowWidth] = useState(
        typeof window !== 'undefined' ? window.innerWidth : COMPACT_BREAKPOINT + 1
    );

    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const isCompact = windowWidth < COMPACT_BREAKPOINT;

    return { isCompact, windowWidth };
};

/** Style values for ControlsPanel based on compact mode */
export interface ControlsPanelStyles {
    containerGap: string;
    containerPadding: string;
    containerMinHeight: string;
    textClass: string;
    selectGap: string;
    buttonSize: 'sm' | undefined;
    inputMaxWidth: string;
    datePickerMinWidth: number;
}

export const getControlsPanelStyles = (isCompact: boolean): ControlsPanelStyles => ({
    containerGap: isCompact ? 'gap-1' : 'gap-2',
    containerPadding: isCompact ? 'px-2 py-2' : 'px-3 py-2',
    containerMinHeight: isCompact ? '84px' : '100px',
    textClass: isCompact ? 'small' : '',
    selectGap: isCompact ? 'gap-1' : 'gap-2',
    buttonSize: isCompact ? 'sm' : undefined,
    inputMaxWidth: isCompact ? '70px' : '80px',
    datePickerMinWidth: isCompact ? 140 : 180,
});

/** Style values for Select component based on compact mode */
export interface SelectStyles {
    width: string;
    size: 'sm' | undefined;
    labelMargin: string;
    textClass: string;
    labelClass: string;
}

export const getSelectStyles = (isCompact: boolean): SelectStyles => ({
    width: isCompact ? '180px' : '224px',
    size: isCompact ? 'sm' : undefined,
    labelMargin: isCompact ? 'mb-1' : 'mb-2',
    textClass: isCompact ? 'small' : '',
    labelClass: isCompact ? 'text-muted fw-semibold' : '',
});

export default useCompactMode;
