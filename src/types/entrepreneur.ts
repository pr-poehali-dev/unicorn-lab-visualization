export interface Entrepreneur {
  id: string;
  name: string;
  avatar: string;
  description: string;
  tags: string[];
  cluster: string;
  position: {
    x: number;
    y: number;
  };
  role?: string;
  postUrl?: string;
  goal?: string;
  emoji?: string;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight?: number;
}