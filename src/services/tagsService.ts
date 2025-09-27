import { ApiService } from './api';

export interface TagsConfig {
  clusters: string[];
  clusterColors: Record<string, string>;
  categories: Array<{
    key: string;
    name: string;
  }>;
  tagsByCategory: Record<string, string[]>;
  allTags: string[];
  connections: Array<{
    tag1: string;
    tag2: string;
    strength: number;
    type: string;
  }>;
}

// URL функции для получения конфигурации тегов
const TAGS_CONFIG_URL = 'https://functions.poehali.dev/1536c1cd-6d82-45ff-a9f2-f6e366617cb2';

export class TagsService {
  private static tagsConfigCache: TagsConfig | null = null;

  static async getTagsConfig(): Promise<TagsConfig> {
    if (this.tagsConfigCache) {
      return this.tagsConfigCache;
    }

    try {
      const response = await fetch(TAGS_CONFIG_URL);
      if (!response.ok) {
        throw new Error('Failed to fetch tags configuration');
      }
      
      const data = await response.json();
      this.tagsConfigCache = data;
      return data;
    } catch (error) {
      console.error('Failed to load tags configuration:', error);
      // Возвращаем пустую конфигурацию в случае ошибки
      return {
        clusters: [],
        clusterColors: {},
        categories: [],
        tagsByCategory: {},
        allTags: [],
        connections: []
      };
    }
  }

  static calculateConnectionStrength(tags1: string[], tags2: string[], connections: TagsConfig['connections']): number {
    let maxStrength = 0;
    
    // Проверяем прямые совпадения тегов
    const commonTags = tags1.filter(tag => tags2.includes(tag));
    if (commonTags.length > 0) {
      maxStrength = Math.max(maxStrength, 0.3 + commonTags.length * 0.1);
    }
    
    // Проверяем связи из БД
    for (const tag1 of tags1) {
      for (const tag2 of tags2) {
        const connection = connections.find(
          c => (c.tag1 === tag1 && c.tag2 === tag2) || (c.tag1 === tag2 && c.tag2 === tag1)
        );
        if (connection) {
          maxStrength = Math.max(maxStrength, connection.strength);
        }
      }
    }
    
    return Math.min(maxStrength, 1.0);
  }

  static shouldConnect(tags1: string[], tags2: string[], connections: TagsConfig['connections']): boolean {
    const strength = this.calculateConnectionStrength(tags1, tags2, connections);
    return strength >= 0.5;
  }
}