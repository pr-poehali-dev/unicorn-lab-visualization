import React, { useState, useCallback } from 'react';
import { Search, Filter, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ForceGraph from '@/components/ForceGraph';
import NodePopup from '@/components/NodePopup';
import { entrepreneurs, edges, clusterColors } from '@/data/mockData';
import { Entrepreneur } from '@/types/entrepreneur';

const Index = () => {
  const [selectedParticipant, setSelectedParticipant] = useState<Entrepreneur | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Все уникальные теги
  const allTags = Array.from(new Set(entrepreneurs.flatMap(e => e.tags))).sort();
  const clusters = ['Все', ...Object.keys(clusterColors)];

  // Фильтрация предпринимателей
  const filteredEntrepreneurs = entrepreneurs.filter(entrepreneur => {
    const matchesSearch = searchQuery === '' || 
      entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entrepreneur.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 || 
      selectedTags.some(tag => entrepreneur.tags.includes(tag));
    
    const matchesCluster = selectedCluster === 'Все' || 
      entrepreneur.cluster === selectedCluster;
    
    return matchesSearch && matchesTags && matchesCluster;
  });

  const handleNodeClick = useCallback((node: Entrepreneur, position: { x: number, y: number }) => {
    setSelectedParticipant(node);
    setPopupPosition(position);
  }, []);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background">
      {/* Боковая панель в стиле Kibana */}
      <div className="w-80 border-r bg-card p-4 overflow-y-auto">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Icon name="Filter" size={16} />
          Фильтры
        </h2>
        
        {/* Поиск */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Поиск</label>
          <div className="relative">
            <Icon name="Search" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Имя или описание..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Кластеры */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Кластер</label>
          <Select value={selectedCluster} onValueChange={setSelectedCluster}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {clusters.map(cluster => (
                <SelectItem key={cluster} value={cluster}>
                  {cluster}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Теги */}
        <div className="mb-6">
          <label className="text-sm text-muted-foreground mb-2 block">Теги</label>
          <div className="flex flex-wrap gap-1">
            {allTags.slice(0, 20).map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer text-xs"
                onClick={() => toggleTag(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Статистика */}
        <div className="mt-auto pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            <div className="flex justify-between mb-1">
              <span>Всего участников:</span>
              <span className="font-medium text-foreground">{entrepreneurs.length}</span>
            </div>
            <div className="flex justify-between">
              <span>Показано:</span>
              <span className="font-medium text-foreground">{filteredEntrepreneurs.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Основная область с графом */}
      <div className="flex-1 relative bg-card">
        <ForceGraph
          nodes={filteredEntrepreneurs}
          edges={edges}
          onNodeClick={handleNodeClick}
          selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
        />

        {/* Легенда кластеров */}
        <div className="absolute bottom-8 left-8 bg-background/90 backdrop-blur p-3 rounded-lg border">
          <div className="flex flex-wrap gap-3">
            {Object.entries(clusterColors).map(([cluster, color]) => (
              <div key={cluster} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-muted-foreground">{cluster}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Счетчик узлов */}
        <div className="absolute top-8 right-8 bg-background/90 backdrop-blur px-3 py-2 rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {filteredEntrepreneurs.length} узлов
          </span>
        </div>
      </div>

      {/* Попап с карточкой участника */}
      {selectedParticipant && popupPosition && (
        <NodePopup
          participant={selectedParticipant}
          position={popupPosition}
          onClose={() => {
            setSelectedParticipant(null);
            setPopupPosition(null);
          }}
        />
      )}
    </div>
  );
};

export default Index;