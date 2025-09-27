import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ForceGraphProps } from './force-graph/types';
import { SimulationNode, NodePosition } from './force-graph/types';
import { GraphRenderer } from './force-graph/GraphRenderer';
import { useSimulation } from './force-graph/useSimulation';
import { useNodeInteractions } from './force-graph/useNodeInteractions';
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

  // Состояния для хранения hoveredNode и draggedNode
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);

  // Хук для управления размерами canvas
  const dimensions = useCanvasResize({ containerRef, canvasRef, simulationRef });

  // Функция отрисовки графа
  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    GraphRenderer.draw({
      ctx,
      dimensions,
      simNodes: nodesRef.current,
      edges,
      selectedCluster,
      clusterColors,
      hoveredNode,
      draggedNode,
      simulationRef
    });
  }, [selectedCluster, dimensions, edges, clusterColors, hoveredNode, draggedNode]);

  // Хук для управления симуляцией
  useSimulation({
    nodes,
    edges,
    dimensions,
    nodesRef,
    nodePositionsRef,
    animationFrameRef,
    drawGraph
  });

  // Хук для управления взаимодействием с узлами
  const interactions = useNodeInteractions({
    canvasRef,
    nodesRef,
    simulationRef,
    nodePositionsRef,
    selectedCluster,
    onNodeClick
  });

  // Синхронизация состояний из хука взаимодействий
  useEffect(() => {
    setHoveredNode(interactions.hoveredNode);
  }, [interactions.hoveredNode]);

  useEffect(() => {
    setDraggedNode(interactions.draggedNode);
  }, [interactions.draggedNode]);

  // Метод для сброса всех фиксированных позиций
  const resetNodePositions = useCallback(() => {
    const simNodes = nodesRef.current;
    simNodes.forEach(node => {
      node.fx = null;
      node.fy = null;
    });
    
    // Очищаем сохраненные позиции
    nodePositionsRef.current.clear();
    
    // Перезапускаем симуляцию с большей энергией для перестроения графа
    if (simulationRef.current) {
      simulationRef.current
        .alpha(1) // Полная энергия для полного перестроения
        .restart();
    }
  }, []);

  // Expose метод через ref
  React.useImperativeHandle(ref, () => ({
    resetNodePositions
  }), [resetNodePositions]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <ForceGraphCanvas
        canvasRef={canvasRef}
        dimensions={dimensions}
        handleMouseDown={interactions.handleMouseDown}
        handleMouseMove={interactions.handleMouseMove}
        handleMouseUp={interactions.handleMouseUp}
        handleMouseLeave={interactions.handleMouseLeave}
      />
    </div>
  );
});

ForceGraph.displayName = 'ForceGraph';

export default ForceGraph;