import React from 'react';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { TagsConfig } from '@/services/tagsService';

interface FilterControlsProps {
  clusters: string[];
  selectedCluster: string;
  selectedTags: string[];
  showClusterDropdown: boolean;
  showTagsDropdown: boolean;
  tagCategories: Array<{
    key: string;
    label: string;
    tags: string[];
  }>;
  onSetCluster: (cluster: string) => void;
  onToggleTag: (tag: string) => void;
  onToggleClusterDropdown: () => void;
  onToggleTagsDropdown: () => void;
  onClearTags: () => void;
}

const FilterControls: React.FC<FilterControlsProps> = ({
  clusters,
  selectedCluster,
  selectedTags,
  showClusterDropdown,
  showTagsDropdown,
  tagCategories,
  onSetCluster,
  onToggleTag,
  onToggleClusterDropdown,
  onToggleTagsDropdown,
  onClearTags
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
    </div>
  );
};

export default FilterControls;