import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ForceGraphProps } from './force-graph/types';
import { SimulationNode, NodePosition } from './force-graph/types';
import { GraphRenderer } from './force-graph/GraphRenderer';
import { useSimulation } from './force-graph/useSimulation';
import { useCanvasResize } from './force-graph/useCanvasResize';
import { ForceGraphCanvas } from './force-graph/ForceGraphCanvas';

const ForceGraph = React.forwardRef<any, ForceGraphProps>(({ 
  nodes, 
  edges, 
  onNodeClick, 
  selectedCluster, 
  clusterColors 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const nodePositionsRef = useRef<Map<string, NodePosition>>(new Map());
  const simulationRef = useRef<any>(null);
  
  // Состояния для интерактивности
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const isMouseInsideRef = useRef(false);
  const currentMousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Хук для управления размерами canvas
  const dimensions = useCanvasResize({ containerRef, canvasRef, simulationRef });

  // Функция поиска узла по координатам
  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    if (!simulationRef.current) return null;
    
    const simNodes = simulationRef.current.nodes();
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      return distance <= 40;
    }) || null;
  }, [selectedCluster]);

  // Функция отрисовки графа
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const simNodes = simulationRef.current ? simulationRef.current.nodes() : nodesRef.current;

    GraphRenderer.draw({
      ctx,
      dimensions,
      simNodes,
      edges,
      selectedCluster,
      clusterColors,
      hoveredNode: hoveredNodeId,
      draggedNode,
      simulationRef
    });
  }, [selectedCluster, dimensions, edges, clusterColors, hoveredNodeId, draggedNode]);

  // Хук для управления симуляцией
  const simulation = useSimulation({
    nodes,
    edges,
    dimensions,
    nodePositionsRef,
    onTick: drawGraph
  });

  // Обновляем ссылки
  simulationRef.current = simulation.simulationRef.current;
  nodesRef.current = simulation.nodesRef.current;

  // Функция обновления hover состояния
  const updateHoverState = useCallback(() => {
    if (!isMouseInsideRef.current || draggedNode) {
      if (hoveredNodeId !== null) {
        setHoveredNodeId(null);
      }
      return;
    }

    const { x, y } = currentMousePosRef.current;
    const node = getNodeAtPosition(x, y);
    const nodeId = node?.id || null;

    if (nodeId !== hoveredNodeId) {
      setHoveredNodeId(nodeId);
    }
  }, [getNodeAtPosition, hoveredNodeId, draggedNode]);

  // Обработчики событий мыши
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
      node.fx = node.x;
      node.fy = node.y;
      simulationRef.current?.alpha(0.3).restart();
    }
  }, [getNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    currentMousePosRef.current = { x, y };
    isMouseInsideRef.current = true;

    if (draggedNode) {
      draggedNode.x = x;
      draggedNode.y = y;
      draggedNode.fx = x;
      draggedNode.fy = y;
      simulationRef.current?.alpha(0.3).restart();
    } else {
      updateHoverState();
      const node = getNodeAtPosition(x, y);
      canvas.style.cursor = node ? 'pointer' : 'grab';
    }
  }, [draggedNode, getNodeAtPosition, updateHoverState]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggedNode && dragStartPosRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        const distance = Math.sqrt(
          Math.pow(dragStartPosRef.current.x - x, 2) + 
          Math.pow(dragStartPosRef.current.y - y, 2)
        );
        
        if (distance < 5) {
          const globalX = rect.left + draggedNode.x;
          const globalY = rect.top + draggedNode.y;
          onNodeClick(draggedNode.data, { x: globalX, y: globalY });
        } else {
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
      simulationRef.current?.alphaTarget(0).restart();
    }
  }, [draggedNode, onNodeClick]);

  const handleMouseLeave = useCallback(() => {
    isMouseInsideRef.current = false;
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
    
    if (canvasRef.current) {
      canvasRef.current.style.cursor = 'grab';
    }
  }, [draggedNode]);

  const handleMouseEnter = useCallback(() => {
    isMouseInsideRef.current = true;
  }, []);

  // Интервал для проверки hover состояния
  useEffect(() => {
    const interval = setInterval(() => {
      if (isMouseInsideRef.current && !draggedNode) {
        updateHoverState();
      }
    }, 50); // Проверяем каждые 50мс

    return () => clearInterval(interval);
  }, [updateHoverState, draggedNode]);

  // Метод для сброса всех фиксированных позиций
  const resetNodePositions = useCallback(() => {
    if (simulationRef.current) {
      const simNodes = simulationRef.current.nodes();
      simNodes.forEach(node => {
        node.fx = null;
        node.fy = null;
      });
      
      nodePositionsRef.current.clear();
      
      simulationRef.current
        .alpha(1)
        .restart();
    }
  }, []);

  React.useImperativeHandle(ref, () => ({
    resetNodePositions
  }), [resetNodePositions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        style={{
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          display: 'block'
        }}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
      />
    </div>
  );
});

ForceGraph.displayName = 'ForceGraph';

export default ForceGraph;