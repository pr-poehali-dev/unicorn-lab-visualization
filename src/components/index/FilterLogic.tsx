import { useMemo } from 'react';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';

interface FilterLogicProps {
  entrepreneurs: Entrepreneur[];
  edges: GraphEdge[];
  selectedCluster: string;
  selectedTags: string[];
  tagFilterMode: 'OR' | 'AND';
  aiSelectedUserIds: string[];
}

export const useFilterLogic = ({
  entrepreneurs,
  edges,
  selectedCluster,
  selectedTags,
  tagFilterMode,
  aiSelectedUserIds
}: FilterLogicProps) => {
  const filteredEntrepreneurs = useMemo(() => {
    return entrepreneurs.filter(entrepreneur => {
      if (aiSelectedUserIds.length > 0) {
        const entrepreneurIdAsString = entrepreneur.id;
        const isSelectedById = aiSelectedUserIds.some(aiId => {
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
      
      if (selectedCluster !== 'Все' && entrepreneur.cluster !== selectedCluster) {
        return false;
      }

      if (selectedTags.length > 0) {
        if (!entrepreneur.tags || !Array.isArray(entrepreneur.tags)) {
          return false;
        }
        
        if (tagFilterMode === 'OR') {
          if (!selectedTags.some(tag => entrepreneur.tags.includes(tag))) {
            return false;
          }
        } else {
          if (!selectedTags.every(tag => entrepreneur.tags.includes(tag))) {
            return false;
          }
        }
      }

      return true;
    });
  }, [entrepreneurs, selectedCluster, selectedTags, tagFilterMode, aiSelectedUserIds]);

  const filteredEdges = useMemo(() => {
    const visibleIds = new Set(filteredEntrepreneurs.map(e => e.id));
    return edges.filter(edge => {
      const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id;
      const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id;
      return visibleIds.has(sourceId) && visibleIds.has(targetId);
    });
  }, [edges, filteredEntrepreneurs]);

  return { filteredEntrepreneurs, filteredEdges };
};