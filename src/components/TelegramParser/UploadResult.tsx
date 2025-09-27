import React from 'react';

interface UploadResultProps {
  result: {
    imported: number;
    updated: number;
    total: number;
    connections_created: number;
    clusters?: Record<string, number>;
  };
}

const UploadResult: React.FC<UploadResultProps> = ({ result }) => {
  return (
    <div className="bg-muted p-4 rounded-lg">
      <h4 className="font-semibold mb-2">✅ Результаты импорта:</h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>Новых участников: <span className="font-semibold">{result.imported}</span></div>
        <div>Обновлено: <span className="font-semibold">{result.updated}</span></div>
        <div>Всего обработано: <span className="font-semibold">{result.total}</span></div>
        <div>Создано связей: <span className="font-semibold">{result.connections_created}</span></div>
      </div>
      {result.clusters && (
        <div className="mt-3">
          <p className="text-sm font-medium mb-1">Распределение по кластерам:</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(result.clusters).map(([cluster, count]) => (
              <span key={cluster} className="text-xs bg-background px-2 py-1 rounded">
                {cluster}: {count}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadResult;