import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { Entrepreneur } from '@/types/entrepreneur';
import { TagsConfig } from '@/services/tagsService';

interface ParticipantPopupProps {
  participant: Entrepreneur;
  position: { x: number; y: number };
  tagsConfig: TagsConfig | null;
  onClose: () => void;
  popupRef: React.RefObject<HTMLDivElement>;
}

const ParticipantPopup: React.FC<ParticipantPopupProps> = ({
  participant,
  position,
  tagsConfig,
  onClose,
  popupRef
}) => {
  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-background border rounded-lg shadow-xl p-4 max-w-sm popup-fade-in"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: position.y < 400 
          ? 'translate(-50%, 10px)' // Если нода высоко - показываем попап снизу
          : 'translate(-50%, -100%) translateY(-10px)' // Если нода низко - показываем попап сверху
      }}
    >
      {/* Заголовок с кнопкой закрытия */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg">{participant.name}</h3>
            {/* Кластер справа от имени */}
            <div className="flex items-center gap-1.5">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: tagsConfig?.clusterColors[participant.cluster] || '#666' }}
              />
              <span className="text-sm text-muted-foreground">{participant.cluster}</span>
            </div>
          </div>
          {participant.goal && (
            <div className="mt-2 p-2 bg-primary/10 rounded-md border border-primary/20">
              <div className="flex items-center gap-2">
                <Icon name="Target" size={16} className="text-primary" />
                <p className="text-sm font-medium text-primary">Цель:</p>
              </div>
              <p className="text-sm mt-1">{participant.goal}</p>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-6 w-6 -mr-1 -mt-1 ml-2"
        >
          <Icon name="X" size={14} />
        </Button>
      </div>
      
      {/* Описание */}
      {participant.description && (
        <p className="text-sm text-muted-foreground mb-3">
          {participant.description}
        </p>
      )}
      
      {/* Теги */}
      {participant.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {participant.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      
      {/* Кнопка перехода на пост */}
      {participant.postUrl && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-3 uppercase border border-primary/20 hover:bg-primary/10"
          onClick={() => window.open(participant.postUrl, '_blank')}
        >
          ПОЗНАКОМИТЬСЯ В UNICORN LAB
        </Button>
      )}
    </div>
  );
};

export default ParticipantPopup;