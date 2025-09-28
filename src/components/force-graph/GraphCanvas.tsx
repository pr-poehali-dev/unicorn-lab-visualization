import React from 'react';

interface GraphCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  dimensions: { width: number; height: number };
  hoveredNodeId: string | null;
  handleMouseDown: (e: React.MouseEvent) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: (e: React.MouseEvent) => void;
  handleMouseLeave: (e: React.MouseEvent) => void;
  handleMouseEnter: (e: React.MouseEvent) => void;
  handleWheel: (e: React.WheelEvent) => void;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({
  canvasRef,
  dimensions,
  hoveredNodeId,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleMouseLeave,
  handleMouseEnter,
  handleWheel
}) => {
  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          display: 'block',
          position: 'absolute',
          top: 0,
          left: 0
        }}
        className="pointer-events-none"
      />
      <div
        style={{
          width: dimensions.width + 'px',
          height: dimensions.height + 'px',
          position: 'absolute',
          top: 0,
          left: 0,
          cursor: hoveredNodeId ? 'pointer' : 'grab'
        }}
        className="active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseEnter={handleMouseEnter}
        onPointerMove={handleMouseMove}
        onPointerLeave={handleMouseLeave}
        onWheel={handleWheel}
      />
    </>
  );
};