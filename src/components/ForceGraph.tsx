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

    // Рисование связей с цветовой индикацией силы
    edges.forEach(edge => {
      if (!visibleNodeIds.has(edge.source as string) || !visibleNodeIds.has(edge.target as string)) return;

      const sourceNode = simNodes.find(n => n.id === (typeof edge.source === 'string' ? edge.source : (edge.source as any).id));
      const targetNode = simNodes.find(n => n.id === (typeof edge.target === 'string' ? edge.target : (edge.target as any).id));

      if (sourceNode && targetNode) {
        const weight = edge.weight || 0.5;
        
        // Интерполяция цвета от красного (слабая связь) к зеленому (сильная связь)
        const r = Math.floor(255 * (1 - weight));
        const g = Math.floor(255 * weight);
        const b = 0;
        const opacity = 0.3 + (weight * 0.4); // от 0.3 до 0.7
        
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.lineWidth = 1 + (weight * 4); // от 1 до 5px
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

      // Тень для узла
      ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;

      // Белая обводка узла
      ctx.strokeStyle = isHovered || isDragged ? '#ffffff' : 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = isHovered || isDragged ? 3 : 2;
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Сброс тени
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;

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

      // Показываем кластер при наведении
      if (isHovered || isDragged) {
        ctx.font = '11px Inter';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.textAlign = 'center';
        ctx.fillText(node.data.cluster, node.x, node.y + nodeSize + 35);
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
      if (canvasRef.current) {
        const { width, height } = canvasRef.current.getBoundingClientRect();
        setDimensions({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="w-full h-full cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default ForceGraph;