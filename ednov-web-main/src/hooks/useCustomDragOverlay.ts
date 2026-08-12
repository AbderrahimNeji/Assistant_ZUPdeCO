import * as React from 'react';
import { useDndMonitor } from '@dnd-kit/core';

interface Position {
  x: number;
  y: number;
}

const OVERLAY_OFFSET_X = 12;
const OVERLAY_OFFSET_Y = 12;

/**
 * Hook pour positionner un overlay de drag avec position: fixed.
 * Ecoute pointermove et scroll pour garder l'overlay colle au curseur.
 */
export function useCustomDragOverlay(activeId: string | null) {
  const [position, setPosition] = React.useState<Position | null>(null);
  const rafRef = React.useRef<number | null>(null);

  useDndMonitor({
    onDragStart(event) {
      if (event.activatorEvent && 'clientX' in event.activatorEvent) {
        const e = event.activatorEvent as PointerEvent;
        setPosition({
          x: e.clientX + OVERLAY_OFFSET_X,
          y: e.clientY + OVERLAY_OFFSET_Y,
        });
      }
    },
    onDragEnd() {
      setPosition(null);
    },
    onDragCancel() {
      setPosition(null);
    },
  });

  React.useEffect(() => {
    if (!activeId) setPosition(null);
  }, [activeId]);

  const updateFromPointer = React.useCallback((clientX: number, clientY: number) => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      setPosition({ x: clientX + OVERLAY_OFFSET_X, y: clientY + OVERLAY_OFFSET_Y });
      rafRef.current = null;
    });
  }, []);

  React.useEffect(() => {
    if (!activeId) return;

    const handlePointerMove = (e: PointerEvent) => {
      updateFromPointer(e.clientX, e.clientY);
    };

    document.addEventListener('pointermove', handlePointerMove, { capture: true });

    return () => {
      document.removeEventListener('pointermove', handlePointerMove, { capture: true });
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [activeId, updateFromPointer]);

  return position;
}
