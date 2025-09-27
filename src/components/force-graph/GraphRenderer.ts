import { SimulationNode } from './types';
import { GraphEdge } from '@/types/entrepreneur';

interface DrawGraphParams {
  ctx: CanvasRenderingContext2D;
  dimensions: { width: number; height: number };
  simNodes: SimulationNode[];
  edges: GraphEdge[];
  simulationRef: React.MutableRefObject<any>;
  selectedCluster?: string | null;
  clusterColors: Record<string, string>;
  hoveredNode: string | null;
  draggedNode: SimulationNode | null;
  zoom?: number;
  pan?: { x: number; y: number };
}

export class GraphRenderer {
  static drawBackground(ctx: CanvasRenderingContext2D, dimensions: { width: number; height: number }) {
    // Clear canvas
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Сетка как в Kibana
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < dimensions.width; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }
    for (let y = 0; y < dimensions.height; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }
  }

  static drawEdges(
    ctx: CanvasRenderingContext2D,
    simNodes: SimulationNode[],
    edges: GraphEdge[],
    simulationRef: React.MutableRefObject<any>,
    visibleNodeIds: Set<string>
  ) {
    const links = simulationRef.current?.force('link');
    if (!links) {
      console.log('No links force found');
      return;
    }

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
        
        // Тонкая серая линия для связей
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 1; // Тонкая линия как просили
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        ctx.lineTo(targetNode.x, targetNode.y);
        ctx.stroke();
      }
    });
  }

  static drawNode(
    ctx: CanvasRenderingContext2D,
    node: SimulationNode,
    clusterColors: Record<string, string>,
    isHovered: boolean,
    isDragged: boolean
  ) {
    const nodeSize = 40; // Фиксированный размер без увеличения

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

    // Имя участника (без изменения стиля при hover)
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(node.data.name, node.x, node.y + nodeSize + 20);

    // Топ-3 тега при наведении
    if ((isHovered || isDragged) && node.data.tags.length > 0) {
      this.drawNodeTags(ctx, node, clusterColors, nodeSize);
    }
  }

  private static drawNodeTags(
    ctx: CanvasRenderingContext2D,
    node: SimulationNode,
    clusterColors: Record<string, string>,
    nodeSize: number
  ) {
    const topTags = node.data.tags.slice(0, 3);
    
    topTags.forEach((tag, index) => {
      const tagY = node.y + nodeSize + 40 + (index * 25);
      
      // Устанавливаем единый шрифт как у имени
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      const metrics = ctx.measureText(tag);
      const padding = 8;
      const clusterColor = clusterColors[node.data.cluster] || '#ea580c';
      
      // Темный фон с хорошей непрозрачностью
      ctx.fillStyle = 'rgba(26, 26, 26, 0.95)';
      ctx.beginPath();
      ctx.roundRect(
        node.x - metrics.width / 2 - padding, 
        tagY - 10,
        metrics.width + padding * 2,
        20,
        6
      );
      ctx.fill();
      
      // Обводка цветом кластера
      ctx.strokeStyle = clusterColor;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(
        node.x - metrics.width / 2 - padding, 
        tagY - 10,
        metrics.width + padding * 2,
        20,
        6
      );
      ctx.stroke();
      
      // Текст тега - явно устанавливаем белый цвет
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = 'transparent';
      ctx.lineWidth = 0;
      ctx.fillText(tag, node.x, tagY);
    });
  }

  static draw(params: DrawGraphParams) {
    const { ctx, dimensions, simNodes, edges, simulationRef, selectedCluster, clusterColors, hoveredNode, draggedNode, zoom = 1, pan = { x: 0, y: 0 } } = params;
    
    // Сохраняем текущее состояние контекста
    ctx.save();
    
    this.drawBackground(ctx, dimensions);
    
    // Применяем трансформацию для zoom и pan
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // ВАЖНО: сначала рисуем связи, потом узлы
    this.drawEdges(ctx, simNodes, edges, simulationRef, visibleNodeIds);

    // Рисование узлов ПОВЕРХ связей
    visibleNodes.forEach(node => {
      const isHovered = node.id === hoveredNode;
      const isDragged = draggedNode?.id === node.id;
      this.drawNode(ctx, node, clusterColors, isHovered, isDragged);
    });
    
    // Восстанавливаем состояние контекста
    ctx.restore();
  }
}