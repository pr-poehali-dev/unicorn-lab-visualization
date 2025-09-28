import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  related_users_ids?: number[];
}

interface AIAssistantProps {
  entrepreneurs?: any[];
  onSelectUsers: (userIds: number[]) => void;
  isVisible?: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ entrepreneurs, onSelectUsers, isVisible }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <Icon name="MessageCircle" size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-sm">Задайте вопрос об участниках сообщества</p>
            <p className="text-xs mt-2">Например: "Найди разработчиков для AI проекта"</p>
          </div>
        )}
        
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                {message.related_users_ids && message.related_users_ids.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <button
                      onClick={() => onSelectUsers(message.related_users_ids!)}
                      className="text-xs opacity-80 hover:opacity-100 flex items-center gap-1"
                    >
                      <Icon name="Users" size={14} />
                      Показать {message.related_users_ids.length} участников
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <div className="animate-spin">
                    <Icon name="Loader2" size={16} />
                  </div>
                  <span className="text-sm">Думаю...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex gap-2"
        >
          {messages.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              title="Очистить историю"
            >
              <Icon name="Trash2" size={16} />
            </Button>
          )}
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Задайте вопрос..."
            disabled={isLoading}
            className="flex-1"
          />
          <Button type="submit" disabled={isLoading || !input.trim()}>
            <Icon name="Send" size={16} />
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;