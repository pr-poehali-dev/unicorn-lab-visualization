import React from 'react';
import ForceGraph from '@/components/ForceGraph';
import AIAssistant from '@/components/AIAssistant';
import Icon from '@/components/ui/icon';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';
import { ForceGraphRef } from '@/components/force-graph/types';
import { TagsConfig } from '@/services/tagsService';

interface MobileViewProps {
  mobileView: 'map' | 'chat';
  setMobileView: (view: 'map' | 'chat') => void;
  filteredEntrepreneurs: Entrepreneur[];
  filteredEdges: GraphEdge[];
  selectedCluster: string;
  selectedTags: string[];
  tagsConfig: TagsConfig | null;
  forceGraphRef: React.RefObject<ForceGraphRef>;
  onNodeClick: (entrepreneur: Entrepreneur, position: { x: number; y: number }) => void;
  onAISelectUsers: (userIds: string[]) => void;
}

const MobileView: React.FC<MobileViewProps> = ({
  mobileView,
  setMobileView,
  filteredEntrepreneurs,
  filteredEdges,
  selectedCluster,
  selectedTags,
  tagsConfig,
  forceGraphRef,
  onNodeClick,
  onAISelectUsers
}) => {
  return (
    <>
      {/* Переключатель табов */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-background/90 backdrop-blur border rounded-full p-1 flex gap-1">
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
        </div>
      </div>

      {/* Карта */}
      <div 
        className={`absolute inset-0 transition-opacity duration-300 ${
          mobileView === 'map' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onTouchMove={(e) => e.preventDefault()}
      >
        <ForceGraph
          key={`mobile-${selectedCluster}-${selectedTags.join(',')}`}
          ref={forceGraphRef}
          nodes={filteredEntrepreneurs}
          edges={filteredEdges}
          onNodeClick={onNodeClick}
          selectedCluster={selectedCluster === 'Все' ? null : selectedCluster}
          clusterColors={tagsConfig?.clusterColors || {}}
        />
        
        {/* Zoom controls */}
        <div className="absolute bottom-20 right-4 flex flex-col gap-2">
          <button
            onClick={() => forceGraphRef.current?.zoomIn()}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Увеличить"
          >
            <Icon name="Plus" size={20} />
          </button>
          <button
            onClick={() => forceGraphRef.current?.zoomOut()}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Уменьшить"
          >
            <Icon name="Minus" size={20} />
          </button>
          <button
            onClick={() => forceGraphRef.current?.resetView()}
            className="w-12 h-12 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full flex items-center justify-center text-white transition-colors"
            aria-label="Сбросить вид"
          >
            <Icon name="Home" size={20} />
          </button>
        </div>
      </div>

      {/* Чат */}
      <div className={`fixed inset-0 bg-background transition-transform duration-300 z-40 pt-16 ${
        mobileView === 'chat' ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <AIAssistant
          entrepreneurs={filteredEntrepreneurs}
          onSelectUsers={onAISelectUsers}
          isVisible={mobileView === 'chat'}
          onClose={() => setMobileView('map')}
          onShowMap={() => setMobileView('map')}
        />
      </div>
    </>
  );
};

export default MobileView;