import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface PopoverProps {
  isOpen: boolean;
  onClose: () => void;
  anchorEl: HTMLElement | null;
  children: React.ReactNode;
  placement?: 'bottom' | 'top' | 'left' | 'right';
  offset?: number;
}

const Popover: React.FC<PopoverProps> = ({ 
  isOpen, 
  onClose, 
  anchorEl, 
  children, 
  placement = 'bottom',
  offset = 8 
}) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !anchorEl) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node) &&
          !anchorEl.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose, anchorEl]);

  useEffect(() => {
    if (!isOpen || !anchorEl || !popoverRef.current) return;

    const updatePosition = () => {
      const anchorRect = anchorEl.getBoundingClientRect();
      const popover = popoverRef.current;
      if (!popover) return;

      // Сброс для расчета размеров
      popover.style.maxWidth = '90vw';
      popover.style.maxHeight = '90vh';

      const popoverRect = popover.getBoundingClientRect();
      
      let top = 0;
      let left = 0;

      switch (placement) {
        case 'bottom':
          top = anchorRect.bottom + offset;
          left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
          break;
        case 'top':
          top = anchorRect.top - popoverRect.height - offset;
          left = anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2;
          break;
        case 'left':
          top = anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2;
          left = anchorRect.left - popoverRect.width - offset;
          break;
        case 'right':
          top = anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2;
          left = anchorRect.right + offset;
          break;
      }

      // Корректировка для viewport
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left < 8) left = 8;
      if (left + popoverRect.width > viewportWidth - 8) {
        left = viewportWidth - popoverRect.width - 8;
      }

      if (top < 8) top = 8;
      if (top + popoverRect.height > viewportHeight - 8) {
        top = viewportHeight - popoverRect.height - 8;
      }

      popover.style.top = `${top}px`;
      popover.style.left = `${left}px`;
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, anchorEl, placement, offset]);

  if (!isOpen || !anchorEl) return null;

  return createPortal(
    <div
      ref={popoverRef}
      className="fixed z-50 bg-background border rounded-lg shadow-xl animate-in fade-in-0 zoom-in-95"
      style={{ position: 'fixed' }}
    >
      {children}
    </div>,
    document.body
  );
};

export default Popover;