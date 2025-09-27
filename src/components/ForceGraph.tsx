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
  const mousePosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  
  // Состояние для zoom и pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const isPanning = useRef(false);
  const panStartPos = useRef<{ x: number; y: number } | null>(null);
  const panAnimationFrame = useRef<number | null>(null);
  const zoomAnimationFrame = useRef<number | null>(null);
  


  // Хук для управления размерами canvas
  const dimensions = useCanvasResize({ containerRef, canvasRef, simulationRef });
  
  // Синхронизируем panRef и zoomRef с состояниями
  useEffect(() => {
    panRef.current = pan;
  }, [pan]);
  
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Функция поиска узла по координатам
  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    if (!simulationRef.current) return null;
    
    const simNodes = simulationRef.current.nodes();
    if (!simNodes || simNodes.length === 0) return null;
    
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      // Проверяем что у узла есть валидные координаты
      if (typeof node.x !== 'number' || typeof node.y !== 'number') return false;
      
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
      // Небольшая задержка для гарантии инициализации
      const timeoutId = setTimeout(() => {
        drawGraph();
      }, 50);
      
      return () => clearTimeout(timeoutId);
    }
  }, [nodes.length, drawGraph]);

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
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Преобразуем координаты с учетом zoom и pan
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
      // Если не попали по узлу, начинаем pan
      isPanning.current = true;
      panStartPos.current = { x: e.clientX - panRef.current.x, y: e.clientY - panRef.current.y };
    }
  }, [getNodeAtPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      // Обновляем ref немедленно для плавности
      panRef.current = {
        x: e.clientX - panStartPos.current!.x,
        y: e.clientY - panStartPos.current!.y
      };
      
      // Отменяем предыдущий кадр анимации
      if (panAnimationFrame.current) {
        cancelAnimationFrame(panAnimationFrame.current);
      }
      
      // Немедленно перерисовываем canvas с новыми координатами
      drawGraph();
      
      // Планируем обновление состояния в следующем кадре
      panAnimationFrame.current = requestAnimationFrame(() => {
        setPan({ ...panRef.current });
      });
      
      return;
    }
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Преобразуем координаты с учетом zoom и pan
    const transformedX = (x - panRef.current.x) / zoomRef.current;
    const transformedY = (y - panRef.current.y) / zoomRef.current;
    
    // Всегда сохраняем текущие координаты мыши (трансформированные)
    mousePosRef.current = { x: transformedX, y: transformedY };
    // Убедимся, что флаг установлен
    isMouseInsideRef.current = true;

    if (draggedNode) {
      draggedNode.x = transformedX;
      draggedNode.y = transformedY;
      draggedNode.fx = transformedX;
      draggedNode.fy = transformedY;
      simulationRef.current?.alpha(0.3).restart();
    } else {
      // Немедленно обновляем hover состояние
      const node = getNodeAtPosition(transformedX, transformedY);
      const nodeId = node?.id || null;
      if (nodeId !== hoveredNodeId) {
        setHoveredNodeId(nodeId);
      }
    }
  }, [draggedNode, getNodeAtPosition, hoveredNodeId, drawGraph]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning.current) {
      isPanning.current = false;
      panStartPos.current = null;
      // Отменяем запланированное обновление
      if (panAnimationFrame.current) {
        cancelAnimationFrame(panAnimationFrame.current);
        panAnimationFrame.current = null;
      }
      // Финальное обновление состояния
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
        // Преобразуем обратно в экранные координаты для попапа
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
  }, [draggedNode, onNodeClick, zoom, pan]);

  const handleMouseLeave = useCallback((e: React.MouseEvent) => {
    // Проверяем, действительно ли мышь покинула область
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Если мышь все еще внутри области, игнорируем событие
    if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
      return;
    }
    
    isMouseInsideRef.current = false;
    // Важно: сбрасываем позицию мыши
    mousePosRef.current = { x: -1, y: -1 };
    // Гарантированно сбрасываем hover
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
  }, [draggedNode]);

  const handleMouseEnter = useCallback((e: React.MouseEvent) => {
    isMouseInsideRef.current = true;
    // Сразу обновляем позицию мыши при входе
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }, []);
  
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Получаем позицию мыши относительно канваса
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Вычисляем новый зум (уменьшенная скорость)
    const delta = e.deltaY < 0 ? 1.05 : 0.95;
    const newZoom = Math.max(0.3, Math.min(3, zoomRef.current * delta));
    
    // Корректируем pan чтобы зумить к позиции курсора
    const zoomRatio = newZoom / zoomRef.current;
    const newPan = {
      x: mouseX - (mouseX - panRef.current.x) * zoomRatio,
      y: mouseY - (mouseY - panRef.current.y) * zoomRatio
    };
    
    // Обновляем ref немедленно для плавности
    zoomRef.current = newZoom;
    panRef.current = newPan;
    
    // Отменяем предыдущий кадр анимации
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    // Немедленно перерисовываем canvas
    drawGraph();
    
    // Планируем обновление состояния в следующем кадре
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
      setPan(newPan);
    });
  }, [drawGraph]);

  // Проверяем hover состояние когда мышь внутри области
  useEffect(() => {
    let rafId: number;
    let isActive = true;
    
    const checkHover = () => {
      if (!isActive) return;
      
      // Проверяем что симуляция инициализирована
      if (!simulationRef.current || !nodesRef.current || nodesRef.current.length === 0) {
        rafId = requestAnimationFrame(checkHover);
        return;
      }
      
      // Проверяем только если мышь внутри и не перетаскиваем узел
      if (isMouseInsideRef.current && !draggedNode) {
        const { x, y } = mousePosRef.current;
        // Проверяем только если координаты валидны
        if (x >= 0 && y >= 0) {
          const node = getNodeAtPosition(x, y);
          const nodeId = node?.id || null;
          
          // Обновляем только если изменилось
          if (nodeId !== hoveredNodeId) {
            setHoveredNodeId(nodeId);
          }
        }
      } else if (!isMouseInsideRef.current && hoveredNodeId) {
        // Если мышь вне области, но hover еще активен - сбрасываем
        setHoveredNodeId(null);
      }
      
      rafId = requestAnimationFrame(checkHover);
    };
    
    // Небольшая задержка для инициализации симуляции
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
  }, [hoveredNodeId, draggedNode, getNodeAtPosition]);

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

  // Методы управления зумом
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(zoomRef.current * 1.15, 3);
    zoomRef.current = newZoom;
    
    // Отменяем предыдущий кадр анимации
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    // Немедленно перерисовываем
    drawGraph();
    
    // Обновляем состояние
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
    });
  }, [drawGraph]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(zoomRef.current / 1.15, 0.3);
    zoomRef.current = newZoom;
    
    // Отменяем предыдущий кадр анимации
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    
    // Немедленно перерисовываем
    drawGraph();
    
    // Обновляем состояние
    zoomAnimationFrame.current = requestAnimationFrame(() => {
      setZoom(newZoom);
    });
  }, [drawGraph]);

  const resetView = useCallback(() => {
    // Обновляем ref значения
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    
    // Отменяем анимации
    if (zoomAnimationFrame.current) {
      cancelAnimationFrame(zoomAnimationFrame.current);
    }
    if (panAnimationFrame.current) {
      cancelAnimationFrame(panAnimationFrame.current);
    }
    
    // Немедленно перерисовываем
    drawGraph();
    
    // Обновляем состояния
    requestAnimationFrame(() => {
      setZoom(1);
      setPan({ x: 0, y: 0 });
    });
  }, [drawGraph]);

  React.useImperativeHandle(ref, () => ({
    resetNodePositions,
    zoomIn,
    zoomOut,
    resetView
  }), [resetNodePositions, zoomIn, zoomOut, resetView]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      <canvas
        ref={canvasRef}
        style={{
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        className="pointer-events-none"
      />
      <div
        style={{
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: hoveredNodeId ? 'pointer' : 'grab'
        }}
        className="active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onPointerMove={handleMouseMove}
        onPointerLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </div>
  );
});

ForceGraph.displayName = 'ForceGraph';

export default ForceGraph;