import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ENTREPRENEUR_CLUSTERS, ENTREPRENEUR_TAGS, ALL_TAGS } from '@/data/entrepreneurTags';

interface TagSelectorProps {
  onTagsChange?: (tags: string[]) => void;
  onClusterChange?: (cluster: string) => void;
}

const TagSelector: React.FC<TagSelectorProps> = ({ onTagsChange, onClusterChange }) => {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const handleTagToggle = (tag: string) => {
    const newTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    setSelectedTags(newTags);
    onTagsChange?.(newTags);
  };

  const handleClusterChange = (cluster: string) => {
    setSelectedCluster(cluster);
    onClusterChange?.(cluster);
  };

  const getTagsToDisplay = () => {
    if (selectedCategory === 'all') {
      return ALL_TAGS;
    }
    return ENTREPRENEUR_TAGS[selectedCategory as keyof typeof ENTREPRENEUR_TAGS] || [];
  };

  const categoryLabels: Record<string, string> = {
    all: 'Все теги',
    industry: 'Отрасли',
    skills: 'Навыки',
    stage: 'Стадия бизнеса',
    needs: 'Что ищут',
    offers: 'Что предлагают',
    model: 'Модель бизнеса'
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Фильтры для поиска предпринимателей</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Выбор кластера */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Кластер (основная сфера)</label>
          <Select value={selectedCluster} onValueChange={handleClusterChange}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите кластер" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Все кластеры</SelectItem>
              {ENTREPRENEUR_CLUSTERS.map(cluster => (
                <SelectItem key={cluster} value={cluster}>
                  {cluster}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Фильтр категорий тегов */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Категория тегов</label>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Выберите категорию" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(categoryLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Выбранные теги */}
        {selectedTags.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Выбрано тегов: {selectedTags.length} / 15
            </label>
            <div className="flex flex-wrap gap-2">
              {selectedTags.map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer"
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                  <X className="w-3 h-3 ml-1" />
                </Badge>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedTags([]);
                onTagsChange?.([]);
              }}
            >
              Очистить все теги
            </Button>
          </div>
        )}

        {/* Доступные теги */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Доступные теги</label>
          <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-2 border rounded">
            {getTagsToDisplay().map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer transition-colors"
                onClick={() => handleTagToggle(tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Статистика */}
        <div className="text-sm text-muted-foreground space-y-1">
          <p>Всего кластеров: {ENTREPRENEUR_CLUSTERS.length}</p>
          <p>Всего тегов: {ALL_TAGS.length}</p>
          <p>Теги распределены по {Object.keys(ENTREPRENEUR_TAGS).length} категориям</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TagSelector;