import { useCallback, useRef, useEffect } from 'react';
import { SimulationNode } from './types';

interface MouseHandlersProps {
  getNodeAtPosition: (x: number, y: number) => SimulationNode | null;
  onNodeClick: (node: any, position: { x: number; y: number }) => void;
  simulationRef: React.MutableRefObject<any>;
  nodePositionsRef: React.MutableRefObject<Map<string, any>>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  zoomRef: React.MutableRefObject<number>;
  drawGraph: () => void;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  draggedNode: SimulationNode | null;
  setDraggedNode: (node: SimulationNode | null) => void;
  setPan: (pan: { x: number; y: number }) => void;
}

export function useMouseHandlers({
  getNodeAtPosition,
  onNodeClick,
  simulationRef,
  nodePositionsRef,
  panRef,
  zoomRef,
  drawGraph,
  hoveredNodeId,
  setHoveredNodeId,
  draggedNode,
  setDraggedNode,
  setPan
}: MouseHandlersProps) {
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseInsideRef = useRef(false);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStartPos = useRef<{ x: number; y: number } | null>(null);
  const panAnimationFrame = useRef<number | null>(null);
  const lastMoveTime = useRef<number>(0);
  const moveThrottle = 16; // ~60fps

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const transformedX = (x - panRef.current.x) / zoomRef.current;
    const transformedY = (y - panRef.current.y) / zoomRef.current;

    const node = getNodeAtPosition(transformedX, transformedY);
    if (node) {
      setDraggedNode(node);
      dragStartPosRef.current = { x, y };
      node.fx = node.x;
      node.fy = node.y;
      simulationRef.current?.alpha(0.3).restart();
    } else {
      isPanning.current = true;
      panStartPos.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  }, [getNodeAtPosition, setDraggedNode, panRef, zoomRef, simulationRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    // Throttle mousemove events for better performance in Safari
    const now = performance.now();
    if (now - lastMoveTime.current < moveThrottle) {
      return;
    }
    lastMoveTime.current = now;

    if (isPanning.current) {
      panRef.current = {
        x: e.clientX - panStartPos.current!.x,
        y: e.clientY - panStartPos.current!.y
      };
      
      if (panAnimationFrame.current) {
        cancelAnimationFrame(panAnimationFrame.current);
      }
      
      drawGraph();
      
      panAnimationFrame.current = requestAnimationFrame(() => {
        setPan({ ...panRef.current });
      });
      
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const transformedX = (x - panRef.current.x) / zoomRef.current;
    const transformedY = (y - panRef.current.y) / zoomRef.current;
    
    mousePosRef.current = { x: transformedX, y: transformedY };
    isMouseInsideRef.current = true;

    if (draggedNode) {
      draggedNode.x = transformedX;
      draggedNode.y = transformedY;
      draggedNode.fx = transformedX;
      draggedNode.fy = transformedY;
      simulationRef.current?.alpha(0.3).restart();
    } else {
      const node = getNodeAtPosition(transformedX, transformedY);
      const nodeId = node?.id || null;
      if (nodeId !== hoveredNodeId) {
        setHoveredNodeId(nodeId);
      }
    }
  }, [draggedNode, getNodeAtPosition, hoveredNodeId, drawGraph, panRef, zoomRef, setPan, setHoveredNodeId, simulationRef]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      panStartPos.current = null;
      if (panAnimationFrame.current) {
        cancelAnimationFrame(panAnimationFrame.current);
        panAnimationFrame.current = null;
      }
      setPan({ ...panRef.current });
      return;
    }
    
    if (draggedNode && dragStartPosRef.current) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const distance = Math.sqrt(
        Math.pow(dragStartPosRef.current.x - x, 2) + 
        Math.pow(dragStartPosRef.current.y - y, 2)
      );
      
      if (distance < 5) {
        const globalX = rect.left + draggedNode.x * zoomRef.current + panRef.current.x;
        const globalY = rect.top + draggedNode.y * zoomRef.current + panRef.current.y;
        onNodeClick(draggedNode.data, { x: globalX, y: globalY });
      } else {
        nodePositionsRef.current.set(draggedNode.id, { 
          x: draggedNode.x, 
          y: draggedNode.y,
          fx: draggedNode.fx,
          fy: draggedNode.fy
        });
      }

      setDraggedNode(null);
      dragStartPosRef.current = null;
      simulationRef.current?.alphaTarget(0).restart();
    }
  }, [draggedNode, onNodeClick, panRef, zoomRef, setPan, setDraggedNode, nodePositionsRef, simulationRef]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      return;
    }
    
    isMouseInsideRef.current = false;
    mousePosRef.current = { x: -1, y: -1 };
    setHoveredNodeId(null);
    
    if (draggedNode) {
      nodePositionsRef.current.set(draggedNode.id, { 
        x: draggedNode.x, 
        y: draggedNode.y,
        fx: draggedNode.fx,
        fy: draggedNode.fy
      });
      
      setDraggedNode(null);
      dragStartPosRef.current = null;
      simulationRef.current?.alphaTarget(0).restart();
    }
  }, [draggedNode, setHoveredNodeId, setDraggedNode, nodePositionsRef, simulationRef]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    isMouseInsideRef.current = true;
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);

  // Проверка hover состояния
  useEffect(() => {
    let rafId: number;
    let isActive = true;
    
    const checkHover = () => {
      if (!isActive) return;
      
      if (!simulationRef.current) {
        rafId = requestAnimationFrame(checkHover);
        return;
      }
      
      if (isMouseInsideRef.current && !draggedNode) {
        const { x, y } = mousePosRef.current;
        if (x >= 0 && y >= 0) {
          const node = getNodeAtPosition(x, y);
          const nodeId = node?.id || null;
          
          if (nodeId !== hoveredNodeId) {
            setHoveredNodeId(nodeId);
          }
        }
      } else if (!isMouseInsideRef.current && hoveredNodeId) {
        setHoveredNodeId(null);
      }
      
      rafId = requestAnimationFrame(checkHover);
    };
    
    const timeoutId = setTimeout(() => {
      rafId = requestAnimationFrame(checkHover);
    }, 100);
    
    return () => {
      isActive = false;
      clearTimeout(timeoutId);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [hoveredNodeId, draggedNode, getNodeAtPosition, setHoveredNodeId, simulationRef]);

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseEnter
  };
}