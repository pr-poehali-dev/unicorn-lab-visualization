import React from 'react';
import { Button } from '@/components/ui/button';
import Icon from '@/components/ui/icon';

interface GraphControlsProps {
  showParser: boolean;
  loading: boolean;
  filteredCount: number;
  forceGraphRef: React.MutableRefObject<any>;
  onToggleParser: () => void;
}

const GraphControls: React.FC<GraphControlsProps> = ({
  showParser,
  loading,
  filteredCount,
  forceGraphRef,
  onToggleParser
}) => {
  return (
    <>
      {/* Счетчик узлов и кнопка сброса */}
      <div className="absolute top-8 right-8 flex items-center gap-2">
        <Button
          onClick={onToggleParser}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title={showParser ? 'Скрыть парсер' : 'Показать парсер'}
        >
          <Icon name="Upload" size={16} />
        </Button>
        <Button
          onClick={() => forceGraphRef.current?.resetNodePositions()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
        >
          <Icon name="RotateCcw" size={16} />
        </Button>
      </div>

      {/* Кнопки управления зумом */}
      <div className="absolute bottom-20 right-8 flex flex-col gap-2">
        <Button
          onClick={() => forceGraphRef.current?.zoomIn()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Увеличить"
        >
          <Icon name="Plus" size={16} />
        </Button>
        <Button
          onClick={() => forceGraphRef.current?.zoomOut()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Уменьшить"
        >
          <Icon name="Minus" size={16} />
        </Button>
        <Button
          onClick={() => forceGraphRef.current?.resetView()}
          variant="outline"
          size="icon"
          className="bg-background/90 backdrop-blur h-8 w-8"
          title="Сбросить вид"
        >
          <Icon name="Maximize" size={16} />
        </Button>
      </div>
    </>
  );
};

export default GraphControls;