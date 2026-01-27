import { useEffect, useRef } from "react";

/**
 * Custom hook for handling chart interactions and error prevention.
 */

export const useChartInteractions = (
    setVisibleMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
) => {
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Legend click handler (bez zmian z poprzedniego kroku)
    const handleLegendClick = (event: any) => {
        if (!event || !event.data || typeof event.curveNumber !== 'number') return false;
        const fullKey = event.data[event.curveNumber]?.meta;
        if (!fullKey) return false;
        setVisibleMap(prev => ({ ...prev, [fullKey]: !(prev[fullKey] ?? true) }));
        return false;
    };

    // Native listeners (bez zmian)
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
        // Lista fraz błędów do ignorowania
        const IGNORED_ERRORS = [
            '_hoverlayer',
            'plotly',
            'unhover',
            'unhoverRaw',
            'selectAll',
            'select',
            'Cannot read properties of undefined',
            '_calcInverseTransform',
            'calcInverseTransform'
        ];

        const shouldSuppress = (msg: string, stack: string) => {
            return IGNORED_ERRORS.some(err =>
                msg.includes(err) || stack.includes(err) || new RegExp(err, 'i').test(msg)
            );
        };

        const onUnhandledRejection = (ev: PromiseRejectionEvent) => {
            const reason = ev.reason as any;
            const msg = reason?.message || reason?.toString() || '';
            const stack = reason?.stack || '';

            if (shouldSuppress(msg, stack)) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                // console.warn('Suppressed Plotly Promise Error:', msg); // Opcjonalnie do debugowania
            }
        };

        const onWindowError = (ev: ErrorEvent) => {
            const msg = ev.message || '';
            const stack = ev.error?.stack || '';

            if (shouldSuppress(msg, stack)) {
                ev.preventDefault();
                ev.stopImmediatePropagation();
                // console.warn('Suppressed Plotly Runtime Error:', msg); // Opcjonalnie do debugowania
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