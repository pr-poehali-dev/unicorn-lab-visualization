import React, { useRef, useState, useMemo, useEffect } from 'react';
import ForceGraph from '@/components/ForceGraph';
import FilterControls from '@/components/index/FilterControls';
import GraphStats from '@/components/index/GraphStats';
import GraphControls from '@/components/index/GraphControls';
import ParticipantPopup from '@/components/index/ParticipantPopup';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
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

      {/* Компоненты управления и отображения */}
      <FilterControls
        clusters={clusters}
        selectedCluster={selectedCluster}
        selectedTags={selectedTags}
        showClusterDropdown={showClusterDropdown}
        showTagsDropdown={showTagsDropdown}
        tagCategories={tagCategories}
        onSetCluster={handleSetCluster}
        onToggleTag={handleToggleTag}
        onToggleClusterDropdown={toggleClusterDropdown}
        onToggleTagsDropdown={toggleTagsDropdown}
        onClearTags={handleClearTags}
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
    </div>
  );
};

export default Index;