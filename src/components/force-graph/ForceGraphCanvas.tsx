import React from 'react';
import { SimulationNode } from './types';

interface ForceGraphCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  dimensions: { width: number; height: number };
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleMouseLeave: () => void;
}

export const ForceGraphCanvas: React.FC<ForceGraphCanvasProps> = ({
  canvasRef,
  dimensions,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave
}) => {
  return (
    <canvas
      ref={canvasRef}
      style={{
        width: dimensions.width + 'px',
        height: dimensions.height + 'px',
        display: 'block'
      }}
      className="cursor-grab active:cursor-grabbing"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};