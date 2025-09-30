import React, { useRef, useState, useMemo, useEffect } from 'react';
import ForceGraph from '@/components/ForceGraph';
import { ForceGraphRef, SimulationNode } from '@/components/force-graph/types';
import FilterControls from '@/components/index/FilterControls';
import GraphStats from '@/components/index/GraphStats';
import GraphControls from '@/components/index/GraphControls';
import ParticipantPopup from '@/components/index/ParticipantPopup';
import MobileView from '@/components/index/MobileView';
import DesktopView from '@/components/index/DesktopView';
import { useDataLoader } from '@/components/index/DataLoader';
import { useFilterLogic } from '@/components/index/FilterLogic';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import Icon from '@/components/ui/icon';
import TelegramParser from '@/components/TelegramParser';
import { TagsConfig } from '@/services/tagsService';
import { useIsMobile } from '@/hooks/use-mobile';

const Index: React.FC = () => {
  const forceGraphRef = useRef<ForceGraphRef>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState<'map' | 'chat'>('chat');

  const [selectedCluster, setSelectedCluster] = useState('Все');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'OR' | 'AND'>('OR');
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
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiSelectedUserIds, setAiSelectedUserIds] = useState<string[]>([]);

  const clusters = useMemo(() => {
    if (!tagsConfig) return ['Все'];
    return ['Все', ...tagsConfig.clusters];
  }, [tagsConfig]);

  const tagCategories = useMemo(() => {
    if (!tagsConfig) return [];
    return tagsConfig.categories.map(cat => ({
      key: cat.key,
      label: cat.name,
      tags: tagsConfig.tagsByCategory[cat.key] || []
    }));
  }, [tagsConfig]);

  const { filteredEntrepreneurs, filteredEdges } = useFilterLogic({
    entrepreneurs,
    edges,
    selectedCluster,
    selectedTags,
    tagFilterMode,
    aiSelectedUserIds
  });

  useDataLoader({
    onDataLoaded: ({ entrepreneurs: loadedEntrepreneurs, edges: loadedEdges, tagsConfig: loadedTagsConfig }) => {
      setEntrepreneurs(loadedEntrepreneurs);
      setEdges(loadedEdges);
      setTagsConfig(loadedTagsConfig);
      
      if (selectedCluster !== 'Все' && loadedTagsConfig && !loadedTagsConfig.clusters.includes(selectedCluster)) {
        setSelectedCluster('Все');
      }
      
      const allTags = loadedTagsConfig ? Object.values(loadedTagsConfig.tagsByCategory).flat() : [];
      const validSelectedTags = selectedTags.filter(tag => allTags.includes(tag));
      if (validSelectedTags.length !== selectedTags.length) {
        setSelectedTags(validSelectedTags);
      }
    },
    onLoadingChange: setLoading,
    selectedCluster,
    selectedTags
  });
  
  useEffect(() => {
    if (!isMobile) {
      setShowAIAssistant(true);
    }
  }, [isMobile]);

  const handleSetCluster = (cluster: string) => {
    if (cluster === 'Все' || (tagsConfig && tagsConfig.clusters.includes(cluster))) {
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedCluster(cluster);
        setIsTransitioning(false);
      }, 150);
      setShowClusterDropdown(false);
    } else {
      setSelectedCluster('Все');
      setShowClusterDropdown(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    const allTags = tagsConfig ? Object.values(tagsConfig.tagsByCategory).flat() : [];
    if (allTags.includes(tag)) {
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
    if (isMobile && forceGraphRef.current) {
      const node = forceGraphRef.current?.getNodeById?.(entrepreneur.id);
      if (node) {
        forceGraphRef.current?.centerNode?.(node, 250);
        
        setTimeout(() => {
          const screenWidth = window.innerWidth;
          const screenHeight = window.innerHeight;
          const newPosition = {
            x: screenWidth / 2,
            y: (screenHeight / 2) - 250
          };
          
          setSelectedParticipant(entrepreneur);
          setPopupPosition(newPosition);
        }, 300);
      }
    } else {
      setSelectedParticipant(entrepreneur);
      setPopupPosition(position);
    }
  };

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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      
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
      setSelectedCluster('Все');
      setSelectedTags([]);
      setIsTransitioning(false);
      
      if (isMobile && forceGraphRef.current) {
        setTimeout(() => {
          const selectedNodes = userIds
            .map(id => forceGraphRef.current?.getNodeById(id))
            .filter(node => node !== undefined);
          
          if (selectedNodes.length > 0) {
            const centerX = selectedNodes.reduce((sum, node) => sum + node!.x, 0) / selectedNodes.length;
            const centerY = selectedNodes.reduce((sum, node) => sum + node!.y, 0) / selectedNodes.length;
            
            const centerNode = {
              id: 'center',
              x: centerX,
              y: centerY,
              data: {} as any
            } as SimulationNode;
            
            forceGraphRef.current?.centerNode(centerNode, 100);
          }
        }, 500);
      }
    }, 150);
  };

  return (
    <div className="flex h-screen bg-card">
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Icon name="Loader2" size={48} className="animate-spin text-primary" />
            <p className="text-muted-foreground">Загружаем данные участников...</p>
          </div>
        </div>
      ) : (
        <>
          {!isMobile && (
            <DesktopView
              showAIAssistant={showAIAssistant}
              filteredEntrepreneurs={filteredEntrepreneurs}
              onAISelectUsers={handleAISelectUsers}
            />
          )}

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
            
            {isMobile && (
              <MobileView
                mobileView={mobileView}
                setMobileView={setMobileView}
                filteredEntrepreneurs={filteredEntrepreneurs}
                filteredEdges={filteredEdges}
                selectedCluster={selectedCluster}
                selectedTags={selectedTags}
                tagsConfig={tagsConfig}
                forceGraphRef={forceGraphRef}
                onNodeClick={handleNodeClick}
                onAISelectUsers={handleAISelectUsers}
              />
            )}

            {!isMobile && (
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
            )}

            {!isMobile && (
              <GraphControls
                showParser={showParser}
                loading={loading}
                filteredCount={filteredEntrepreneurs.length}
                forceGraphRef={forceGraphRef}
                onToggleParser={() => setShowParser(!showParser)}
              />
            )}

            {!isMobile && (
              <GraphStats
                tagsConfig={tagsConfig}
                filteredEntrepreneurs={filteredEntrepreneurs}
                totalEntrepreneurs={entrepreneurs.length}
                loading={loading}
              />
            )}

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

            {showParser && (
              <div className="fixed bottom-4 right-4 z-20 w-[500px] max-h-[600px] overflow-y-auto shadow-2xl">
                <TelegramParser />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default Index;