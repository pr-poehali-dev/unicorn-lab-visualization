import { SimulationNode } from './types';
import { GraphEdge } from '@/types/entrepreneur';

interface GraphRendererProps {
  ctx: CanvasRenderingContext2D;
  dimensions: { width: number; height: number };
  simNodes: SimulationNode[];
  edges: GraphEdge[];
  selectedCluster?: string | null;
  clusterColors: Record<string, string>;
  hoveredNode: string | null;
  draggedNode: SimulationNode | null;
  simulationRef: React.RefObject<any>;
}

export class GraphRenderer {
  private static isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  static drawGrid(ctx: CanvasRenderingContext2D, dimensions: { width: number; height: number }) {
    // Пропускаем сетку в Safari для улучшения производительности
    if (this.isSafari) return;
    
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

  static drawEdges(props: GraphRendererProps) {
    const { ctx, simNodes, edges, selectedCluster, simulationRef } = props;
    
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    const visibleNodeIds = new Set(visibleNodes.map(n => n.id));

    // Получаем связи из симуляции
    const links = simulationRef.current?.force('link');
    if (links) {
      const simLinks = (links as any).links();
      
      // Оптимизация для Safari: рисуем все линии одним path
      if (this.isSafari && simNodes.length > 50) {
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.lineWidth = 1;
        
        simLinks.forEach((link: any) => {
          const sourceId = typeof link.source === 'object' ? link.source.id : link.source;
          const targetId = typeof link.target === 'object' ? link.target.id : link.target;
          
          if (!visibleNodeIds.has(sourceId) || !visibleNodeIds.has(targetId)) return;
          
          const sourceNode = typeof link.source === 'object' ? link.source : simNodes.find(n => n.id === sourceId);
          const targetNode = typeof link.target === 'object' ? link.target : simNodes.find(n => n.id === targetId);
          
          if (sourceNode && targetNode) {
            ctx.moveTo(sourceNode.x, sourceNode.y);
            ctx.lineTo(targetNode.x, targetNode.y);
          }
        });
        
        ctx.stroke();
      } else {
        // Для других браузеров - стандартный рендеринг
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
    }
  }

  static drawNode(ctx: CanvasRenderingContext2D, node: SimulationNode, props: {
    isHovered: boolean;
    isDragged: boolean;
    clusterColors: Record<string, string>;
    simplifiedRender?: boolean;
  }) {
    const { isHovered, isDragged, clusterColors, simplifiedRender } = props;
    const nodeSize = 40; // Фиксированный размер без увеличения

    // Свечение для активного узла - только если не упрощенный рендер
    if (!simplifiedRender && (isHovered || isDragged)) {
      const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, nodeSize * 2.5);
      const color = clusterColors[node.data.cluster] || '#ea580c';
      glow.addColorStop(0, color + '40');
      glow.addColorStop(0.5, color + '20');
      glow.addColorStop(1, 'transparent');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Тень для узла - отключаем для упрощенного рендера
    if (!simplifiedRender) {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
    }

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

    // Темный круг для фона эмодзи
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
    ctx.fill();

    // Рисуем эмодзи
    const emoji = node.data.emoji || node.data.avatar || '😊';
    
    // Рисуем эмодзи как текст
    ctx.save();
    ctx.font = `${nodeSize * 0.7}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(emoji, node.x, node.y);
    ctx.restore();

    // Имя участника
    ctx.fillStyle = '#ffffff';
    ctx.font = isHovered || isDragged ? 'bold 14px Inter' : '12px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(node.data.name, node.x, node.y + nodeSize + 20);

    // Топ-3 тега при наведении - отключаем для упрощенного рендера
    if (!simplifiedRender && (isHovered || isDragged) && node.data.tags.length > 0) {
      // Сохраняем состояние контекста
      ctx.save();
      
      const topTags = node.data.tags.slice(0, 3);
      
      topTags.forEach((tag, index) => {
        const tagY = node.y + nodeSize + 35 + (index * 22);
        
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
      
      // Восстанавливаем состояние контекста
      ctx.restore();
    }
  }

  static draw(props: GraphRendererProps) {
    const { ctx, dimensions, simNodes, selectedCluster, hoveredNode, draggedNode, clusterColors } = props;

    // Clear canvas - используем логические размеры, не физические
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Рисуем сетку
    this.drawGrid(ctx, dimensions);

    // Рисуем связи
    this.drawEdges(props);

    // Фильтруем видимые узлы
    const visibleNodes = selectedCluster && selectedCluster !== 'Все'
      ? simNodes.filter(n => n.data.cluster === selectedCluster)
      : simNodes;

    // Определяем упрощенный рендер для Safari с большими графами
    const simplifiedRender = this.isSafari && simNodes.length > 50;

    // Рисуем узлы
    visibleNodes.forEach(node => {
      this.drawNode(ctx, node, {
        isHovered: node.id === hoveredNode,
        isDragged: draggedNode?.id === node.id,
        clusterColors,
        simplifiedRender
      });
    });
  }
}