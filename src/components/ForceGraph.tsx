import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ForceGraphProps } from './force-graph/types';
import { SimulationNode } from './force-graph/types';
import { GraphRenderer } from './force-graph/GraphRenderer';
import { useSimulation } from './force-graph/useSimulation';
import { useCanvasResize } from './force-graph/useCanvasResize';
import { GraphCanvas } from './force-graph/GraphCanvas';
import { useMouseHandlers } from './force-graph/MouseHandlers';
import { useZoomHandlers } from './force-graph/ZoomHandlers';
import { useNodeUtils } from './force-graph/NodeUtils';

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
  const nodePositionsRef = useRef<Map<string, any>>(new Map());
  const simulationRef = useRef<any>(null);
  
  // Состояния для интерактивности
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  
  // Состояние для zoom и pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);

  // Хук для управления размерами canvas
  const dimensions = useCanvasResize({ containerRef, canvasRef, simulationRef });
  
  // Синхронизируем panRef и zoomRef с состояниями
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

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
      simulationRef,
      zoom: zoomRef.current,
      pan: panRef.current
    });
  }, [dimensions, edges, clusterColors, hoveredNodeId, draggedNode]);

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
  
  // Форсируем перерисовку после загрузки узлов
  useEffect(() => {
    if (nodes.length > 0 && simulationRef.current) {
      const timeoutId = setTimeout(() => {
        drawGraph();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [nodes.length, drawGraph]);

  // Утилиты для работы с узлами
  const { getNodeAtPosition, resetNodePositions } = useNodeUtils({
    simulationRef,
    nodePositionsRef,
    selectedCluster
  });

  // Обработчики мыши и touch
  const {
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleMouseEnter,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  } = useMouseHandlers({
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
  });

  // Обработчики зума
  const {
    handleWheel,
    zoomIn,
    zoomOut,
    resetView
  } = useZoomHandlers({
    panRef,
    zoomRef,
    drawGraph,
    setZoom,
    setPan
  });

  React.useImperativeHandle(ref, () => ({
    resetNodePositions,
    zoomIn,
    zoomOut,
    resetView
  }), [resetNodePositions, zoomIn, zoomOut, resetView]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <GraphCanvas
        canvasRef={canvasRef}
        dimensions={dimensions}
        hoveredNodeId={hoveredNodeId}
        handleMouseDown={handleMouseDown}
        handleMouseMove={handleMouseMove}
        handleMouseUp={handleMouseUp}
        handleMouseLeave={handleMouseLeave}
        handleMouseEnter={handleMouseEnter}
        handleWheel={handleWheel}
        handleTouchStart={handleTouchStart}
        handleTouchMove={handleTouchMove}
        handleTouchEnd={handleTouchEnd}
      />
    </div>
  );
});

ForceGraph.displayName = 'ForceGraph';

export default ForceGraph;