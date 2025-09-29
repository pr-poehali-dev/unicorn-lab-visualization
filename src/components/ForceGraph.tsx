import React, { useRef, useCallback, useEffect, useState } from 'react';
import { ForceGraphProps, ForceGraphRef } from './force-graph/types';
import { SimulationNode } from './force-graph/types';
import { GraphRenderer } from './force-graph/GraphRenderer';
import { useSimulation } from './force-graph/useSimulation';
import { useCanvasResize } from './force-graph/useCanvasResize';
import { GraphCanvas } from './force-graph/GraphCanvas';
import { useMouseHandlers } from './force-graph/MouseHandlers';
import { useZoomHandlers } from './force-graph/ZoomHandlers';
import { useNodeUtils } from './force-graph/NodeUtils';

const ForceGraph = React.forwardRef<ForceGraphRef, ForceGraphProps>(({ 
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

  // Получение ноды по ID
  const getNodeById = useCallback((nodeId: string) => {
    return nodesRef.current.find(node => node.id === nodeId);
  }, []);

  // Центрирование ноды с учетом смещения для карточки
  const centerNode = useCallback((node: SimulationNode, offsetY: number = 0) => {
    if (!node || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    // Используем dimensions вместо canvas.width/height для правильного масштаба
    const centerX = dimensions.width / 2;
    const centerY = (dimensions.height / 2) - offsetY; // Смещаем вверх для карточки
    
    // Рассчитываем новые координаты pan для центрирования ноды
    const newPan = {
      x: centerX - node.x * zoomRef.current,
      y: centerY - node.y * zoomRef.current
    };
    
    // Плавная анимация перемещения
    const startPan = { ...panRef.current };
    const duration = 500; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function для плавности
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      panRef.current = {
        x: startPan.x + (newPan.x - startPan.x) * easeProgress,
        y: startPan.y + (newPan.y - startPan.y) * easeProgress
      };
      
      setPan({ ...panRef.current });
      drawGraph();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [dimensions, zoomRef, setPan, drawGraph]);

  // Подгонка вида под все видимые ноды
  const fitView = useCallback(() => {
    if (!canvasRef.current || nodesRef.current.length === 0) return;
    
    const nodes = nodesRef.current;
    const padding = 50; // Отступ от краев
    
    // Находим границы всех нод
    const bounds = {
      minX: Math.min(...nodes.map(n => n.x)),
      maxX: Math.max(...nodes.map(n => n.x)),
      minY: Math.min(...nodes.map(n => n.y)),
      maxY: Math.max(...nodes.map(n => n.y))
    };
    
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const centerX = (bounds.minX + bounds.maxX) / 2;
    const centerY = (bounds.minY + bounds.maxY) / 2;
    
    // Вычисляем необходимый зум
    const scaleX = (dimensions.width - 2 * padding) / width;
    const scaleY = (dimensions.height - 2 * padding) / height;
    const targetZoom = Math.min(Math.max(0.1, Math.min(scaleX, scaleY)), 2);
    
    // Вычисляем новую позицию pan для центрирования
    const newPan = {
      x: dimensions.width / 2 - centerX * targetZoom,
      y: dimensions.height / 2 - centerY * targetZoom
    };
    
    // Плавная анимация
    const startPan = { ...panRef.current };
    const startZoom = zoomRef.current;
    const duration = 500; // ms
    const startTime = performance.now();
    
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function для плавности
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      panRef.current = {
        x: startPan.x + (newPan.x - startPan.x) * easeProgress,
        y: startPan.y + (newPan.y - startPan.y) * easeProgress
      };
      
      zoomRef.current = startZoom + (targetZoom - startZoom) * easeProgress;
      
      setPan({ ...panRef.current });
      setZoom(zoomRef.current);
      drawGraph();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [dimensions, setPan, setZoom, drawGraph]);

  React.useImperativeHandle(ref, () => ({
    resetNodePositions,
    zoomIn,
    zoomOut,
    resetView,
    getNodeById,
    centerNode,
    fitView
  }), [resetNodePositions, zoomIn, zoomOut, resetView, getNodeById, centerNode, fitView]);

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