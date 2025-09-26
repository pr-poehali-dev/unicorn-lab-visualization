import React, { useState, useMemo } from 'react';
import { Search, Filter, Tag, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Временные данные для демонстрации
const mockEntrepreneurs = [
  {
    id: 1,
    name: "Иван Петров",
    description: "Основатель SaaS платформы для автоматизации продаж",
    tags: ["SaaS", "Продажи", "B2B", "Автоматизация"],
    cluster: "IT и Digital"
  },
  {
    id: 2,
    name: "Мария Иванова",
    description: "CEO маркетплейса экологичных товаров",
    tags: ["E-commerce", "Экология", "Маркетплейс", "B2C"],
    cluster: "E-commerce"
  },
  {
    id: 3,
    name: "Алексей Смирнов",
    description: "Сооснователь EdTech стартапа по изучению языков",
    tags: ["EdTech", "Образование", "AI", "Языки"],
    cluster: "Образование"
  },
];

const allTags = ["SaaS", "Продажи", "B2B", "Автоматизация", "E-commerce", "Экология", "Маркетплейс", "B2C", "EdTech", "Образование", "AI", "Языки"];
const clusters = ["Все", "IT и Digital", "E-commerce", "Образование"];

const SearchPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedCluster, setSelectedCluster] = useState('Все');

  const filteredEntrepreneurs = useMemo(() => {
    return mockEntrepreneurs.filter(entrepreneur => {
      const matchesSearch = searchQuery === '' || 
        entrepreneur.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entrepreneur.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesTags = selectedTags.length === 0 || 
        selectedTags.some(tag => entrepreneur.tags.includes(tag));
      
      const matchesCluster = selectedCluster === 'Все' || 
        entrepreneur.cluster === selectedCluster;
      
      return matchesSearch && matchesTags && matchesCluster;
    });
  }, [searchQuery, selectedTags, selectedCluster]);

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">Поиск предпринимателей</h1>
        
        {/* Поиск и фильтры */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Поиск по имени или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCluster} onValueChange={setSelectedCluster}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Выберите кластер" />
              </SelectTrigger>
              <SelectContent>
                {clusters.map(cluster => (
                  <SelectItem key={cluster} value={cluster}>
                    {cluster}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Теги */}
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTags.includes(tag) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleTag(tag)}
              >
                <Tag className="w-3 h-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>
        
        {/* Результаты поиска */}
        <div className="mb-4 text-sm text-muted-foreground">
          Найдено: {filteredEntrepreneurs.length} предпринимателей
        </div>
        
        <div className="grid gap-4">
          {filteredEntrepreneurs.map(entrepreneur => (
            <Card key={entrepreneur.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  {entrepreneur.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{entrepreneur.description}</p>
                <div className="flex flex-wrap gap-2">
                  {entrepreneur.tags.map(tag => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4">
                  <span className="text-sm text-muted-foreground">Кластер: </span>
                  <span className="text-sm font-medium">{entrepreneur.cluster}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredEntrepreneurs.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Ничего не найдено. Попробуйте изменить параметры поиска.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;