import React from 'react';

const Instructions: React.FC = () => {
  return (
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
  );
};

export default Instructions;