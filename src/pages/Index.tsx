import React, { useRef, useState, useMemo } from 'react';
import ForceGraph from '@/components/ForceGraph';
import ParticipantPopup from '@/components/ParticipantPopup';
import { entrepreneurs, edges, clusterColors } from '@/data/mockData';
import { Entrepreneur } from '@/types/entrepreneur';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

const Index: React.FC = () => {
  const forceGraphRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Entrepreneur | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);

  // Получаем уникальные кластеры и теги
  const clusters = useMemo(() => {
    const uniqueClusters = Array.from(new Set(entrepreneurs.map(e => e.cluster))).sort();
    return ['Все', ...uniqueClusters];
  }, []);

  const tags = useMemo(() => {
    const allTags = entrepreneurs.flatMap(e => e.tags);
    return Array.from(new Set(allTags)).sort();
  }, []);

  // Фильтрация предпринимателей
  const filteredEntrepreneurs = useMemo(() => {
    return entrepreneurs.filter(entrepreneur => {
      // Фильтр по поиску
      if (searchQuery && !entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !entrepreneur.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))) {
        return false;
      }

      // Фильтр по кластеру
      if (selectedCluster !== 'Все' && entrepreneur.cluster !== selectedCluster) {
        return false;
      }

      // Фильтр по тегам
      if (selectedTags.length > 0 && !selectedTags.some(tag => entrepreneur.tags.includes(tag))) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedCluster, selectedTags]);

  const handleNodeClick = (entrepreneur: Entrepreneur, position: { x: number; y: number }) => {
    setSelectedParticipant(entrepreneur);
    setPopupPosition(position);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-card">
      <ForceGraph
        ref={forceGraphRef}
        nodes={filteredEntrepreneurs}
        edges={edges}
        onNodeClick={handleNodeClick}
        selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
      />

      {/* Плавающие виджеты фильтров */}
      {/* Поиск */}
      <div className="absolute top-8 left-8 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Поиск</span>
        </div>
        <Input
          placeholder="Имя или теги..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-64"
        />
      </div>

      {/* Фильтр по кластерам */}
      <div className="absolute top-32 left-8 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Layers" size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Кластер</span>
        </div>
        <select
          className="w-64 px-3 py-2 border rounded-md bg-background text-sm"
          value={selectedCluster}
          onChange={(e) => setSelectedCluster(e.target.value)}
        >
          {clusters.map(cluster => (
            <option key={cluster} value={cluster}>
              {cluster}
            </option>
          ))}
        </select>
      </div>

      {/* Фильтр по тегам */}
      <div className="absolute top-56 left-8 bg-background/95 backdrop-blur-sm p-4 rounded-lg border shadow-lg max-w-xs">
        <div className="flex items-center gap-2 mb-3">
          <Icon name="Tags" size={16} className="text-muted-foreground" />
          <span className="text-sm font-medium">Теги</span>
          {selectedTags.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {selectedTags.length}
            </Badge>
          )}
        </div>
        <div className="relative">
          <select
            className="w-full px-3 py-2 border rounded-md bg-background text-sm appearance-none pr-8"
            onChange={(e) => {
              if (e.target.value && !selectedTags.includes(e.target.value)) {
                toggleTag(e.target.value);
              }
              e.target.value = '';
            }}
            defaultValue=""
          >
            <option value="" disabled>Выберите тег...</option>
            {tags.filter(tag => !selectedTags.includes(tag)).map(tag => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
          <Icon name="ChevronDown" className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {selectedTags.map(tag => (
              <Badge
                key={tag}
                variant="default"
                className="text-xs cursor-pointer pr-1"
                onClick={() => toggleTag(tag)}
              >
                {tag}
                <Icon name="X" size={12} className="ml-1" />
              </Badge>
            ))}
          </div>
        )}
      </div>

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

      {/* Счетчик узлов и кнопка сброса */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <Button
          onClick={() => forceGraphRef.current?.resetNodePositions()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
        >
          <Icon name="RotateCcw" size={16} />
        </Button>
        <div className="bg-background/90 backdrop-blur px-3 h-8 flex items-center rounded-lg border">
          <span className="text-sm text-muted-foreground">
            {filteredEntrepreneurs.length} узлов
          </span>
        </div>
      </div>

      {/* Статистика */}
      <div className="absolute bottom-8 right-8 bg-background/95 backdrop-blur-sm px-4 py-3 rounded-lg border shadow-lg">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Icon name="Users" size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Всего:</span>
            <span className="font-medium">{entrepreneurs.length}</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <Icon name="Eye" size={16} className="text-muted-foreground" />
            <span className="text-muted-foreground">Показано:</span>
            <span className="font-medium">{filteredEntrepreneurs.length}</span>
          </div>
        </div>
      </div>

      {/* Попап с информацией об участнике */}
      {selectedParticipant && popupPosition && (
        <ParticipantPopup
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