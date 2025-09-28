import React from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { TagsConfig } from '@/services/tagsService';

interface FilterControlsProps {
  clusters: string[];
  selectedCluster: string;
  selectedTags: string[];
  tagFilterMode?: 'OR' | 'AND';
  showClusterDropdown: boolean;
  showTagsDropdown: boolean;
  tagCategories: Array<{
    key: string;
    label: string;
    tags: string[];
  }>;
  aiSelectedUserIds?: string[];
  onSetCluster: (cluster: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleClusterDropdown: () => void;
  onToggleTagsDropdown: () => void;
  onClearTags: () => void;
  onSetTagFilterMode?: (mode: 'OR' | 'AND') => void;
  onClearAIFilter?: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  clusters,
  selectedCluster,
  selectedTags,
  tagFilterMode = 'OR',
  showClusterDropdown,
  showTagsDropdown,
  tagCategories,
  aiSelectedUserIds = [],
  onSetCluster,
  onToggleTag,
  onToggleClusterDropdown,
  onToggleTagsDropdown,
  onClearTags,
  onSetTagFilterMode,
  onClearAIFilter
}) => {
  return (
    <div className="absolute top-8 left-8 flex items-center gap-2">
      {/* Кластер */}
      <div className="relative">
        <button
          data-dropdown-trigger="cluster"
          onClick={onToggleClusterDropdown}
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
                onClick={() => onSetCluster(cluster)}
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
          onClick={onToggleTagsDropdown}
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
            {/* Переключатель режима фильтрации */}
            {onSetTagFilterMode && (
              <div className="px-3 pb-2 mb-2 border-b">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Режим фильтрации:</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onSetTagFilterMode('OR')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        tagFilterMode === 'OR' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      ИЛИ
                    </button>
                    <button
                      onClick={() => onSetTagFilterMode('AND')}
                      className={`px-2 py-0.5 text-xs rounded transition-colors ${
                        tagFilterMode === 'AND' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      И
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {tagFilterMode === 'OR' 
                    ? 'Показывать участников с любым из выбранных тегов' 
                    : 'Показывать участников со всеми выбранными тегами'}
                </p>
              </div>
            )}
            
            {tagCategories.map(category => (
              <div key={category.key} className="px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground mb-1">{category.label}</p>
                <div className="flex flex-wrap gap-1">
                  {category.tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => onToggleTag(tag)}
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
                  onClick={onClearTags}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Очистить все
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* GPT фильтр */}
      {aiSelectedUserIds.length > 0 && (
        <div className="bg-primary/10 backdrop-blur-sm px-3 h-8 rounded-md border border-primary/20 flex items-center gap-2">
          <Icon name="Filter" size={16} className="text-primary" />
          <span className="text-sm text-primary">GPT: {aiSelectedUserIds.length} участников</span>
          {onClearAIFilter && (
            <button
              onClick={onClearAIFilter}
              className="ml-1 hover:text-primary/70 transition-colors"
            >
              <Icon name="X" size={14} />
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default FilterControls;