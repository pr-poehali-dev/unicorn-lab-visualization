import React, { useRef, useState, useMemo, useEffect } from 'react';
import ForceGraph from '@/components/ForceGraph';
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
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedParticipant, setSelectedParticipant] = useState<Entrepreneur | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showClusterDropdown, setShowClusterDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const participantPopupRef = useRef<HTMLDivElement>(null);
  const [showParser, setShowParser] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
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
      // Фильтр по кластеру
      if (selectedCluster !== 'Все' && entrepreneur.cluster !== selectedCluster) {
        return false;
      }

      // Фильтр по тегам
      if (selectedTags.length > 0) {
        // Проверяем, что у предпринимателя есть теги и хотя бы один совпадает
        if (!entrepreneur.tags || !Array.isArray(entrepreneur.tags)) {
          return false;
        }
        if (!selectedTags.some(tag => entrepreneur.tags.includes(tag))) {
          return false;
        }
      }

      return true;
    });
  }, [entrepreneurs, selectedCluster, selectedTags]);

  // Фильтрация edges - только связи между видимыми узлами
  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredEntrepreneurs.map(e => e.id));
    return edges.filter(edge => {
      // Проверяем, что оба узла видимы
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return visibleIds.has(sourceId) && visibleIds.has(targetId);
    });
  }, [edges, filteredEntrepreneurs]);

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
        
        // Валидация данных предпринимателей
        const validatedEntrepreneurs = loadedEntrepreneurs.map(entrepreneur => ({
          ...entrepreneur,
          tags: Array.isArray(entrepreneur.tags) ? entrepreneur.tags : [],
          cluster: entrepreneur.cluster || 'Без кластера'
        }));
        
        setEntrepreneurs(validatedEntrepreneurs);
        setEdges(loadedEdges);
        
        // Сбросим выбранные фильтры, если они невалидны
        if (selectedCluster !== 'Все' && tagsConfigData && !tagsConfigData.clusters.includes(selectedCluster)) {
          setSelectedCluster('Все');
        }
        
        // Проверяем теги
        const allTags = tagsConfigData ? Object.values(tagsConfigData.tagsByCategory).flat() : [];
        const validSelectedTags = selectedTags.filter(tag => allTags.includes(tag));
        if (validSelectedTags.length !== selectedTags.length) {
          setSelectedTags(validSelectedTags);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Безопасная установка кластера
  const handleSetCluster = (cluster: string) => {
    // Проверяем, что кластер существует
    if (cluster === 'Все' || (tagsConfig && tagsConfig.clusters.includes(cluster))) {
      // Запускаем анимацию
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCluster(cluster);
        setIsTransitioning(false);
      }, 150);
      setShowClusterDropdown(false);
    } else {
      setSelectedCluster('Все'); // Сбрасываем на безопасное значение
      setShowClusterDropdown(false);
    }
  };

  // Безопасное добавление/удаление тега
  const handleToggleTag = (tag: string) => {
    // Проверяем, что тег существует в конфигурации
    const allTags = tagsConfig ? Object.values(tagsConfig.tagsByCategory).flat() : [];
    if (allTags.includes(tag)) {
      // Запускаем анимацию
      setIsTransitioning(true);
      setTimeout(() => {
        if (selectedTags.includes(tag)) {
          setSelectedTags(selectedTags.filter(t => t !== tag));
        } else {
          setSelectedTags([...selectedTags, tag]);
        }
        setIsTransitioning(false);
      }, 150);
    }
  };

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

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
      // Проверяем, что клик был не по кнопкам dropdown
      if (!target.closest('[data-dropdown-trigger]') && !target.closest('[data-dropdown-content]')) {
        setShowClusterDropdown(false);
        setShowTagsDropdown(false);
      }
    };

    if (showClusterDropdown || showTagsDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showClusterDropdown, showTagsDropdown]);

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
        <div className="relative w-full h-full">
          <div 
            className="absolute inset-0 transition-opacity duration-300"
            style={{
              opacity: isTransitioning ? 0 : 1,
              transition: 'opacity 150ms ease-in-out'
            }}
          >
            <ForceGraph
              key={`${selectedCluster}-${selectedTags.join(',')}`}
              ref={forceGraphRef}
              nodes={filteredEntrepreneurs}
              edges={filteredEdges}
              onNodeClick={handleNodeClick}
              selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
              clusterColors={tagsConfig?.clusterColors || {}}
            />
          </div>
        </div>
      )}

      {/* Компактные виджеты в одну линию */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        {/* Кластер */}
        <div className="relative">
          <button
            data-dropdown-trigger="cluster"
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
            <div data-dropdown-content="cluster" className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg py-1 min-w-[200px] z-50">
              {clusters.map(cluster => (
                <button
                  key={cluster}
                  onClick={() => handleSetCluster(cluster)}
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
            data-dropdown-trigger="tags"
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
          
          {showTagsDropdown && tagCategories.length > 0 && (
            <div data-dropdown-content="tags" className="absolute top-full left-0 mt-1 bg-background border rounded-md shadow-lg py-2 min-w-[280px] max-h-[400px] overflow-y-auto z-50">
              {tagCategories.map(category => (
                <div key={category.key} className="px-3 py-2">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{category.label}</p>
                  <div className="flex flex-wrap gap-1">
                    {category.tags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleToggleTag(tag)}
                        className={`px-2 py-0.5 text-xs rounded-md transition-colors ${
                          selectedTags.includes(tag)
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              
              {selectedTags.length > 0 && (
                <div className="px-3 pt-2 border-t">
                  <button
                    onClick={() => {
                      setIsTransitioning(true);
                      setTimeout(() => {
                        setSelectedTags([]);
                        setIsTransitioning(false);
                      }, 150);
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Очистить все
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Легенда кластеров - компактная версия */}
      {tagsConfig && Object.keys(tagsConfig.clusterColors).length > 0 && (() => {
        // Подсчитываем количество участников в каждом кластере
        const clusterCounts = filteredEntrepreneurs.reduce((acc, p) => {
          acc[p.cluster] = (acc[p.cluster] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Сортируем кластеры по количеству участников
        const sortedClusters = Object.entries(clusterCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([cluster]) => cluster);
        
        const topClusters = sortedClusters.slice(0, 5);
        const remainingCount = sortedClusters.length - 5;
        
        return (
          <div className="absolute bottom-8 left-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
            <div className="flex items-center gap-3">
              {topClusters.map((cluster) => (
                <div key={cluster} className="flex items-center gap-1.5">
                  <div 
                    className="w-2 h-2 rounded-full" 
                    style={{ backgroundColor: tagsConfig.clusterColors[cluster] }}
                  />
                  <span className="text-xs text-muted-foreground">{cluster}</span>
                </div>
              ))}
              {remainingCount > 0 && (
                <span className="text-xs text-muted-foreground">+ {remainingCount} больше</span>
              )}
            </div>
          </div>
        );
      })()}

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

      {/* Кнопки управления зумом */}
      <div className="absolute bottom-20 right-8 flex flex-col gap-2">
        <Button
          onClick={() => forceGraphRef.current?.zoomIn()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Увеличить"
        >
          <Icon name="Plus" size={16} />
        </Button>
        <Button
          onClick={() => forceGraphRef.current?.zoomOut()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Уменьшить"
        >
          <Icon name="Minus" size={16} />
        </Button>
        <Button
          onClick={() => forceGraphRef.current?.resetView()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Сбросить вид"
        >
          <Icon name="Maximize" size={16} />
        </Button>
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