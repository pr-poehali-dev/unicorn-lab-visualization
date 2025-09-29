import { useEffect } from 'react';
import { ApiService } from '@/services/api';
import { TagsService, TagsConfig } from '@/services/tagsService';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';

interface DataLoaderProps {
  onDataLoaded: (data: {
    entrepreneurs: Entrepreneur[];
    edges: GraphEdge[];
    tagsConfig: TagsConfig;
  }) => void;
  onLoadingChange: (loading: boolean) => void;
  selectedCluster: string;
  selectedTags: string[];
}

export const useDataLoader = ({
  onDataLoaded,
  onLoadingChange,
  selectedCluster,
  selectedTags
}: DataLoaderProps) => {
  useEffect(() => {
    const loadData = async () => {
      try {
        onLoadingChange(true);
        
        const [tagsConfigData, participantsData] = await Promise.all([
          TagsService.getTagsConfig(),
          ApiService.getParticipants()
        ]);
        
        const { entrepreneurs: loadedEntrepreneurs, edges: loadedEdges } = ApiService.transformToEntrepreneurs(participantsData);
        
        const validatedEntrepreneurs = loadedEntrepreneurs.map(entrepreneur => ({
          ...entrepreneur,
          tags: Array.isArray(entrepreneur.tags) ? entrepreneur.tags : [],
          cluster: entrepreneur.cluster || 'Без кластера'
        }));
        
        onDataLoaded({
          entrepreneurs: validatedEntrepreneurs,
          edges: loadedEdges,
          tagsConfig: tagsConfigData
        });
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        onLoadingChange(false);
      }
    };

    loadData();
  }, []);
};