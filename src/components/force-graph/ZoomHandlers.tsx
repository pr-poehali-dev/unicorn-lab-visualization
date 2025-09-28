import { useCallback, useRef } from 'react';

interface ZoomHandlersProps {
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
  drawGraph: () => void;
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
}

export function useZoomHandlers({
  panRef,
  zoomRef,
  drawGraph,
  setZoom,
  setPan
}: ZoomHandlersProps) {
  const zoomAnimationFrame = useRef<number | null>(null);
  const panAnimationFrame = useRef<number | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const delta = e.deltaY < 0 ? 1.05 : 0.95;
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * delta));
    
    const zoomRatio = newZoom / zoomRef.current;
    const newPan = {
      x: mouseX - (mouseX - panRef.current.x) * zoomRatio,
      y: mouseY - (mouseY - panRef.current.y) * zoomRatio
    };
    
    zoomRef.current = newZoom;
    panRef.current = newPan;
    
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    drawGraph();
    
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
      setPan(newPan);
    });
  }, [drawGraph, panRef, zoomRef, setZoom, setPan]);

  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoomRef.current * 1.15, 3);
    zoomRef.current = newZoom;
    
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    drawGraph();
    
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
    });
  }, [drawGraph, zoomRef, setZoom]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoomRef.current / 1.15, 0.3);
    zoomRef.current = newZoom;
    
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    drawGraph();
    
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
    });
  }, [drawGraph, zoomRef, setZoom]);

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    if (panAnimationFrame.current) {
      cancelAnimationFrame(panAnimationFrame.current);
    }
    
    drawGraph();
    
    requestAnimationFrame(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    });
  }, [drawGraph, panRef, zoomRef, setZoom, setPan]);

  return {
    handleWheel,
    zoomIn,
    zoomOut,
    resetView
  };
}