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
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<SimulationNode | null>(null);
  const simulationRef = useRef<d3.Simulation<SimulationNode, undefined> | null>(null);
  const nodesRef = useRef<SimulationNode[]>([]);
  const animationFrameRef = useRef<number | null>(null);

  // Инициализация симуляции
  useEffect(() => {
    // Преобразование узлов для симуляции
    const simNodes: SimulationNode[] = nodes.map(node => ({
      id: node.id,
      x: node.position.x + dimensions.width / 2 - 400,
      y: node.position.y + dimensions.height / 2 - 300,
      data: node
    }));
    nodesRef.current = simNodes;

    // Создание симуляции
    const simulation = d3.forceSimulation(simNodes)
      .force('link', d3.forceLink(edges)
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
      .velocityDecay(0.8)
      .alphaTarget(0.02);

    simulationRef.current = simulation;

    // Обновление позиций при каждом тике
    simulation.on('tick', () => {
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

    // Рисование связей белыми линиями с разной насыщенностью
    edges.forEach(edge => {
      if (!visibleNodeIds.has(edge.source as string) || !visibleNodeIds.has(edge.target as string)) return;

      const sourceNode = simNodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : (edge.source as any).id));
      const targetNode = simNodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : (edge.target as any).id));

      if (sourceNode && targetNode) {
        const weight = edge.weight || 0.5;
        
        // Белый цвет с разной насыщенностью в зависимости от силы связи
        const opacity = 0.1 + (weight * 0.5); // от 0.1 (слабая) до 0.6 (сильная)
        
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacity})`;
        ctx.lineWidth = 0.5 + (weight * 2.5); // от 0.5 до 3px
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });

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
    if (draggedNode) {
      // Если это был клик, а не драг
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const distance = Math.sqrt(Math.pow(draggedNode.x - x, 2) + Math.pow(draggedNode.y - y, 2));
        
        if (distance < 5) {
          const globalX = rect.left + draggedNode.x;
          const globalY = rect.top + draggedNode.y;
          onNodeClick(draggedNode.data, { x: globalX, y: globalY });
        }
      }

      draggedNode.fx = null;
      draggedNode.fy = null;
      setDraggedNode(null);
      simulationRef.current?.alpha(0.1).restart();
    }
  }, [draggedNode, onNodeClick]);

  const handleMouseLeave = useCallback(() => {
    setHoveredNode(null);
    if (draggedNode) {
      draggedNode.fx = null;
      draggedNode.fy = null;
      setDraggedNode(null);
    }
  }, [draggedNode]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && canvasRef.current.parentElement) {
        const parent = canvasRef.current.parentElement;
        const { width, height } = parent.getBoundingClientRect();
        setDimensions({ width, height });
        
        // Устанавливаем размеры канваса
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        canvasRef.current.style.width = `${width}px`;
        canvasRef.current.style.height = `${height}px`;
      }
    };

    // Небольшая задержка для корректного получения размеров
    setTimeout(handleResize, 100);
    
    window.addEventListener('resize', handleResize);
    
    // Наблюдатель за изменением размеров родителя
    const resizeObserver = new ResizeObserver(handleResize);
    if (canvasRef.current?.parentElement) {
      resizeObserver.observe(canvasRef.current.parentElement);
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
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
      className="cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default ForceGraph;