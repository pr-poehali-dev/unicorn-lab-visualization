import React from 'react';
import { Entrepreneur } from '@/types/entrepreneur';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface NodePopupProps {
  participant: Entrepreneur;
  position: { x: number; y: number };
  onClose: () => void;
}

const NodePopup: React.FC<NodePopupProps> = ({ participant, position, onClose }) => {
  // Определяем позицию попапа чтобы не выходил за границы экрана
  const popupWidth = 320;
  const popupHeight = 400;
  const padding = 40; // Увеличиваем отступ от краев
  const nodeOffset = 20; // Отступ от ноды
  
  // По умолчанию центрируем попап относительно позиции клика
  let left = position.x - popupWidth / 2;
  let top = position.y - popupHeight - nodeOffset;
  
  // Проверяем, где находится нода относительно центра экрана
  const screenCenterX = window.innerWidth / 2;
  const isNodeNearLeftEdge = position.x < popupWidth / 2 + padding;
  const isNodeNearRightEdge = position.x > window.innerWidth - popupWidth / 2 - padding;
  
  // Определяем положение стрелки
  let arrowPosition = '50%'; // по умолчанию по центру
  
  // Если нода слишком близко к левому краю
  if (isNodeNearLeftEdge) {
    // Показываем попап справа от ноды
    left = position.x + nodeOffset;
    // Ограничиваем минимальным отступом от края
    if (left < padding) {
      left = padding;
    }
    // Вычисляем позицию стрелки относительно попапа
    arrowPosition = `${Math.max(12, position.x - left)}px`;
  }
  // Если нода слишком близко к правому краю
  else if (isNodeNearRightEdge) {
    // Показываем попап слева от ноды
    left = position.x - popupWidth - nodeOffset;
    // Ограничиваем максимальным отступом от края
    if (left + popupWidth > window.innerWidth - padding) {
      left = window.innerWidth - popupWidth - padding;
    }
    // Вычисляем позицию стрелки относительно попапа
    arrowPosition = `${Math.min(popupWidth - 12, position.x - left)}px`;
  }
  // Если нода в центре, но попап выходит за края
  else {
    // Проверка правой границы экрана
    if (left + popupWidth > window.innerWidth - padding) {
      left = window.innerWidth - popupWidth - padding;
      arrowPosition = `${position.x - left}px`;
    }
    // Проверка левой границы экрана
    else if (left < padding) {
      left = padding;
      arrowPosition = `${position.x - left}px`;
    }
  }
  
  // Проверка верхней границы
  if (top < padding) {
    top = position.y + nodeOffset + 40; // Показываем снизу от ноды
  }

  return (
    <>
      {/* Затемнение фона при клике вне попапа */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
      />
      
      {/* Попап */}
      <div 
        className="fixed z-50 bg-card border rounded-lg shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-200"
        style={{
          left: `${left}px`,
          top: `${top}px`,
          width: `${popupWidth}px`,
          maxHeight: `${popupHeight}px`
        }}
      >
        {/* Кнопка закрытия */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 rounded-md hover:bg-accent transition-colors"
        >
          <Icon name="X" size={16} className="text-muted-foreground" />
        </button>

        {/* Аватар и имя */}
        <div className="flex items-start gap-4 mb-4">
          <div className="text-5xl">{participant.avatar}</div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{participant.name}</h3>
            <p className="text-sm text-muted-foreground">{participant.role}</p>
            <Badge variant="outline" className="mt-1">
              {participant.cluster}
            </Badge>
          </div>
        </div>

        {/* Описание */}
        <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
          {participant.description}
        </p>

        {/* Теги */}
        <div className="mb-4">
          <h4 className="text-xs font-medium mb-2 text-muted-foreground">Интересы</h4>
          <div className="flex flex-wrap gap-1">
            {participant.tags.slice(0, 6).map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
            {participant.tags.length > 6 && (
              <Badge variant="outline" className="text-xs">
                +{participant.tags.length - 6}
              </Badge>
            )}
          </div>
        </div>

        {/* Контакты */}
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Mail" size={16} />
            <span className="truncate">{participant.email}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Icon name="Phone" size={16} />
            <span>{participant.phone}</span>
          </div>
        </div>

        {/* Стрелка указывающая на узел */}
        <div 
          className="absolute w-3 h-3 bg-card border-l border-b rotate-45"
          style={{
            bottom: '-7px',
            left: arrowPosition,
            transform: `translateX(-50%) rotate(45deg)`
          }}
        />
      </div>
    </>
  );
};

export default NodePopup;