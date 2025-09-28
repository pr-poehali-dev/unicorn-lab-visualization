import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  related_users_ids?: string[];
}

interface AIAssistantProps {
  entrepreneurs?: any[];
  onSelectUsers: (userIds: string[]) => void;
  isVisible?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ entrepreneurs, onSelectUsers, isVisible }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load messages from localStorage on mount
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai-assistant-messages');
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        setMessages(parsed.slice(-20)); // Keep only last 20 messages
      } catch (e) {
        console.error('Failed to load messages from localStorage');
      }
    }
  }, []);

  // Save messages to localStorage when they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('ai-assistant-messages', JSON.stringify(messages.slice(-20)));
    }
  }, [messages]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto-focus on input when component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = '0px';
      const scrollHeight = inputRef.current.scrollHeight;
      inputRef.current.style.height = Math.min(scrollHeight, 200) + 'px';
    }
  }, [input]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    
    // Add user message
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('https://functions.poehali.dev/3a07f334-23a1-47ed-931c-c00deaa3ff1f', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: newMessages.slice(-20) // Send last 20 messages
        })
      });

      if (!response.ok) {
        throw new Error('Failed to get response from AI');
      }

      const data = await response.json();
      
      // Add assistant response
      setMessages([...newMessages, {
        role: 'assistant',
        content: data.completion_text,
        related_users_ids: data.related_users_ids
      }]);

      // If there are related users, offer to show them
      if (data.related_users_ids && data.related_users_ids.length > 0) {
        // Auto-select users after a short delay
        setTimeout(() => {
          onSelectUsers(data.related_users_ids);
        }, 500);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Ошибка при отправке сообщения');
    } finally {
      setIsLoading(false);
    }
  };

  const clearHistory = () => {
    setMessages([]);
    localStorage.removeItem('ai-assistant-messages');
    toast.success('История очищена');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">AI Ассистент</h3>
        {messages.length > 0 && (
          <Button
            variant="ghost"
            size="icon"
            onClick={clearHistory}
            title="Очистить историю"
            className="h-8 w-8"
          >
            <Icon name="Trash2" size={16} />
          </Button>
        )}
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Icon name="MessageCircle" size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Задайте вопрос об участниках сообщества</p>
            <p className="text-xs mt-2">Например: "Найди разработчиков для AI проекта"</p>
          </div>
        )}
        
        <div className="space-y-6">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}
            >
              {/* Avatar for assistant */}
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Icon name="Bot" size={16} className="text-primary" />
                </div>
              )}
              
              <div className={`max-w-[70%] ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted/50 text-foreground'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                  {message.related_users_ids && message.related_users_ids.length > 0 && (
                    <button
                      onClick={() => onSelectUsers(message.related_users_ids!)}
                      className="mt-3 text-xs flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
                    >
                      <Icon name="Users" size={14} />
                      Показать {message.related_users_ids.length} участников
                    </button>
                  )}
                </div>
              </div>

              {/* Avatar for user */}
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 order-2">
                  <Icon name="User" size={16} />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon name="Bot" size={16} className="text-primary" />
              </div>
              <div className="bg-muted/50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                    <div className="w-2 h-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="relative max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Отправьте сообщение..."
            disabled={isLoading}
            className="w-full resize-none rounded-2xl border bg-background px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '200px'
            }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute bottom-2 right-2 rounded-xl p-2 transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Icon 
              name={isLoading ? "Loader2" : "ArrowUp"} 
              size={20} 
              className={isLoading ? "animate-spin" : ""}
            />
          </button>
        </div>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Нажмите Enter для отправки, Shift+Enter для новой строки
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;