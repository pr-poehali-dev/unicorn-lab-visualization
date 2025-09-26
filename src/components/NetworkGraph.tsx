import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import { clusterColors } from '@/data/mockData';

interface NetworkGraphProps {
  nodes: Entrepreneur[];
  edges: GraphEdge[];
  onNodeClick: (node: Entrepreneur) => void;
  selectedCluster?: string | null;
}

const NetworkGraph: React.FC<NetworkGraphProps> = ({ nodes, edges, onNodeClick, selectedCluster }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Позиции узлов с физикой
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Инициализация позиций
  useEffect(() => {
    const positions = new Map();
    nodes.forEach(node => {
      positions.set(node.id, { ...node.position });
    });
    setNodePositions(positions);
  }, [nodes]);

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Фильтрация узлов по кластеру
    const filteredNodes = selectedCluster && selectedCluster !== 'Все' 
      ? nodes.filter(n => n.cluster === selectedCluster)
      : nodes;

    const visibleNodeIds = new Set(filteredNodes.map(n => n.id));

    // Рисование связей
    ctx.save();
    edges.forEach(edge => {
      if (!visibleNodeIds.has(edge.source) || !visibleNodeIds.has(edge.target)) return;
      
      const sourcePos = nodePositions.get(edge.source);
      const targetPos = nodePositions.get(edge.target);
      
      if (sourcePos && targetPos) {
        ctx.strokeStyle = `rgba(234, 88, 12, ${edge.weight ? edge.weight * 0.4 : 0.3})`;
        ctx.lineWidth = edge.weight ? edge.weight * 3 : 2;
        ctx.beginPath();
        ctx.moveTo(sourcePos.x, sourcePos.y);
        ctx.lineTo(targetPos.x, targetPos.y);
        ctx.stroke();
      }
    });
    ctx.restore();

    // Рисование узлов
    filteredNodes.forEach(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const isHovered = node.id === hoveredNode;
      const nodeSize = isHovered ? 45 : 40;

      // Фон для аватарки
      ctx.fillStyle = clusterColors[node.cluster] || '#ea580c';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeSize + 2, 0, Math.PI * 2);
      ctx.fill();

      // Белый круг для аватарки
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Emoji аватарка
      ctx.font = `${nodeSize}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(node.avatar, pos.x, pos.y + 2);

      // Имя участника
      ctx.fillStyle = '#f5f5f5';
      ctx.font = isHovered ? 'bold 14px Inter' : '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(node.name, pos.x, pos.y + nodeSize + 20);

      // Топ-3 тега
      if (isHovered && node.tags.length > 0) {
        const topTags = node.tags.slice(0, 3);
        ctx.font = '10px Inter';
        ctx.fillStyle = clusterColors[node.cluster] || '#ea580c';
        
        topTags.forEach((tag, index) => {
          const tagY = pos.y + nodeSize + 35 + (index * 15);
          
          // Фон для тега
          const metrics = ctx.measureText(tag);
          const padding = 6;
          ctx.fillStyle = 'rgba(234, 88, 12, 0.2)';
          ctx.roundRect(
            pos.x - metrics.width / 2 - padding, 
            tagY - 8,
            metrics.width + padding * 2,
            16,
            4
          );
          ctx.fill();
          
          // Текст тега
          ctx.fillStyle = '#ea580c';
          ctx.fillText(tag, pos.x, tagY);
        });
      }
    });
  }, [nodes, edges, nodePositions, hoveredNode, selectedCluster]);

  useEffect(() => {
    drawGraph();
  }, [drawGraph]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const filteredNodes = selectedCluster && selectedCluster !== 'Все' 
      ? nodes.filter(n => n.cluster === selectedCluster)
      : nodes;

    const hoveredNode = filteredNodes.find(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return false;
      const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return distance < 45;
    });

    setHoveredNode(hoveredNode?.id || null);
    canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };

  const handleClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const filteredNodes = selectedCluster && selectedCluster !== 'Все' 
      ? nodes.filter(n => n.cluster === selectedCluster)
      : nodes;

    const clickedNode = filteredNodes.find(node => {
      const pos = nodePositions.get(node.id);
      if (!pos) return false;
      const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
      return distance < 45;
    });

    if (clickedNode) {
      onNodeClick(clickedNode);
    }
  };

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

  return (
    <canvas
      ref={canvasRef}
      width={dimensions.width}
      height={dimensions.height}
      className="w-full h-full"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredNode(null)}
      onClick={handleClick}
    />
  );
};

export default NetworkGraph;