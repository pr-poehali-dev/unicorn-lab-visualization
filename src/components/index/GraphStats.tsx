import React from 'react';
import Icon from '@/components/ui/icon';
import { Entrepreneur } from '@/types/entrepreneur';
import { TagsConfig } from '@/services/tagsService';

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

      {/* Статистика - компактная версия */}
      <div className="absolute bottom-8 right-8 bg-background/90 backdrop-blur-sm px-3 py-2 rounded-md border">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <Icon name="Users" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Всего:</span>
            <span className="font-medium">{loading ? '...' : totalEntrepreneurs}</span>
          </div>
          <div className="h-3 w-px bg-border" />
          <div className="flex items-center gap-1.5">
            <Icon name="Eye" size={14} className="text-muted-foreground" />
            <span className="text-muted-foreground">Показано:</span>
            <span className="font-medium">{loading ? '...' : filteredEntrepreneurs.length}</span>
          </div>
        </div>
      </div>
    </>
  );
};

export default GraphStats;