import React from 'react';
import TagSelector from '@/components/TagSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { calculateConnectionStrength, shouldConnect } from '@/data/entrepreneurTags';
import { Badge } from '@/components/ui/badge';

const TagsDemo = () => {
  const [selectedTags1, setSelectedTags1] = React.useState<string[]>([]);
  const [selectedTags2, setSelectedTags2] = React.useState<string[]>([]);

  const connectionStrength = calculateConnectionStrength(selectedTags1, selectedTags2);
  const willConnect = shouldConnect(selectedTags1, selectedTags2);

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Система тегов и связей</h1>
        <p className="text-muted-foreground">
          Демонстрация работы системы тегов для сообщества предпринимателей
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Предприниматель 1</h2>
          <TagSelector 
            onTagsChange={setSelectedTags1}
          />
          {selectedTags1.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Выбранные теги:</p>
              <div className="flex flex-wrap gap-1">
                {selectedTags1.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Предприниматель 2</h2>
          <TagSelector 
            onTagsChange={setSelectedTags2}
          />
          {selectedTags2.length > 0 && (
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Выбранные теги:</p>
              <div className="flex flex-wrap gap-1">
                {selectedTags2.map(tag => (
                  <Badge key={tag} variant="secondary">{tag}</Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Результат анализа связи */}
      {selectedTags1.length > 0 && selectedTags2.length > 0 && (
        <Card className={willConnect ? 'border-green-500' : 'border-orange-500'}>
          <CardHeader>
            <CardTitle>Анализ связи между предпринимателями</CardTitle>
            <CardDescription>
              На основе выбранных тегов система определяет потенциал для сотрудничества
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold">
                  {(connectionStrength * 100).toFixed(0)}%
                </div>
                <div className="flex-1">
                  <div className="h-4 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-orange-500 to-green-500 transition-all duration-500"
                      style={{ width: `${connectionStrength * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="font-medium">Статус связи:</span>
                <Badge variant={willConnect ? 'default' : 'secondary'}>
                  {willConnect ? 'Рекомендуется связать' : 'Слабая связь'}
                </Badge>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>• Связь создается при силе ≥ 50%</p>
                <p>• Общие теги увеличивают силу связи</p>
                <p>• Взаимодополняющие теги (например, "Инвестиции" и "Инвестирую") создают сильные связи</p>
                <p>• Теги из одной категории создают слабые связи</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TagsDemo;