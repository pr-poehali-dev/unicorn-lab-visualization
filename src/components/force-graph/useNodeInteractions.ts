import { useCallback, useState, useRef } from 'react';
import { SimulationNode, NodePosition } from './types';
import { Entrepreneur } from '@/types/entrepreneur';

interface UseNodeInteractionsProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  nodesRef: React.RefObject<SimulationNode[]>;
  simulationRef: React.RefObject<any>;
  nodePositionsRef: React.MutableRefObject<Map<string, NodePosition>>;
  selectedCluster?: string | null;
  onNodeClick: (node: Entrepreneur, position: { x: number, y: number }) => void;
}

export function useNodeInteractions({
  canvasRef,
  nodesRef,
  simulationRef,
  nodePositionsRef,
  selectedCluster,
  onNodeClick
}: UseNodeInteractionsProps) {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    // Получаем узлы напрямую из симуляции
    const simulation = simulationRef.current;
    if (!simulation) return null;
    
    const simNodes = simulation.nodes();
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      return distance < 45;
    }) || null;
  }, [selectedCluster, simulationRef]);

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
      // Фиксируем узел на его текущей позиции, а не на позиции мыши
      node.fx = node.x;
      node.fy = node.y;
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
      // Обновляем позицию узла напрямую
      draggedNode.x = x;
      draggedNode.y = y;
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
          // fx и fy уже установлены во время перетаскивания
          // Просто сохраняем финальную позицию
          nodePositionsRef.current.set(draggedNode.id, { 
            x: draggedNode.x, 
            y: draggedNode.y,
            fx: draggedNode.fx,
            fy: draggedNode.fy
          });
        }
      }

      setDraggedNode(null);
      dragStartPosRef.current = null;
      // Важно: alpha(0) останавливает симуляцию, сохраняя фиксированные позиции
      simulationRef.current?.alphaTarget(0).restart();
    }
  }, [draggedNode, onNodeClick, canvasRef, simulationRef, nodePositionsRef]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    if (draggedNode) {
      // При выходе за пределы canvas сохраняем позицию
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
  }, [draggedNode, nodePositionsRef, simulationRef]);

  return {
    hoveredNode,
    draggedNode,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave
  };
}