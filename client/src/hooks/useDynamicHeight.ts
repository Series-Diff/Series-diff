import { useEffect, useState, useCallback, type RefObject } from 'react';

/**
 * Hook that calculates dynamic height for an element based on its position
 * Height = viewport height - navigation height - controls height - 3 * section-margin
 * Recalculates on initial render, window resize, and when dependencies change
 */
export function useDynamicHeight<T extends HTMLElement>(
    ref: RefObject<T | null>,
    recalculateDeps: unknown[] = []
): number | undefined {
    const [height, setHeight] = useState<number | undefined>(undefined);

    const calculateHeight = useCallback(() => {
        if (!ref.current) return;

        const viewportHeight = window.innerHeight;
        
        // Get CSS variable --section-margin from root
        const rootStyles = getComputedStyle(document.documentElement);
        const sectionMargin = parseFloat(rootStyles.getPropertyValue('--section-margin')) || 16;
        
        // Get navigation height
        const navElement = document.querySelector('.navigation-menu');
        const navHeight = navElement ? navElement.getBoundingClientRect().height : 0;
        
        // Get controls panel height (the immediate previous sibling of chart container)
        const controlsPanel = ref.current.previousElementSibling;
        const controlsHeight = controlsPanel ? controlsPanel.getBoundingClientRect().height : 0;
        
        // Get section-container padding (default 16px each side = 32px total)
        const containerPadding = 32;
        
        // Calculate: viewport - nav - controls - 3 * section-margin - container padding
        // 3x section-margin: top margin of main, gap between controls and chart, bottom margin
        const calculatedHeight = viewportHeight - navHeight - controlsHeight - (3 * sectionMargin) - containerPadding;
        const minHeight = 320; // avoid shrinking below a reasonable chart height
        const finalHeight = Math.max(calculatedHeight, minHeight);

        // Only set if it's a positive value
        if (finalHeight > 0) {
            setHeight(finalHeight);
        }
    }, [ref]);

    useEffect(() => {
        // Initial calculation with slight delay to ensure DOM is ready
        const timeoutId = setTimeout(calculateHeight, 0);
        
        // Also calculate after a longer delay to catch late layout changes
        const secondTimeoutId = setTimeout(calculateHeight, 100);

        // Recalculate on window resize
        window.addEventListener('resize', calculateHeight);

        return () => {
            clearTimeout(timeoutId);
            clearTimeout(secondTimeoutId);
            window.removeEventListener('resize', calculateHeight);
        };
    }, [calculateHeight]);

    // Recalculate when dependencies change (e.g., when data loads)
    useEffect(() => {
        // Use requestAnimationFrame to ensure DOM has updated
        const rafId = requestAnimationFrame(() => {
            calculateHeight();
        });
        return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [calculateHeight, ...recalculateDeps]);

    return height;
}

export default useDynamicHeight;
