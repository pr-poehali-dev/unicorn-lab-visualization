import { Entrepreneur, GraphEdge } from "@/types/entrepreneur";

const API_URLS = {
  getParticipants:
    "https://functions.poehali.dev/7e57c4aa-6302-4340-8648-d25ebb52312e",
  importParticipants:
    "https://functions.poehali.dev/eb47b524-75f9-4c36-8ba4-13e4d746f257",
};

export interface ParticipantsResponse {
  participants: Array<{
    id: number;
    telegram_id: string;
    username: string;
    name: string;
    role: string;
    cluster: string;
    description: string;
    tags: string[];
    post_url: string | null;
    goal: string | null;
    emoji: string | null;
    created_at: string;
    updated_at: string;
  }>;
  connections: Array<{
    source: number;
    target: number;
    type: string;
    strength: number;
  }>;
  total: number;
}

export interface ImportResponse {
  success: boolean;
  imported: number;
  updated: number;
  total: number;
  errors: Array<{
    participant: string;
    error: string;
  }>;
}

export class ApiService {
  static async getParticipants(
    search?: string,
    cluster?: string,
  ): Promise<ParticipantsResponse> {
    const params = new URLSearchParams();
    if (search) params.append("search", search);
    if (cluster && cluster !== "Все") params.append("cluster", cluster);

    const response = await fetch(`${API_URLS.getParticipants}?${params}`);
    if (!response.ok) throw new Error("Failed to fetch participants");

    return response.json();
  }

  static async importParticipants(
    participants: any[],
  ): Promise<ImportResponse> {
    const response = await fetch(API_URLS.importParticipants, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ participants }),
    });

    if (!response.ok) throw new Error("Failed to import participants");

    return response.json();
  }

  static transformToEntrepreneurs(data: ParticipantsResponse): {
    entrepreneurs: Entrepreneur[];
    edges: GraphEdge[];
  } {
    const entrepreneurs: Entrepreneur[] = data.participants.map((p) => ({
      id: p.telegram_id || p.id.toString(),
      name: p.name,
      avatar: p.emoji || "👤",
      role: p.role,
      description: p.description,
      tags: p.tags,
      cluster: p.cluster,
      postUrl: p.post_url || undefined,
      goal: p.goal || undefined,
      emoji: p.emoji || "😊",
      position: { x: 0, y: 0 }, // Позиции будут рассчитываться в ForceGraph
    }));

    const idMap = new Map<number, string>();
    data.participants.forEach((p) => {
      idMap.set(p.id, p.telegram_id || p.id.toString());
    });

    const edges: GraphEdge[] = data.connections.map((c) => ({
      source: idMap.get(c.source) || c.source.toString(),
      target: idMap.get(c.target) || c.target.toString(),
      weight: c.strength / 10, // Преобразуем strength (1-10) в weight (0.1-1.0)
    }));

    return { entrepreneurs, edges };
  }
}
