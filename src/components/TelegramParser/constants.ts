export const TELEGRAM_PARSER_SCRIPT = `async function collectAllParticipants() {
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