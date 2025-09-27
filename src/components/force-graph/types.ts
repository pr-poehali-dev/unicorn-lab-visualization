import * as d3 from 'd3-force';
import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';

export interface ForceGraphProps {
  nodes: Entrepreneur[];
  edges: GraphEdge[];
  onNodeClick: (node: Entrepreneur, position: { x: number, y: number }) => void;
  selectedCluster?: string | null;
  clusterColors: Record<string, string>;
}

export interface SimulationNode extends d3.SimulationNodeDatum {
  id: string;
  x: number;
  y: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  data: Entrepreneur;
}

export interface NodePosition {
  x: number;
  y: number;
  fx: number | null;
  fy: number | null;
}