import React, { useRef, useState, useMemo, useEffect } from 'react';
import ForceGraph from '@/components/ForceGraph';
import Popover from '@/components/Popover';

import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import TelegramParser from '@/components/TelegramParser';
import { ApiService } from '@/services/api';
import { TagsService, TagsConfig } from '@/services/tagsService';

const Index: React.FC = () => {
  const forceGraphRef = useRef<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Entrepreneur | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showClusterDropdown, setShowClusterDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const [tagsButtonRef, setTagsButtonRef] = useState<HTMLButtonElement | null>(null);
  const participantPopupRef = useRef<HTMLDivElement>(null);
  const [showParser, setShowParser] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsConfig, setTagsConfig] = useState<TagsConfig | null>(null);

  // Используем кластеры из БД
  const clusters = useMemo(() => {
    if (!tagsConfig) return ['Все'];
    return ['Все', ...tagsConfig.clusters];
  }, [tagsConfig]);

  // Категории тегов для группировки в UI
  const tagCategories = useMemo(() => {
    if (!tagsConfig) return [];
    return tagsConfig.categories.map(cat => ({
      key: cat.key,
      label: cat.name,
      tags: tagsConfig.tagsByCategory[cat.key] || []
    }));
  }, [tagsConfig]);

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
  }, [entrepreneurs, searchQuery, selectedCluster, selectedTags]);

  // Загрузка данных из БД
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Загружаем конфигурацию тегов и участников параллельно
        const [tagsConfigData, participantsData] = await Promise.all([
          TagsService.getTagsConfig(),
          ApiService.getParticipants()
        ]);
        
        setTagsConfig(tagsConfigData);
        const { entrepreneurs: loadedEntrepreneurs, edges: loadedEdges } = ApiService.transformToEntrepreneurs(participantsData);
        setEntrepreneurs(loadedEntrepreneurs);
        setEdges(loadedEdges);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

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

  // Закрытие попапа участника при клике вне
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (participantPopupRef.current && !participantPopupRef.current.contains(event.target as Node)) {
        setSelectedParticipant(null);
        setPopupPosition(null);
      }
    };

    if (selectedParticipant) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [selectedParticipant]);

  return (
    <div className="relative h-[calc(100vh-4rem)] bg-card">
      {loading ? (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Icon name="Loader2" size={48} className="animate-spin text-primary" />
            <p className="text-muted-foreground">Загружаем данные участников...</p>
          </div>
        </div>
      ) : (
        <ForceGraph
          ref={forceGraphRef}
          nodes={filteredEntrepreneurs}
          edges={edges}
          onNodeClick={handleNodeClick}
          selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
        />
      )}

      {/* Компактные виджеты в одну линию */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        {/* Поиск */}
        <div className="bg-background/90 backdrop-blur-sm px-3 h-8 rounded-md border flex items-center gap-2">
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
            className="bg-background/90 backdrop-blur-sm px-3 h-8 rounded-md border flex items-center gap-2 hover:bg-background/95 transition-colors"
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
            ref={setTagsButtonRef}
            onClick={() => {
              setShowTagsDropdown(!showTagsDropdown);
              setShowClusterDropdown(false);
            }}
            className="bg-background/90 backdrop-blur-sm px-3 h-8 rounded-md border flex items-center gap-2 hover:bg-background/95 transition-colors"
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
          

        </div>
      </div>

      {/* Легенда кластеров - компактная версия */}
      {tagsConfig && Object.keys(tagsConfig.clusterColors).length > 0 && (
        <div className="absolute bottom-8 left-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
          <div className="flex items-center gap-3">
            {Object.entries(tagsConfig.clusterColors).map(([cluster, color]) => (
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
      )}

      {/* Счетчик узлов и кнопка сброса */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <Button
          onClick={() => setShowParser(!showParser)}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title={showParser ? 'Скрыть парсер' : 'Показать парсер'}
        >
          <Icon name="Upload" size={16} />
        </Button>
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
            {loading ? '...' : `${filteredEntrepreneurs.length} узлов`}
          </span>
        </div>
      </div>

      {/* Статистика - компактная версия */}
      <div className="absolute bottom-8 right-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="Users" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Всего:</span>
            <span className="font-medium">{loading ? '...' : entrepreneurs.length}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Icon name="Eye" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Показано:</span>
            <span className="font-medium">{loading ? '...' : filteredEntrepreneurs.length}</span>
          </div>
        </div>
      </div>

      {/* Попап с информацией об участнике */}
      {selectedParticipant && popupPosition && (
        <div
          ref={participantPopupRef}
          className="fixed z-50 bg-background border rounded-lg shadow-xl p-4 max-w-sm popup-fade-in"
          style={{
            left: `${popupPosition.x}px`,
            top: `${popupPosition.y}px`,
            transform: popupPosition.y < 400 
              ? 'translate(-50%, 10px)' // Если нода высоко - показываем попап снизу
              : 'translate(-50%, -100%) translateY(-10px)' // Если нода низко - показываем попап сверху
          }}
        >
          {/* Заголовок с кнопкой закрытия */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{selectedParticipant.name}</h3>
                {/* Кластер справа от имени */}
                <div className="flex items-center gap-1.5">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: tagsConfig?.clusterColors[selectedParticipant.cluster] || '#666' }}
                  />
                  <span className="text-sm text-muted-foreground">{selectedParticipant.cluster}</span>
                </div>
              </div>
              {selectedParticipant.goal && (
                <div className="mt-2 p-2 bg-primary/10 rounded-md border border-primary/20">
                  <div className="flex items-center gap-2">
                    <Icon name="Target" size={16} className="text-primary" />
                    <p className="text-sm font-medium text-primary">Цель:</p>
                  </div>
                  <p className="text-sm mt-1">{selectedParticipant.goal}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedParticipant(null);
                setPopupPosition(null);
              }}
              className="h-6 w-6 -mr-1 -mt-1 ml-2"
            >
              <Icon name="X" size={14} />
            </Button>
          </div>
          
          {/* Описание */}
          {selectedParticipant.description && (
            <p className="text-sm text-muted-foreground mb-3">
              {selectedParticipant.description}
            </p>
          )}
          
          {/* Теги */}
          {selectedParticipant.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {selectedParticipant.tags.map(tag => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
          
          {/* Кнопка перехода на пост */}
          {selectedParticipant.postUrl && (
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => window.open(selectedParticipant.postUrl, '_blank')}
            >
              <Icon name="MessageCircle" size={14} className="mr-2" />
              Познакомиться в UNICORN LAB
            </Button>
          )}
        </div>
      )}

      {/* Попап с тегами */}
      <Popover
        isOpen={showTagsDropdown}
        onClose={() => setShowTagsDropdown(false)}
        anchorEl={tagsButtonRef}
        placement="bottom"
      >
        <div className="p-4 max-w-lg max-h-[70vh] overflow-hidden flex flex-col">
          {/* Заголовок */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center gap-2">
              <Icon name="Tags" size={16} />
              Фильтр по тегам
            </h3>
            <span className="text-sm text-muted-foreground">
              {selectedTags.length > 0 && `Выбрано: ${selectedTags.length}`}
            </span>
          </div>
          
          {/* Выбранные теги */}
          {selectedTags.length > 0 && (
            <div className="mb-3 pb-3 border-b">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Выбранные теги:</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedTags([])}
                  className="h-6 text-xs"
                >
                  Очистить все
                </Button>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="default"
                    className="text-xs cursor-pointer"
                    onClick={() => toggleTag(tag)}
                  >
                    {tag}
                    <Icon name="X" size={10} className="ml-1" />
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Теги по категориям */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4">
            {tagCategories.map(category => (
              <div key={category.key} className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  {category.label}
                </h4>
                <div className="flex flex-wrap gap-1">
                  {category.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant={selectedTags.includes(tag) ? "default" : "outline"}
                      className="text-xs cursor-pointer hover:bg-muted transition-colors"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Popover>

      {/* Компонент парсера */}
      {showParser && (
        <div className="fixed bottom-4 right-4 z-20 w-[500px] max-h-[600px] overflow-y-auto shadow-2xl">
          <TelegramParser />
        </div>
      )}
    </div>
  );
};

export default Index;