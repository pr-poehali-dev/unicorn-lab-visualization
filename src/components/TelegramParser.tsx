import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Icon from './ui/icon';
import { toast } from 'sonner';
import Instructions from './TelegramParser/Instructions';
import UploadResult from './TelegramParser/UploadResult';
import FileUploader from './TelegramParser/FileUploader';
import { TELEGRAM_PARSER_SCRIPT } from './TelegramParser/constants';

const TelegramParser: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);

  const copyScript = async () => {
    try {
      await navigator.clipboard.writeText(TELEGRAM_PARSER_SCRIPT);
      toast.success('Скрипт скопирован в буфер обмена!');
    } catch (err) {
      toast.error('Не удалось скопировать скрипт');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/json') {
      toast.error('Пожалуйста, выберите JSON файл');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      
      // Читаем файл
      const text = await file.text();
      const participants = JSON.parse(text);
      
      if (!Array.isArray(participants)) {
        throw new Error('Файл должен содержать массив участников');
      }
      
      setUploadProgress(20);
      toast.info(`Загружено ${participants.length} участников, начинаем пакетную обработку...`);
      
      // Обрабатываем в батчах по 50 участников
      const batchSize = 50;
      const totalBatches = Math.ceil(participants.length / batchSize);
      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      let totalConnections = 0;
      const allClusters: Record<string, number> = {};
      
      for (let i = 0; i < participants.length; i += batchSize) {
        const batch = participants.slice(i, i + batchSize);
        const currentBatch = Math.floor(i / batchSize) + 1;
        const progress = 20 + ((currentBatch / totalBatches) * 70);
        
        setUploadProgress(progress);
        toast.info(`Обработка партии ${currentBatch}/${totalBatches} (${batch.length} участников)...`);
        
        try {
          const response = await fetch('https://functions.poehali.dev/66267fe8-bc76-4f15-a55a-a89fd93c694c', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ participants: batch })
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ошибка в партии ${currentBatch}:`, errorText);
            toast.error(`Ошибка в партии ${currentBatch}, продолжаем обработку...`);
            continue;
          }
          
          const result = await response.json();
          totalImported += result.imported || 0;
          totalUpdated += result.updated || 0;
          totalSkipped += result.skipped || 0;
          totalConnections += result.connections_created || 0;
          
          // Объединяем кластеры
          if (result.clusters) {
            Object.entries(result.clusters).forEach(([cluster, count]) => {
              allClusters[cluster] = (allClusters[cluster] || 0) + (count as number);
            });
          }
          
        } catch (batchError) {
          console.error(`Ошибка при обработке партии ${currentBatch}:`, batchError);
          toast.error(`Пропущена партия ${currentBatch} из-за ошибки`);
        }
      }
      
      setUploadProgress(100);
      setUploadResult({
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        total: participants.length,
        connections_created: totalConnections,
        clusters: allClusters
      });
      
      toast.success(`Обработка завершена! Новых: ${totalImported}, обновлено: ${totalUpdated}, пропущено: ${totalSkipped}`);
      
      // Перезагружаем страницу через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка при загрузке файла: ' + (error as Error).message);
    } finally {
      setUploading(false);
      // Сбрасываем значение input
      if (event.target) {
        event.target.value = '';
      }
    }
  };

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Icon name="MessageSquare" size={24} />
          Парсер Telegram
        </CardTitle>
        <CardDescription>
          Инструмент для сбора данных участников из Telegram чата
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={copyScript} variant="default">
            <Icon name="Copy" size={16} className="mr-2" />
            Скопировать скрипт
          </Button>
          <Button 
            onClick={() => setShowInstructions(!showInstructions)} 
            variant="outline"
          >
            <Icon name={showInstructions ? "ChevronUp" : "ChevronDown"} size={16} className="mr-2" />
            {showInstructions ? 'Скрыть' : 'Показать'} инструкцию
          </Button>
          
          <FileUploader
            uploading={uploading}
            uploadProgress={uploadProgress}
            onFileUpload={handleFileUpload}
          />
        </div>

        {uploadResult && <UploadResult result={uploadResult} />}

        {showInstructions && <Instructions />}
      </CardContent>
    </Card>
  );
};

export default TelegramParser;