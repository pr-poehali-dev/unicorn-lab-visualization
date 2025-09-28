import React, { useRef, useState, useMemo, useEffect } from 'react';
import ForceGraph from '@/components/ForceGraph';
import FilterControls from '@/components/index/FilterControls';
import GraphStats from '@/components/index/GraphStats';
import GraphControls from '@/components/index/GraphControls';
import ParticipantPopup from '@/components/index/ParticipantPopup';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import Icon from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import TelegramParser from '@/components/TelegramParser';
import AIAssistant from '@/components/AIAssistant';
import { ApiService } from '@/services/api';
import { TagsService, TagsConfig } from '@/services/tagsService';
import { useIsMobile } from '@/hooks/use-mobile';

const Index: React.FC = () => {
  const forceGraphRef = useRef<any>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'map' | 'chat'>('map');

  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR'); // Режим фильтрации тегов
  const [selectedParticipant, setSelectedParticipant] = useState<Entrepreneur | null>(null);
  const [popupPosition, setPopupPosition] = useState<{ x: number; y: number } | null>(null);
  const [showClusterDropdown, setShowClusterDropdown] = useState(false);
  const [showTagsDropdown, setShowTagsDropdown] = useState(false);
  const participantPopupRef = useRef<HTMLDivElement>(null);
  const [showParser, setShowParser] = useState(false);
  const [entrepreneurs, setEntrepreneurs] = useState<Entrepreneur[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [tagsConfig, setTagsConfig] = useState<TagsConfig | null>(null);
  const [showAIAssistant, setShowAIAssistant] = useState(false); // будет обновлено после проверки isMobile
  const [aiSelectedUserIds, setAiSelectedUserIds] = useState<string[]>([]);

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
      // Если выбраны участники через AI, показываем только их
      if (aiSelectedUserIds.length > 0) {
        // AI возвращает числовые ID, а entrepreneur.id может быть telegram_id или просто id.toString()
        // Нужно проверить оба варианта
        const entrepreneurIdAsString = entrepreneur.id;
        const isSelectedById = aiSelectedUserIds.some(aiId => {
          // Проверяем точное совпадение со строковым представлением
          return entrepreneurIdAsString === aiId.toString() || 
                 entrepreneurIdAsString === String(aiId);
        });
        
        console.log('AI Filter Debug:', {
          entrepreneurId: entrepreneur.id,
          aiSelectedUserIds,
          isSelectedById,
          entrepreneurName: entrepreneur.name
        });
        
        return isSelectedById;
      }
      
      // Фильтр по кластеру
      if (selectedCluster !== 'Все' && entrepreneur.cluster !== selectedCluster) {
        return false;
      }

      // Фильтр по тегам
      if (selectedTags.length > 0) {
        // Проверяем, что у предпринимателя есть теги
        if (!entrepreneur.tags || !Array.isArray(entrepreneur.tags)) {
          return false;
        }
        
        // Логика фильтрации в зависимости от режима
        if (tagFilterMode === 'OR') {
          // ИЛИ: хотя бы один тег должен совпадать
          if (!selectedTags.some(tag => entrepreneur.tags.includes(tag))) {
            return false;
          }
        } else {
          // И: все выбранные теги должны присутствовать
          if (!selectedTags.every(tag => entrepreneur.tags.includes(tag))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [entrepreneurs, selectedCluster, selectedTags, tagFilterMode, aiSelectedUserIds]);

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
  
  // Показываем AI ассистент по умолчанию на десктопе
  useEffect(() => {
    if (!isMobile) {
      setShowAIAssistant(true);
    }
  }, [isMobile]);

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

  const handleClearTags = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setSelectedTags([]);
      setIsTransitioning(false);
    }, 150);
  };

  const toggleClusterDropdown = () => {
    setShowClusterDropdown(!showClusterDropdown);
    setShowTagsDropdown(false);
  };

  const toggleTagsDropdown = () => {
    setShowTagsDropdown(!showTagsDropdown);
    setShowClusterDropdown(false);
  };
  
  const handleAISelectUsers = (userIds: string[]) => {
    console.log('handleAISelectUsers called with:', userIds);
    console.log('Current entrepreneurs:', entrepreneurs.map(e => ({ id: e.id, name: e.name })));
    setIsTransitioning(true);
    setTimeout(() => {
      setAiSelectedUserIds(userIds);
      // Сбрасываем другие фильтры при выборе через AI
      setSelectedCluster('Все');
      setSelectedTags([]);
      setIsTransitioning(false);
    }, 150);
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-card">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Icon name="Loader2" size={48} className="animate-spin text-primary" />
            <p className="text-muted-foreground">Загружаем данные участников...</p>
          </div>
        </div>
      ) : (
        <>
          {/* Левая панель с AI ассистентом - только на десктопе */}
          {!isMobile && showAIAssistant && (
            <div className="w-[400px] border-r border-border flex-shrink-0 bg-background">
              <AIAssistant
                entrepreneurs={filteredEntrepreneurs}
                onSelectUsers={handleAISelectUsers}
                isVisible={true}
              />
            </div>
          )}

          {/* Правая часть с канвасом */}
          <div className="flex-1 relative">
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
            
            {/* Переключатель табов для мобильных */}
            {isMobile && (
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
                <div className="bg-background/90 backdrop-blur border rounded-full p-1 flex gap-1">
                  <button
                    onClick={() => setMobileView('map')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mobileView === 'map'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    КАРТА
                  </button>
                  <button
                    onClick={() => setMobileView('chat')}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      mobileView === 'chat'
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    ЧАТ
                  </button>
                </div>
              </div>
            )}

            {/* Компоненты управления и отображения */}
            <FilterControls
        clusters={clusters}
        selectedCluster={selectedCluster}
        selectedTags={selectedTags}
        tagFilterMode={tagFilterMode}
        showClusterDropdown={showClusterDropdown}
        showTagsDropdown={showTagsDropdown}
        tagCategories={tagCategories}
        aiSelectedUserIds={aiSelectedUserIds}
        onSetCluster={handleSetCluster}
        onToggleTag={handleToggleTag}
        onToggleClusterDropdown={toggleClusterDropdown}
        onToggleTagsDropdown={toggleTagsDropdown}
        onClearTags={handleClearTags}
        onSetTagFilterMode={setTagFilterMode}
        onClearAIFilter={() => {
          setIsTransitioning(true);
          setTimeout(() => {
            setAiSelectedUserIds([]);
            setIsTransitioning(false);
          }, 150);
        }}
            />



            <GraphControls
        showParser={showParser}
        loading={loading}
        filteredCount={filteredEntrepreneurs.length}
        forceGraphRef={forceGraphRef}
        onToggleParser={() => setShowParser(!showParser)}
      />

            <GraphStats
              tagsConfig={tagsConfig}
              filteredEntrepreneurs={filteredEntrepreneurs}
              totalEntrepreneurs={entrepreneurs.length}
              loading={loading}
            />



            {/* Попап с информацией об участнике */}
            {selectedParticipant && popupPosition && (
              <ParticipantPopup
                participant={selectedParticipant}
                position={popupPosition}
                tagsConfig={tagsConfig}
                onClose={() => {
                  setSelectedParticipant(null);
                  setPopupPosition(null);
                }}
                popupRef={participantPopupRef}
              />
            )}

            {/* Компонент парсера */}
            {showParser && (
              <div className="fixed bottom-4 right-4 z-20 w-[500px] max-h-[600px] overflow-y-auto shadow-2xl">
                <TelegramParser />
              </div>
            )}

            {/* Мобильные вьюшки */}
            {isMobile && (
              <>
                {/* Карта */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${
                  mobileView === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}>
                  <ForceGraph
                    key={`mobile-${selectedCluster}-${selectedTags.join(',')}`}
                    ref={forceGraphRef}
                    nodes={filteredEntrepreneurs}
                    edges={filteredEdges}
                    onNodeClick={handleNodeClick}
                    selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
                    clusterColors={tagsConfig?.clusterColors || {}}
                  />
                </div>

                {/* Чат */}
                <div className={`fixed inset-0 bg-background transition-transform duration-300 z-40 ${
                  mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full'
                }`}>
                  <AIAssistant
                    entrepreneurs={filteredEntrepreneurs}
                    onSelectUsers={(userIds) => {
                      handleAISelectUsers(userIds);
                      setMobileView('map'); // Переключаемся на карту после выбора
                    }}
                    isVisible={mobileView === 'chat'}
                    onClose={() => setMobileView('map')}
                  />
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;