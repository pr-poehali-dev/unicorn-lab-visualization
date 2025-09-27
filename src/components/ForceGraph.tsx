import React, { useRef, useCallback, useEffect } from 'react';
import { ForceGraphProps } from './force-graph/types';
import { useSimulation } from './force-graph/useSimulation';
import { useGraphInteractions } from './force-graph/useGraphInteractions';
import { useCanvasResize } from './force-graph/useCanvasResize';
import { GraphRenderer } from './force-graph/GraphRenderer';

const ForceGraph = React.forwardRef<any, ForceGraphProps>(({ 
  nodes, 
  edges, 
  onNodeClick, 
  selectedCluster, 
  clusterColors 
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; fx: number | null; fy: number | null }>>(new Map());
  const tempSimulationRef = useRef<any>(null);

  const dimensions = useCanvasResize({ containerRef, canvasRef, simulationRef: tempSimulationRef });

  // Сначала определяем временные переменные для циклических зависимостей
  let hoveredNode: string | null = null;
  let draggedNode: any = null;

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
      simulationRef: tempSimulationRef,
      selectedCluster,
      clusterColors,
      hoveredNode,
      draggedNode
    });
  }, [dimensions, edges, selectedCluster, clusterColors, hoveredNode, draggedNode]);

  const onTick = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(() => {
      drawGraph();
    });
  }, [drawGraph]);

  const { simulationRef, nodesRef, resetNodePositions } = useSimulation({
    nodes,
    edges,
    dimensions,
    nodePositionsRef,
    onTick
  });

  // Синхронизируем ссылки на симуляцию
  useEffect(() => {
    tempSimulationRef.current = simulationRef.current;
  }, [simulationRef]);

  const interactions = useGraphInteractions({
    canvasRef,
    nodesRef,
    simulationRef,
    nodePositionsRef,
    selectedCluster,
    onNodeClick
  });

  // Присваиваем реальные значения
  hoveredNode = interactions.hoveredNode;
  draggedNode = interactions.draggedNode;

  // Expose метод через ref
  React.useImperativeHandle(ref, () => ({
    resetNodePositions
  }), [resetNodePositions]);

  // Перерисовка при изменении hoveredNode или draggedNode
  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  // Очистка animation frame при размонтировании
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

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
        onMouseDown={interactions.handleMouseDown}
        onMouseMove={interactions.handleMouseMove}
        onMouseUp={interactions.handleMouseUp}
        onMouseLeave={interactions.handleMouseLeave}
      />
    </div>
  );
});

ForceGraph.displayName = 'ForceGraph';

export default ForceGraph;