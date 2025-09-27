import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ZoomIn, ZoomOut, Maximize2, Filter, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from '@tanstack/react-query';

const clusterColors: { [key: string]: string } = {
  'IT': '#3b82f6',
  'Маркетинг': '#ec4899',
  'Финансы': '#10b981',
  'Производство': '#f59e0b',
  'Услуги': '#8b5cf6',
  'Консалтинг': '#06b6d4',
  'E-commerce': '#f43f5e',
  'EdTech': '#6366f1',
  'HealthTech': '#14b8a6',
  'Other': '#6b7280'
};

interface Participant {
  id: number;
  name: string;
  role: string;
  cluster: string;
  description: string;
  goal: string;
  tags: string[];
}

interface Connection {
  source: number;
  target: number;
  weight: number;
}

const NetworkPage = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<Participant | null>(null);
  const [nodePositions, setNodePositions] = useState<Map<string, { x: number; y: number }>>(new Map());

  // Загрузка данных с backend
  const { data, isLoading, error } = useQuery({
    queryKey: ['participants'],
    queryFn: async () => {
      const response = await fetch('https://functions.poehali.dev/e4e8f00f-5b2d-48d1-a089-f7c8f5c17db6');
      if (!response.ok) throw new Error('Failed to fetch participants');
      const data = await response.json();
      return data;
    }
  });

  // Инициализация позиций узлов
  useEffect(() => {
    if (data?.participants) {
      const positions = new Map();
      const centerX = 400;
      const centerY = 300;
      const radius = 250;
      
      data.participants.forEach((participant: Participant, index: number) => {
        const angle = (index * 2 * Math.PI) / data.participants.length;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.set(participant.id.toString(), { x, y });
      });
      
      setNodePositions(positions);
    }
  }, [data]);

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas || !data) return;

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
    ctx.translate(canvas.width / 2 - 400 * zoom, canvas.height / 2 - 300 * zoom);
    ctx.scale(zoom, zoom);

    // Фильтрация узлов
    const filteredParticipants = selectedCluster === 'Все' 
      ? data.participants 
      : data.participants.filter((p: Participant) => p.cluster === selectedCluster);

    const visibleIds = new Set(filteredParticipants.map((p: Participant) => p.id));

    // Рисование связей
    if (data.connections) {
      data.connections.forEach((connection: Connection) => {
        if (!visibleIds.has(connection.source) || !visibleIds.has(connection.target)) return;
        
        const sourcePos = nodePositions.get(connection.source.toString());
        const targetPos = nodePositions.get(connection.target.toString());
        
        if (sourcePos && targetPos) {
          ctx.strokeStyle = `rgba(234, 88, 12, ${connection.weight * 0.5})`;
          ctx.lineWidth = connection.weight * 3;
          ctx.beginPath();
          ctx.moveTo(sourcePos.x, sourcePos.y);
          ctx.lineTo(targetPos.x, targetPos.y);
          ctx.stroke();
        }
      });
    }

    // Рисование узлов
    filteredParticipants.forEach((participant: Participant) => {
      const pos = nodePositions.get(participant.id.toString());
      if (!pos) return;

      const isHovered = participant.id.toString() === hoveredNode;
      const nodeSize = isHovered ? 20 : 15;
      
      // Круг узла
      ctx.fillStyle = clusterColors[participant.cluster] || '#ea580c';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      // Имя
      ctx.fillStyle = '#f5f5f5';
      ctx.font = isHovered ? 'bold 14px Inter' : '12px Inter';
      ctx.textAlign = 'center';
      ctx.fillText(participant.name, pos.x, pos.y + nodeSize + 15);

      // Роль
      if (participant.role) {
        ctx.font = '10px Inter';
        ctx.fillStyle = '#a3a3a3';
        ctx.fillText(participant.role, pos.x, pos.y + nodeSize + 28);
      }

      // Теги при наведении
      if (isHovered && participant.tags && participant.tags.length > 0) {
        const topTags = participant.tags.slice(0, 3);
        ctx.font = '10px Inter';
        
        topTags.forEach((tag, index) => {
          const tagY = pos.y + nodeSize + 45 + (index * 18);
          
          // Фон для тега
          const metrics = ctx.measureText(tag);
          const padding = 6;
          ctx.fillStyle = `${clusterColors[participant.cluster] || '#ea580c'}20`;
          ctx.fillRect(
            pos.x - metrics.width / 2 - padding,
            tagY - 10,
            metrics.width + padding * 2,
            16
          );
          
          // Текст тега
          ctx.fillStyle = clusterColors[participant.cluster] || '#ea580c';
          ctx.fillText(tag, pos.x, tagY);
        });
      }
    });

    ctx.restore();
  };

  useEffect(() => {
    drawGraph();
    
    const handleResize = () => drawGraph();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [selectedCluster, zoom, hoveredNode, data, nodePositions]);

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
              <SelectItem value="IT">IT</SelectItem>
              <SelectItem value="Маркетинг">Маркетинг</SelectItem>
              <SelectItem value="Финансы">Финансы</SelectItem>
              <SelectItem value="Производство">Производство</SelectItem>
              <SelectItem value="Услуги">Услуги</SelectItem>
              <SelectItem value="Консалтинг">Консалтинг</SelectItem>
              <SelectItem value="E-commerce">E-commerce</SelectItem>
              <SelectItem value="EdTech">EdTech</SelectItem>
              <SelectItem value="HealthTech">HealthTech</SelectItem>
              <SelectItem value="Other">Другое</SelectItem>
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
        <Card className="p-4 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Загрузка участников...</span>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <span className="text-red-500">Ошибка загрузки данных</span>
            </div>
          )}
          <canvas
            ref={canvasRef}
            className="w-full h-[600px] cursor-move"
            onMouseMove={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect) return;
              
              const x = (e.clientX - rect.left - rect.width / 2 + 400 * zoom) / zoom;
              const y = (e.clientY - rect.top - rect.height / 2 + 300 * zoom) / zoom;
              
              if (!data) return;
              
              const hoveredParticipant = data.participants.find((p: Participant) => {
                const pos = nodePositions.get(p.id.toString());
                if (!pos) return false;
                const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                return distance < 20;
              });
              
              setHoveredNode(hoveredParticipant?.id.toString() || null);
            }}
            onMouseLeave={() => setHoveredNode(null)}
            onClick={(e) => {
              const rect = canvasRef.current?.getBoundingClientRect();
              if (!rect || !data) return;
              
              const x = (e.clientX - rect.left - rect.width / 2 + 400 * zoom) / zoom;
              const y = (e.clientY - rect.top - rect.height / 2 + 300 * zoom) / zoom;
              
              const clickedParticipant = data.participants.find((p: Participant) => {
                const pos = nodePositions.get(p.id.toString());
                if (!pos) return false;
                const distance = Math.sqrt(Math.pow(pos.x - x, 2) + Math.pow(pos.y - y, 2));
                return distance < 20;
              });
              
              setSelectedNode(clickedParticipant || null);
            }}
          />
        </Card>
        
        {/* Информация о выбранном участнике */}
        {selectedNode && (
          <Card className="mt-4 p-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{selectedNode.name}</h3>
                {selectedNode.role && (
                  <p className="text-sm text-muted-foreground">{selectedNode.role}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: clusterColors[selectedNode.cluster] || '#ea580c' }}
                  />
                  <span className="text-sm">{selectedNode.cluster}</span>
                </div>
                {selectedNode.description && (
                  <p className="mt-3 text-sm">{selectedNode.description}</p>
                )}
                {selectedNode.goal && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    <strong>Цель:</strong> {selectedNode.goal}
                  </p>
                )}
                {selectedNode.tags && selectedNode.tags.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-2">Теги:</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedNode.tags.map((tag, index) => (
                        <span 
                          key={index}
                          className="px-2 py-1 text-xs rounded-full"
                          style={{ 
                            backgroundColor: `${clusterColors[selectedNode.cluster] || '#ea580c'}20`,
                            color: clusterColors[selectedNode.cluster] || '#ea580c'
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button 
                size="icon" 
                variant="ghost" 
                onClick={() => setSelectedNode(null)}
              >
                <span className="text-lg">×</span>
              </Button>
            </div>
          </Card>
        )}

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