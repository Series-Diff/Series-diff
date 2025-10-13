import { useEffect, useRef } from "react";

/**
 * Custom hook for handling chart interactions and error prevention.
 * 
 * Manages:
 * - Legend clicks for toggling visibility.
 * - Native event listeners to intercept unsupported mouse+keyboard combinations.
 * - Global error handlers to suppress Plotly-specific runtime errors.
 * 
 * Parameters:
 * - setVisibleMap: Setter for updating trace visibility.
 * 
 * Returns handlers and ref for the container.
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
        setVisibleMap(prev => ({ ...prev, [name]: !(prev[name] ?? true) }));
        return false;
    };

    // Native listeners for intercepting unsupported interactions
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const isAllowedPointerDown = (ev: PointerEvent) => {
            const isLeft = ev.button === 0;
            if (isLeft && !ev.ctrlKey && !ev.altKey && !ev.metaKey) return true;
            if (isLeft && ev.shiftKey) return true;
            return false;
        };

        const onPointerDown = (ev: PointerEvent) => {
            if (!isAllowedPointerDown(ev)) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
            }
        };

        const onContextMenu = (ev: Event) => {
            ev.preventDefault();
            ev.stopImmediatePropagation();
        };

        container.addEventListener('pointerdown', onPointerDown as EventListener, { capture: true });
        container.addEventListener('contextmenu', onContextMenu as EventListener, { capture: true });
        return () => {
            container.removeEventListener('pointerdown', onPointerDown as EventListener, { capture: true } as any);
            container.removeEventListener('contextmenu', onContextMenu as EventListener, { capture: true } as any);
        };
    }, []);

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