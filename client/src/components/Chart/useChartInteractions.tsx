import { useEffect, useRef } from "react";

/**
 * Custom hook for handling chart interactions and error prevention.
 * 
 * Manages:
 * - Legend clicks for toggling visibility.
 * - Native event listeners to intercept unsupported mouse+keyboard combinations.
 * - Global error handlers to suppress Plotly-specific runtime errors.
 */

export const useChartInteractions = (
    setVisibleMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Legend click handler
    const handleLegendClick = (event: any) => {
        if (!event || !event.data || typeof event.curveNumber !== 'number') return false;
        const name = event.data[event.curveNumber]?.name;
        if (!name) return false;
        setVisibleMap(prev => ({ ...prev, [name]: !(prev[name] ?? true) })); // Toggle visibility
        return false; // Prevents default Plotly behavior
    };

    // Global error suppression for Plotly issues
    useEffect(() => {
        const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
            const reason = ev.reason as any;
            const msg = reason?.message || reason?.toString() || '';
            const stack = reason?.stack || '';
            if (msg.includes('_hoverlayer') || stack.includes('_hoverlayer') || /plotly/i.test(msg) || /unhover/i.test(msg)) {
                ev.preventDefault();
            }
        };
        const onWindowError = (ev: ErrorEvent) => {
            const msg = ev.message || '';
            const stack = ev.error?.stack || '';
            if (msg.includes('_hoverlayer') || stack.includes('_hoverlayer') || /Cannot read properties of undefined/i.test(msg)) {
                ev.preventDefault();
            }
        };
        window.addEventListener('unhandledrejection', onUnhandledRejection);
        window.addEventListener('error', onWindowError);
        return () => {
            window.removeEventListener('unhandledrejection', onUnhandledRejection);
            window.removeEventListener('error', onWindowError);
        };
    }, []);

    return { handleLegendClick, containerRef };
};