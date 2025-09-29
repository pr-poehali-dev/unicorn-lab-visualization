import { useEffect, useState } from 'react';
import * as d3 from 'd3-force';

interface UseCanvasResizeProps {
  containerRef: React.RefObject<HTMLDivElement>;
  canvasRef: React.RefObject<HTMLCanvasElement>;
  simulationRef: React.MutableRefObject<any>;
}

export function useCanvasResize({ 
  containerRef, 
  canvasRef, 
  simulationRef 
}: UseCanvasResizeProps) {
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && canvasRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const newWidth = Math.floor(rect.width);
        const newHeight = Math.floor(rect.height);
        
        // Получаем devicePixelRatio для HiDPI дисплеев
        // Для Safari ограничиваем devicePixelRatio для лучшей производительности
        const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
        const maxDpr = isSafari ? 2 : 3; // Ограничиваем DPR для Safari
        const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
        
        // Устанавливаем физические размеры canvas с учетом DPR
        canvasRef.current.width = newWidth * dpr;
        canvasRef.current.height = newHeight * dpr;
        
        // Масштабируем контекст для четкой отрисовки
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        setDimensions({ width: newWidth, height: newHeight });
        
        // Перезапускаем симуляцию с новым центром
        if (simulationRef.current) {
          simulationRef.current.force('center', d3.forceCenter(newWidth / 2, newHeight / 2));
          simulationRef.current.alpha(0.1).restart();
        }
      }
    };

    // Начальная установка размеров
    handleResize();
    
    window.addEventListener('resize', handleResize);
    
    // Наблюдатель за изменением размеров контейнера
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, [containerRef, canvasRef, simulationRef]);

  return dimensions;
}