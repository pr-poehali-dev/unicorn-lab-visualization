import React from 'react';
import Icon from '@/components/ui/icon';
import { Entrepreneur } from '@/types/entrepreneur';
import { TagsConfig } from '@/services/tagsService';
import { useIsMobile } from '@/hooks/use-mobile';

interface GraphStatsProps {
  tagsConfig: TagsConfig | null;
  filteredEntrepreneurs: Entrepreneur[];
  totalEntrepreneurs: number;
  loading: boolean;
}

const GraphStats: React.FC<GraphStatsProps> = ({
  tagsConfig,
  filteredEntrepreneurs,
  totalEntrepreneurs,
  loading
}) => {
  const isMobile = useIsMobile();
  return (
    <>
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
        
        const topClusters = sortedClusters.slice(0, 3);
        const remainingCount = sortedClusters.length - 3;
        
        return (
          <div className={`absolute ${isMobile ? 'bottom-16 left-4' : 'bottom-8 left-8'} bg-background/90 backdrop-blur-sm px-2 py-1.5 rounded-md border ${isMobile ? 'max-w-[calc(100vw-2rem)]' : ''}`}>
            <div className={`flex items-center gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
              {topClusters.map((cluster) => (
                <div key={cluster} className="flex items-center gap-1">
                  <div 
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: tagsConfig.clusterColors[cluster] }}
                  />
                  <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground whitespace-nowrap`}>{cluster}</span>
                </div>
              ))}
              {remainingCount > 0 && (
                <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground whitespace-nowrap`}>+ {remainingCount} больше</span>
              )}
            </div>
          </div>
        );
      })()}

      {/* Статистика - компактная версия */}
      <div className={`absolute ${isMobile ? 'top-16 right-4' : 'bottom-8 right-8'} bg-background/90 backdrop-blur-sm px-2 py-1.5 rounded-md border`}>
        <div className={`flex ${isMobile ? 'flex-col gap-1' : 'items-center gap-3'} ${isMobile ? 'text-[10px]' : 'text-xs'}`}>
          <div className="flex items-center gap-1">
            <Icon name="Users" size={isMobile ? 12 : 14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Всего:</span>
            <span className="font-medium">{loading ? '...' : totalEntrepreneurs}</span>
          </div>
          {!isMobile && <div className="h-3 w-px bg-border" />}
          <div className="flex items-center gap-1">
            <Icon name="Eye" size={isMobile ? 12 : 14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Показано:</span>
            <span className="font-medium">{loading ? '...' : filteredEntrepreneurs.length}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphStats;