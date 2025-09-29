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
      panStartPos.current = { x: e.clientX, y: e.clientY };
    }
  }, [getNodeAtPosition, setDraggedNode, panRef, zoomRef, simulationRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current && panStartPos.current) {
      const deltaX = e.clientX - panStartPos.current.x;
      const deltaY = e.clientY - panStartPos.current.y;
      
      // Обновляем panRef напрямую для мгновенного отклика
      panRef.current = {
        x: panRef.current.x + deltaX,
        y: panRef.current.y + deltaY
      };
      
      // Синхронизируем со стейтом
      setPan({ ...panRef.current });
      
      // Обновляем startPos для следующего движения
      panStartPos.current = { x: e.clientX, y: e.clientY };
      
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

  // Touch handlers for mobile
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return; // Only handle single touch
    
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
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
      panStartPos.current = { x: touch.clientX, y: touch.clientY };
    }
  }, [getNodeAtPosition, setDraggedNode, panRef, zoomRef, simulationRef]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length !== 1) return;
    
    // Prevent default to stop Telegram Mini App from closing on swipe down
    e.preventDefault();
    e.stopPropagation();
    
    const touch = e.touches[0];
    
    if (isPanning.current && panStartPos.current) {
      const deltaX = touch.clientX - panStartPos.current.x;
      const deltaY = touch.clientY - panStartPos.current.y;
      
      // Обновляем panRef напрямую для мгновенного отклика
      panRef.current = {
        x: panRef.current.x + deltaX,
        y: panRef.current.y + deltaY
      };
      
      // Синхронизируем со стейтом
      setPan({ ...panRef.current });
      
      // Обновляем startPos для следующего движения
      panStartPos.current = { x: touch.clientX, y: touch.clientY };
      
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const transformedX = (x - panRef.current.x) / zoomRef.current;
    const transformedY = (y - panRef.current.y) / zoomRef.current;

    if (draggedNode) {
      draggedNode.x = transformedX;
      draggedNode.y = transformedY;
      draggedNode.fx = transformedX;
      draggedNode.fy = transformedY;
      simulationRef.current?.alpha(0.3).restart();
    }
  }, [draggedNode, drawGraph, panRef, zoomRef, setPan, simulationRef]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      panStartPos.current = null;
      return;
    }
    
    if (draggedNode && dragStartPosRef.current) {
      // For touch, we'll consider it a click if the user didn't drag much
      const rect = e.currentTarget.getBoundingClientRect();
      const touch = e.changedTouches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;
      
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

  return {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseEnter,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
}