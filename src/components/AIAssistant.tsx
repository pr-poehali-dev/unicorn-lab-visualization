import React, { useState, useEffect, useRef } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  related_users_ids?: string[];
}

interface AIAssistantProps {
  entrepreneurs?: any[];
  onSelectUsers: (userIds: string[]) => void;
  isVisible?: boolean;
  onClose?: () => void;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ entrepreneurs, onSelectUsers, isVisible, onClose }) => {
  const isMobile = useIsMobile();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
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

  // Scroll to bottom function with smooth animation
  const scrollToBottom = (smooth = true) => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTo({
          top: scrollElement.scrollHeight,
          behavior: smooth ? 'smooth' : 'auto'
        });
      }
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Scroll to bottom when loading state changes
  useEffect(() => {
    if (isLoading) {
      // Small delay to ensure loading indicator is rendered
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [isLoading]);

  // Scroll to bottom on initial load (when messages are loaded from localStorage)
  useEffect(() => {
    // Use instant scroll on initial load
    setTimeout(() => scrollToBottom(false), 100);
  }, []);

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
    
    // Scroll to bottom after user message
    setTimeout(() => scrollToBottom(), 50);

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



  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Mobile header with close button */}
      {isMobile && onClose && (
        <div className="flex items-center justify-between p-4 border-b relative z-50">
          <h3 className="font-semibold text-lg">ИИ Ассистент</h3>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="h-8 w-8"
          >
            <Icon name="X" size={20} />
          </Button>
        </div>
      )}
      
      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1">
        <div className={`p-6 ${messages.length === 0 ? 'min-h-full flex items-center justify-center' : ''}`}>
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground">
              <Icon name="MessageCircleHeart" size={48} className="mx-auto mb-4 opacity-20" />
              <p className="text-sm">Задайте вопрос об участниках сообщества</p>
              <p className="text-xs mt-2">Например: «Найди разработчиков для ИИ проекта»</p>
            </div>
          ) : (
            <div className="space-y-8">
          {messages.map((message, index) => (
            <div key={index} className="w-full">
              {message.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="max-w-[70%] bg-[#2f2f2f] text-white rounded-3xl px-5 py-3">
                    <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                  </div>
                </div>
              ) : (
                <div className="w-full">
                  <p className="text-[15px] leading-relaxed whitespace-pre-wrap text-foreground">
                    {message.content}
                  </p>
                  {message.related_users_ids && message.related_users_ids.length > 0 && (
                    <button
                      onClick={() => onSelectUsers(message.related_users_ids!)}
                      className="mt-3 text-sm text-primary hover:text-primary/80 flex items-center gap-2 transition-colors"
                    >
                      <Icon name="Users" size={16} />
                      Показать {message.related_users_ids.length} участников
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
              
              {isLoading && (
            <div className="w-full">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Icon name="Loader2" size={16} className="animate-spin" />
                <span className="text-sm">Думаю...</span>
              </div>
            </div>
            )}
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="border-t p-4">
        <div className="relative max-w-3xl mx-auto">
          <div className="relative flex items-end bg-[#2f2f2f] rounded-3xl">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Отправьте сообщение..."
              disabled={isLoading}
              className="w-full bg-transparent text-white placeholder:text-gray-400 resize-none px-5 py-3.5 pr-20 text-[15px] focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              rows={1}
              style={{
                minHeight: '52px',
                maxHeight: '200px'
              }}
            />
            {messages.length > 0 && (
              <button
                onClick={() => setShowDeleteDialog(true)}
                className="absolute right-11 bottom-3 text-gray-400 hover:text-orange-500 transition-colors p-1.5"
                title="Очистить историю"
              >
                <Icon name="Trash" size={16} />
              </button>
            )}
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className={`absolute right-2 bottom-2.5 w-8 h-8 rounded-full transition-all flex items-center justify-center ${
                input.trim() && !isLoading 
                  ? 'bg-white text-black hover:bg-gray-200' 
                  : 'bg-[#424242] text-gray-500 cursor-not-allowed'
              }`}
            >
              <Icon 
                name="ArrowUp" 
                size={18} 
                className="stroke-2"
              />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Очистить историю чата?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Вся история переписки будет удалена.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setMessages([]);
                localStorage.removeItem('ai-assistant-messages');
                toast.success('История очищена');
                setShowDeleteDialog(false);
              }}
            >
              Очистить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIAssistant;