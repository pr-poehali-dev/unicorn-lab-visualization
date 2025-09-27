import React, { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import Icon from './ui/icon';
import { toast } from 'sonner';
import { Progress } from './ui/progress';

const TELEGRAM_PARSER_SCRIPT = `async function collectAllParticipants() {
  // ⚙️ КОНФИГУРАЦИЯ
  const CONFIG = {
    // Скролл
    scrollStepSize: 300,
    scrollDelay: 50,
    longPauseEvery: 100,
    longPauseDelay: 150,
    
    // Лимиты
    maxSteps: 10000,
    maxNoNewCount: 1000,
    
    // Чат
    chatId: '2599590153',       
    topicId: '1237',            
    
    // Парсинг
    searchTag: '#знакомство',   
    
    // Задержки
    initialDelay: 1000,         
  };
  
  // Инициализация
  const participants = new Map();
  const messageList = document.querySelector('.MessageList.custom-scroll');
  const problematicMessages = [];
  const missedMessages = []; // Для отладки пропущенных
  
  if (!messageList) {
    console.error('❌ MessageList не найден!');
    return;
  }
  
  let processedMessageIds = new Set();
  let noNewMessagesCount = 0;
  
  function parseMessages() {
    let newCount = 0;
    const messages = Array.from(document.querySelectorAll('.Message'));
    
    messages.forEach(msg => {
      const messageId = msg.getAttribute('data-message-id');
      
      // Пропускаем уже обработанные
      if (processedMessageIds.has(messageId)) return;
      
      const textContent = msg.querySelector('.text-content');
      if (!textContent) return;
      
      // Проверяем наличие тега (РЕГИСТРОНЕЗАВИСИМО)
      const text = textContent.innerText.trim();
      const lowerText = text.toLowerCase();
      const searchTagLower = CONFIG.searchTag.toLowerCase();
      
      if (!lowerText.includes(searchTagLower)) {
        // Проверяем альтернативные написания
        const alternativeTags = ['#знакомство', '#Знакомство', '#ЗНАКОМСТВО'];
        const hasTag = alternativeTags.some(tag => text.includes(tag));
        
        if (!hasTag) {
          // Если есть форвард, проверяем что это точно не наше сообщение
          if (msg.querySelector('.forward-title') && text.length > 100) {
            missedMessages.push({
              messageId,
              preview: text.substring(0, 50) + '...',
              hasForward: true
            });
          }
          return;
        }
      }
      
      let author, authorId, avatarUrl;
      
      // Проверяем разные типы сообщений
      const isOwnMessage = msg.classList.contains('own');
      const isForwarded = msg.querySelector('.is-forwarded') || msg.querySelector('.forward-title');
      
      if (isOwnMessage) {
        // Для собственных сообщений
        const nameMatch = text.match(/^([А-ЯЁа-яё\\s]+),/);
        author = nameMatch ? nameMatch[1].trim() : 'Я (собственное сообщение)';
        authorId = \`self_\${messageId}\`;
        avatarUrl = null;
      } else if (isForwarded) {
        // Для форвардов
        const forwardAvatar = msg.querySelector('.forward-avatar');
        if (forwardAvatar) {
          authorId = forwardAvatar.getAttribute('data-peer-id');
          // Берем имя из alt атрибута или из sender-title
          const imgAlt = forwardAvatar.querySelector('img')?.alt;
          const senderTitle = msg.querySelector('.sender-title')?.innerText;
          author = imgAlt || senderTitle || 'Неизвестно';
          avatarUrl = forwardAvatar.querySelector('img')?.src;
          
          console.log(\`📧 Форвард от: \${author} (\${authorId})\`);
        } else {
          console.log(\`⚠️ Форвард без аватара в сообщении \${messageId}\`);
        }
      } else {
        // Для обычных сообщений
        const container = msg.closest('.sender-group-container');
        if (container) {
          const avatar = container.querySelector('.Avatar');
          authorId = avatar?.getAttribute('data-peer-id');
          author = avatar?.querySelector('img')?.alt || 'Неизвестно';
          avatarUrl = avatar?.querySelector('img')?.src;
        }
      }
      
      // Если не нашли authorId, создаем искусственный
      if (!authorId) {
        authorId = \`unknown_\${messageId}\`;
        author = author || \`Неизвестный автор (msg: \${messageId})\`;
        
        problematicMessages.push({
          messageId,
          text: text.substring(0, 100) + '...',
          isForwarded,
          hasAvatar: !!msg.querySelector('.Avatar, .forward-avatar')
        });
        
        console.log(\`⚠️ Не найден authorId для сообщения \${messageId}\`);
      }
      
      // Проверяем дубликаты (для unknown разрешаем)
      if (participants.has(authorId) && !authorId.startsWith('unknown_')) {
        return;
      }
      
      // Чистим текст
      const textClone = textContent.cloneNode(true);
      textClone.querySelector('.message-time')?.remove();
      textClone.querySelector('.Reactions')?.remove();
      textClone.querySelector('.message-signature')?.remove();
      textClone.querySelector('.MessageOutgoingStatus')?.remove();
      const cleanText = textClone.innerText.trim();
      
      // Пытаемся извлечь имя из текста
      if (author.includes('Неизвестный')) {
        // Ищем паттерны: "Привет, я Сергей" или "Сергей Петров,"
        const namePatterns = [
          /Привет,?\\s*я\\s+([А-ЯЁ][а-яё]+)/,
          /^([А-ЯЁ][а-яё]+\\s+[А-ЯЁ][а-яё]+),/,
          /Меня зовут\\s+([А-ЯЁ][а-яё]+(?:\\s+[А-ЯЁ][а-яё]+)?)/
        ];
        
        for (const pattern of namePatterns) {
          const match = cleanText.match(pattern);
          if (match) {
            author = match[1];
            break;
          }
        }
      }
      
      participants.set(authorId, {
        author: author,
        authorId: authorId,
        avatarUrl: avatarUrl,
        messageLink: \`https://t.me/c/\${CONFIG.chatId}/\${CONFIG.topicId}/\${messageId}\`,
        text: cleanText,
        isForwarded: !!isForwarded,
        isOwn: !!isOwnMessage,
        isUnknown: authorId.startsWith('unknown_')
      });
      
      processedMessageIds.add(messageId);
      newCount++;
    });
    
    return newCount;
  }
  
  // Остальной код без изменений...
  async function scrollStep() {
    const currentScroll = messageList.scrollTop;
    
    const newCount = parseMessages();
    
    if (newCount > 0) {
      console.log(\`✅ +\${newCount} новых → всего: \${participants.size}\`);
      noNewMessagesCount = 0;
    } else {
      noNewMessagesCount++;
    }
    
    if (currentScroll <= 0) {
      console.log('📍 Достигнут верх чата');
      await new Promise(resolve => setTimeout(resolve, 1000));
      parseMessages();
      return false;
    }
    
    if (noNewMessagesCount > CONFIG.maxNoNewCount) {
      console.log(\`⚠️ Нет новых сообщений уже \${CONFIG.maxNoNewCount} шагов\`);
      return false;
    }
    
    messageList.scrollTop = Math.max(0, currentScroll - CONFIG.scrollStepSize);
    await new Promise(resolve => setTimeout(resolve, CONFIG.scrollDelay));
    
    return true;
  }
  
  console.log('🚀 Начинаем сбор участников...');
  console.log(\`📋 Ищем теги: #знакомство, #Знакомство, #ЗНАКОМСТВО\`);
  
  messageList.scrollTop = messageList.scrollHeight;
  await new Promise(resolve => setTimeout(resolve, CONFIG.initialDelay));
  
  parseMessages();
  
  let steps = 0;
  const startTime = Date.now();
  
  while (await scrollStep() && steps < CONFIG.maxSteps) {
    steps++;
    
    if (steps % CONFIG.longPauseEvery === 0) {
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      console.log(\`📊 Шаг \${steps} | \${participants.size} участников | \${elapsed}с\`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.longPauseDelay));
      parseMessages();
    }
  }
  
  console.log('🔄 Финальный проход...');
  messageList.scrollTop = 0;
  await new Promise(resolve => setTimeout(resolve, 1000));
  parseMessages();
  
  const result = Array.from(participants.values());
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  
  const jsonData = JSON.stringify(result, null, 2);
  const blob = new Blob([jsonData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = \`participants_\${CONFIG.searchTag.replace('#', '')}_\${new Date().toISOString().split('T')[0]}.json\`;
  a.click();
  
  console.log(\`\\n✅ ГОТОВО!\`);
  console.log(\`📊 Статистика:\`);
  console.log(\`   - Участников: \${result.length}\`);
  console.log(\`   - Времени: \${elapsed} секунд\`);
  
  const forwarded = result.filter(p => p.isForwarded).length;
  const own = result.filter(p => p.isOwn).length;
  const unknown = result.filter(p => p.isUnknown).length;
  console.log(\`   - Обычных: \${result.length - forwarded - own - unknown}\`);
  console.log(\`   - Форвардов: \${forwarded}\`);
  console.log(\`   - Собственных: \${own}\`);
  console.log(\`   - Неопознанных: \${unknown}\`);
  
  if (problematicMessages.length > 0) {
    console.log(\`\\n⚠️ Проблемные сообщения (\${problematicMessages.length}):\`);
    problematicMessages.slice(0, 3).forEach(m => {
      console.log(\`- ID: \${m.messageId}, форвард: \${m.isForwarded}, есть аватар: \${m.hasAvatar}\`);
    });
  }
  
  return result;
}

// Запустить
collectAllParticipants();`;

const TelegramParser: React.FC = () => {
  const [showInstructions, setShowInstructions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      
      // Обрабатываем в батчах по 10 для избежания таймаутов
      const batchSize = 10;
      const totalBatches = Math.ceil(participants.length / batchSize);
      let totalImported = 0;
      let totalUpdated = 0;
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
        total: participants.length,
        connections_created: totalConnections,
        clusters: allClusters
      });
      
      toast.success(`Обработка завершена! Импортировано: ${totalImported}, обновлено: ${totalUpdated}`);
      
      // Перезагружаем страницу через 2 секунды
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Ошибка при загрузке файла: ' + (error as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
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
          
          <div className="flex items-center gap-2 ml-auto">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="json-upload"
            />
            <label htmlFor="json-upload">
              <Button 
                variant="outline" 
                disabled={uploading}
                className="cursor-pointer"
                asChild
              >
                <span>
                  <Icon name={uploading ? "Loader2" : "Upload"} size={16} className={uploading ? "mr-2 animate-spin" : "mr-2"} />
                  {uploading ? 'Обработка...' : 'Загрузить JSON'}
                </span>
              </Button>
            </label>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <Progress value={uploadProgress} className="h-2" />
            <p className="text-sm text-muted-foreground">
              {uploadProgress < 30 && 'Читаем файл...'}
              {uploadProgress >= 30 && uploadProgress < 70 && 'Анализируем участников с помощью AI...'}
              {uploadProgress >= 70 && uploadProgress < 100 && 'Сохраняем в базу данных...'}
              {uploadProgress === 100 && 'Готово!'}
            </p>
          </div>
        )}

        {uploadResult && (
          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-semibold mb-2">✅ Результаты импорта:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Новых участников: <span className="font-semibold">{uploadResult.imported}</span></div>
              <div>Обновлено: <span className="font-semibold">{uploadResult.updated}</span></div>
              <div>Всего обработано: <span className="font-semibold">{uploadResult.total}</span></div>
              <div>Создано связей: <span className="font-semibold">{uploadResult.connections_created}</span></div>
            </div>
            {uploadResult.clusters && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Распределение по кластерам:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(uploadResult.clusters).map(([cluster, count]) => (
                    <span key={cluster} className="text-xs bg-background px-2 py-1 rounded">
                      {cluster}: {count as number}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {showInstructions && (
          <div className="space-y-4 text-sm">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📋 Инструкция по использованию:</h4>
              <ol className="list-decimal list-inside space-y-2">
                <li>Откройте веб-версию Telegram: <a href="https://web.telegram.org" target="_blank" rel="noopener noreferrer" className="text-primary underline">web.telegram.org</a></li>
                <li>Перейдите в нужный чат и топик</li>
                <li>Откройте консоль браузера (F12 → Console)</li>
                <li>Вставьте скопированный скрипт и нажмите Enter</li>
                <li>Дождитесь окончания сбора (автоматический скролл)</li>
                <li>JSON файл с данными скачается автоматически</li>
              </ol>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">⚙️ Настройки в скрипте:</h4>
              <ul className="space-y-1">
                <li><code className="bg-background px-1 rounded">chatId</code> - ID чата (из URL)</li>
                <li><code className="bg-background px-1 rounded">topicId</code> - ID топика</li>
                <li><code className="bg-background px-1 rounded">searchTag</code> - тег для поиска (#знакомство)</li>
                <li><code className="bg-background px-1 rounded">scrollDelay</code> - задержка между шагами (мс)</li>
                <li><code className="bg-background px-1 rounded">maxSteps</code> - максимум шагов скролла</li>
              </ul>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">📊 Что собирает скрипт:</h4>
              <ul className="list-disc list-inside space-y-1">
                <li>Имя автора</li>
                <li>ID автора в Telegram</li>
                <li>Ссылку на сообщение</li>
                <li>Текст сообщения</li>
                <li>URL аватара (если есть)</li>
                <li>Тип сообщения (обычное/форвард/собственное)</li>
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramParser;