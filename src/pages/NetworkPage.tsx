import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Данные для графа
const graphData = {
  nodes: [
    { id: '1', label: 'Иван Петров', group: 'IT и Digital', x: 100, y: 100 },
    { id: '2', label: 'Мария Иванова', group: 'E-commerce', x: 300, y: 200 },
    { id: '3', label: 'Алексей Смирнов', group: 'Образование', x: 500, y: 100 },
    { id: '4', label: 'Елена Козлова', group: 'IT и Digital', x: 200, y: 300 },
    { id: '5', label: 'Дмитрий Новиков', group: 'E-commerce', x: 400, y: 350 },
    { id: '6', label: 'Анна Сидорова', group: 'Образование', x: 600, y: 250 },
  ],
  edges: [
    { source: '1', target: '4' },
    { source: '2', target: '5' },
    { source: '3', target: '6' },
    { source: '1', target: '3' },
    { source: '2', target: '4' },
  ]
};

const clusterColors: { [key: string]: string } = {
  'IT и Digital': '#ea580c',
  'E-commerce': '#dc2626',
  'Образование': '#ca8a04',
};

const NetworkPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Установка размеров canvas
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Очистка canvas
    ctx.fillStyle = 'rgb(18, 18, 18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Центрирование и масштабирование
    ctx.save();
    ctx.translate(canvas.width / 2 - 350 * zoom, canvas.height / 2 - 250 * zoom);
    ctx.scale(zoom, zoom);

    // Рисование связей
    ctx.strokeStyle = 'rgba(234, 88, 12, 0.3)';
    ctx.lineWidth = 2;
    graphData.edges.forEach(edge => {
      const sourceNode = graphData.nodes.find(n => n.id === edge.source);
      const targetNode = graphData.nodes.find(n => n.id === edge.target);
      
      if (sourceNode && targetNode) {
        if (selectedCluster === 'Все' || sourceNode.group === selectedCluster || targetNode.group === selectedCluster) {
          ctx.beginPath();
          ctx.moveTo(sourceNode.x, sourceNode.y);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }
      }
    });

    // Рисование узлов
    graphData.nodes.forEach(node => {
      if (selectedCluster !== 'Все' && node.group !== selectedCluster) return;

      const isHovered = node.id === hoveredNode;
      const nodeSize = isHovered ? 12 : 8;
      
      ctx.fillStyle = clusterColors[node.group] || '#ea580c';
      ctx.beginPath();
      ctx.arc(node.x, node.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Текст
      ctx.fillStyle = '#f5f5f5';
      ctx.font = '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(node.label, node.x, node.y + 20);
    });

    ctx.restore();
  };

  useEffect(() => {
    drawGraph();
    
    const handleResize = () => drawGraph();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedCluster, zoom, hoveredNode]);

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.2, 0.5));
  const handleReset = () => setZoom(1);

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Граф связей сообщества</h1>
        
        {/* Контролы */}
        <div className="mb-4 flex gap-4 items-center">
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Выберите кластер" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Все">Все кластеры</SelectItem>
              <SelectItem value="IT и Digital">IT и Digital</SelectItem>
              <SelectItem value="E-commerce">E-commerce</SelectItem>
              <SelectItem value="Образование">Образование</SelectItem>
            </SelectContent>
          </Select>
          
          <div className="flex gap-2">
            <Button size="icon" variant="outline" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button size="icon" variant="outline" onClick={handleReset}>
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* График */}
        <Card className="p-4">
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] cursor-move"
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              const x = (e.clientX - rect.left - rect.width / 2 + 350 * zoom) / zoom;
              const y = (e.clientY - rect.top - rect.height / 2 + 250 * zoom) / zoom;
              
              const hoveredNode = graphData.nodes.find(node => {
                const distance = Math.sqrt(Math.pow(node.x - x, 2) + Math.pow(node.y - y, 2));
                return distance < 15;
              });
              
              setHoveredNode(hoveredNode?.id || null);
            }}
            onMouseLeave={() => setHoveredNode(null)}
          />
        </Card>
        
        {/* Легенда */}
        <div className="mt-4 flex flex-wrap gap-4">
          {Object.entries(clusterColors).map(([cluster, color]) => (
            <div key={cluster} className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className="text-sm text-muted-foreground">{cluster}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NetworkPage;