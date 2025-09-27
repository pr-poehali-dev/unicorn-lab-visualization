import { useState, useCallback, useRef } from 'react';
import { SimulationNode } from './types';
import { Entrepreneur } from '@/types/entrepreneur';

interface UseGraphInteractionsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nodesRef: React.MutableRefObject<SimulationNode[]>;
  simulationRef: React.MutableRefObject<any>;
  nodePositionsRef: React.MutableRefObject<Map<string, { x: number; y: number; fx: number | null; fy: number | null }>>;
  selectedCluster?: string | null;
  onNodeClick: (node: Entrepreneur, position: { x: number, y: number }) => void;
}

export function useGraphInteractions({
  canvasRef,
  nodesRef,
  simulationRef,
  nodePositionsRef,
  selectedCluster,
  onNodeClick
}: UseGraphInteractionsProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    const simNodes = nodesRef.current;
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      return distance < 45;
    }) || null;
  }, [selectedCluster, nodesRef]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = getNodeAtPosition(x, y);
    if (node) {
      setDraggedNode(node);
      dragStartPosRef.current = { x, y };
      node.fx = x;
      node.fy = y;
      simulationRef.current?.alpha(0.3).restart();
    }
  }, [getNodeAtPosition, canvasRef, simulationRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggedNode) {
      draggedNode.fx = x;
      draggedNode.fy = y;
      simulationRef.current?.alpha(0.3).restart();
    } else {
      const node = getNodeAtPosition(x, y);
      setHoveredNode(node?.id || null);
      canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  }, [draggedNode, getNodeAtPosition, canvasRef, simulationRef]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedNode && dragStartPosRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // Проверяем расстояние от начальной позиции мыши
        const distance = Math.sqrt(
          Math.pow(dragStartPosRef.current.x - x, 2) + 
          Math.pow(dragStartPosRef.current.y - y, 2)
        );
        
        // Если мышь не двигалась (или двигалась мало), это клик
        if (distance < 5) {
          const globalX = rect.left + draggedNode.x;
          const globalY = rect.top + draggedNode.y;
          onNodeClick(draggedNode.data, { x: globalX, y: globalY });
        } else {
          // Это было перетаскивание - фиксируем позицию
          draggedNode.fx = draggedNode.x;
          draggedNode.fy = draggedNode.y;
          nodePositionsRef.current.set(draggedNode.id, { 
            x: draggedNode.x, 
            y: draggedNode.y,
            fx: draggedNode.x,
            fy: draggedNode.y
          });
        }
      }

      setDraggedNode(null);
      dragStartPosRef.current = null;
      simulationRef.current?.alpha(0).restart();
    }
  }, [draggedNode, onNodeClick, canvasRef, simulationRef, nodePositionsRef]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    if (draggedNode) {
      // При выходе за пределы canvas фиксируем позицию
      draggedNode.fx = draggedNode.x;
      draggedNode.fy = draggedNode.y;
      nodePositionsRef.current.set(draggedNode.id, { 
        x: draggedNode.x, 
        y: draggedNode.y,
        fx: draggedNode.x,
        fy: draggedNode.y
      });
      setDraggedNode(null);
      dragStartPosRef.current = null;
    }
  }, [draggedNode, nodePositionsRef]);

  return {
    hoveredNode,
    draggedNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  };
}