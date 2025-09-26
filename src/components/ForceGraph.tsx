import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import { clusterColors } from '@/data/mockData';

interface ForceGraphProps {
  nodes: Entrepreneur[];
  edges: GraphEdge[];
  onNodeClick: (node: Entrepreneur, position: { x: number, y: number }) => void;
  selectedCluster?: string | null;
}

interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  data: Entrepreneur;
}

const ForceGraph: React.FC<ForceGraphProps> = ({ nodes, edges, onNodeClick, selectedCluster }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number; fx: number | null; fy: number | null }>>(new Map());
  const dragStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Инициализация симуляции
  useEffect(() => {
    // Преобразование узлов для симуляции с сохранением позиций
    const simNodes: SimulationNode[] = nodes.map(node => {
      const savedPos = nodePositionsRef.current.get(node.id);
      const newNode: SimulationNode = {
        id: node.id,
        x: savedPos ? savedPos.x : Math.random() * dimensions.width,
        y: savedPos ? savedPos.y : Math.random() * dimensions.height,
        data: node
      };
      
      // Восстанавливаем фиксированные позиции если они были
      if (savedPos?.fx !== null && savedPos?.fx !== undefined) {
        newNode.fx = savedPos.fx;
      }
      if (savedPos?.fy !== null && savedPos?.fy !== undefined) {
        newNode.fy = savedPos.fy;
      }
      
      return newNode;
    });
    nodesRef.current = simNodes;

    // Создаем копию edges для симуляции
    const simEdges = edges.map(e => ({ ...e }));

    // Создание симуляции
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(simEdges)
        .id((d: any) => d.id)
        .distance(150)
        .strength(0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(400)
      )
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide()
        .radius(60)
        .strength(0.7)
      )
      .velocityDecay(0.6)
      .alphaTarget(0);

    simulationRef.current = simulation;

    // Обновление позиций при каждом тике
    simulation.on('tick', () => {
      // Сохраняем текущие позиции узлов
      simNodes.forEach(node => {
        nodePositionsRef.current.set(node.id, { 
          x: node.x, 
          y: node.y,
          fx: node.fx || null,
          fy: node.fy || null
        });
      });
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(() => {
        drawGraph();
      });
    });

    return () => {
      simulation.stop();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, dimensions]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Сетка как в Kibana
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvas.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const simNodes = nodesRef.current;
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Получаем связи из симуляции
    const links = simulationRef.current?.force('link');
    if (links) {
      const simLinks = (links as any).links();
      
      // Рисование связей
      simLinks.forEach((link: any) => {
        const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
        const targetId = typeof link.target === 'object' ? link.target.id : link.target;
        
        if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId)) return;
        
        const sourceNode = typeof link.source === 'object' ? link.source : simNodes.find(n => n.id === sourceId);
        const targetNode = typeof link.target === 'object' ? link.target : simNodes.find(n => n.id === targetId);
        
        if (sourceNode && targetNode) {
          // Находим оригинальный edge для получения веса
          const originalEdge = edges.find(e => 
            (e.source === sourceId && e.target === targetId) ||
            (e.source === targetId && e.target === sourceId)
          );
          const weight = originalEdge?.weight || 0.5;
          
          // Белый цвет с большей насыщенностью для лучшей видимости
          const opacity = 0.4 + (weight * 0.4); // от 0.4 (слабая) до 0.8 (сильная)
          
          ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
          ctx.lineWidth = 1.5 + (weight * 3); // от 1.5 до 4.5px
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      });
    }

    // Рисование узлов
    visibleNodes.forEach(node => {
      const isHovered = node.id === hoveredNode;
      const isDragged = draggedNode?.id === node.id;
      const nodeSize = isDragged ? 50 : (isHovered ? 45 : 40);

      // Свечение для активного узла
      if (isHovered || isDragged) {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 2);
        const color = clusterColors[node.data.cluster] || '#ea580c';
        glow.addColorStop(0, color + '33');
        glow.addColorStop(1, 'transparent');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(node.x, node.y, nodeSize * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // Тень для узла
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Фон для узла с цветом кластера
      const bgGradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize);
      const color = clusterColors[node.data.cluster] || '#ea580c';
      bgGradient.addColorStop(0, color);
      bgGradient.addColorStop(1, color + '88');
      
      ctx.fillStyle = bgGradient;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize + 2, 0, Math.PI * 2);
      ctx.fill();

      // Сброс тени
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

      // Белый круг для аватарки
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Emoji аватарка
      ctx.font = `${nodeSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.data.avatar, node.x, node.y + 2);

      // Имя участника
      ctx.fillStyle = '#f5f5f5';
      ctx.font = isHovered || isDragged ? 'bold 14px Inter' : '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(node.data.name, node.x, node.y + nodeSize + 20);

      // Топ-3 тега при наведении
      if ((isHovered || isDragged) && node.data.tags.length > 0) {
        const topTags = node.data.tags.slice(0, 3);
        ctx.font = '10px Inter';
        
        topTags.forEach((tag, index) => {
          const tagY = node.y + nodeSize + 35 + (index * 15);
          
          // Фон для тега
          const metrics = ctx.measureText(tag);
          const padding = 6;
          ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
          ctx.roundRect(
            node.x - metrics.width / 2 - padding, 
            tagY - 8,
            metrics.width + padding * 2,
            16,
            4
          );
          ctx.fill();
          
          // Текст тега
          ctx.fillStyle = '#ea580c';
          ctx.fillText(tag, node.x, tagY);
        });
      }
    });
  }, [hoveredNode, draggedNode, selectedCluster]);

  // Обработчики мыши
  const getNodeAtPosition = useCallback((x: number, y: number): SimulationNode | null => {
    const simNodes = nodesRef.current;
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    return visibleNodes.find(node => {
      const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
      return distance < 45;
    }) || null;
  }, [selectedCluster]);

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
  }, [getNodeAtPosition]);

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
  }, [draggedNode, getNodeAtPosition]);

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
  }, [draggedNode, onNodeClick]);

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
  }, [draggedNode]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height);
        
        setDimensions({ width: newWidth, height: newHeight });
        
        // Перезапускаем симуляцию с новым центром
        if (simulationRef.current) {
          simulationRef.current.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
          simulationRef.current.alpha(0.1).restart();
        }
      }
    };

    // Начальная установка размеров
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    // Наблюдатель за изменением размеров контейнера
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
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
      />
    </div>
  );
};

export default ForceGraph;