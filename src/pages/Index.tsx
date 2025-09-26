import React, { useRef, useState, useMemo } from 'react';
import ForceGraph from '@/components/ForceGraph';
import ParticipantModal from '@/components/ParticipantModal';
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
  const [showClusterDropdown, setShowClusterDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);

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

      {/* Компактные виджеты в одну линию */}
      <div className="absolute top-8 left-8 flex items-center gap-3">
        {/* Поиск */}
        <div className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border flex items-center gap-2">
          <Icon name="Search" size={16} className="text-muted-foreground" />
          <Input
            placeholder="Поиск..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-48 h-6 px-2 py-0 border-0 bg-transparent placeholder:text-muted-foreground focus-visible:ring-0"
          />
        </div>

        {/* Кластер */}
        <div className="relative">
          <button
            onClick={() => {
              setShowClusterDropdown(!showClusterDropdown);
              setShowTagsDropdown(false);
            }}
            className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border flex items-center gap-2 hover:bg-background/95 transition-colors"
          >
            <Icon name="Layers" size={16} className="text-muted-foreground" />
            <span className="text-sm">Кластер</span>
            <Icon name="ChevronDown" size={14} className="text-muted-foreground" />
          </button>
          
          {showClusterDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg py-1 min-w-[200px] z-50">
              {clusters.map(cluster => (
                <button
                  key={cluster}
                  onClick={() => {
                    setSelectedCluster(cluster);
                    setShowClusterDropdown(false);
                  }}
                  className={`w-full px-3 py-1.5 text-left text-sm hover:bg-muted transition-colors ${
                    selectedCluster === cluster ? 'bg-muted' : ''
                  }`}
                >
                  {cluster}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Теги */}
        <div className="relative">
          <button
            onClick={() => {
              setShowTagsDropdown(!showTagsDropdown);
              setShowClusterDropdown(false);
            }}
            className="bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border flex items-center gap-2 hover:bg-background/95 transition-colors"
          >
            <Icon name="Tags" size={16} className="text-muted-foreground" />
            <span className="text-sm">Теги</span>
            {selectedTags.length > 0 && (
              <Badge variant="secondary" className="text-xs h-4 px-1">
                {selectedTags.length}
              </Badge>
            )}
            <Icon name="ChevronDown" size={14} className="text-muted-foreground" />
          </button>
          
          {showTagsDropdown && (
            <div className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg p-3 min-w-[300px] max-h-[400px] overflow-y-auto z-50">
              <div className="flex flex-wrap gap-1.5">
                {tags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className="text-xs cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    {selectedTags.includes(tag) && (
                      <Icon name="X" size={10} className="ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Легенда кластеров - компактная версия */}
      <div className="absolute bottom-8 left-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
        <div className="flex items-center gap-3">
          {Object.entries(clusterColors).map(([cluster, color]) => (
            <div key={cluster} className="flex items-center gap-1.5">
              <div 
                className="w-2 h-2 rounded-full" 
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
        <div className="bg-background/90 backdrop-blur px-3 h-8 flex items-center rounded-md border">
          <span className="text-sm text-muted-foreground">
            {filteredEntrepreneurs.length} узлов
          </span>
        </div>
      </div>

      {/* Статистика - компактная версия */}
      <div className="absolute bottom-8 right-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="Users" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Всего:</span>
            <span className="font-medium">{entrepreneurs.length}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Icon name="Eye" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Показано:</span>
            <span className="font-medium">{filteredEntrepreneurs.length}</span>
          </div>
        </div>
      </div>

      {/* Модальное окно с информацией об участнике */}
      {selectedParticipant && (
        <ParticipantModal
          participant={selectedParticipant}
          isOpen={!!selectedParticipant}
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