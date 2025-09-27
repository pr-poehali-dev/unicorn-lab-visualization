// Система тегов для предпринимателей

export const ENTREPRENEUR_CLUSTERS = [
  'IT',
  'Маркетинг',
  'Финансы',
  'Производство',
  'Услуги',
  'Консалтинг',
  'E-commerce',
  'EdTech',
  'HealthTech',
  'FoodTech',
  'PropTech',
  'Other'
];

export const ENTREPRENEUR_TAGS = {
  // Отрасли и направления (15 тегов)
  industry: [
    'IT/Software',
    'E-commerce',
    'EdTech',
    'FinTech',
    'HealthTech',
    'FoodTech',
    'PropTech',
    'Marketing',
    'Консалтинг',
    'Производство',
    'Услуги',
    'Торговля',
    'HoReCa',
    'Логистика',
    'Строительство'
  ],
  
  // Навыки и компетенции (15 тегов)
  skills: [
    'Продажи',
    'Маркетинг',
    'SMM',
    'Разработка',
    'Дизайн',
    'Управление',
    'Финансы',
    'Юридические вопросы',
    'HR',
    'PR',
    'Аналитика',
    'Стратегия',
    'Операции',
    'Продукт',
    'Data Science'
  ],
  
  // Стадия бизнеса (7 тегов)
  stage: [
    'Идея',
    'MVP',
    'Первые клиенты',
    'Растущий бизнес',
    'Масштабирование',
    'Зрелый бизнес',
    'Экзит'
  ],
  
  // Что ищут (10 тегов)
  needs: [
    'Инвестиции',
    'Партнёры',
    'Клиенты',
    'Сотрудники',
    'Менторство',
    'Экспертиза',
    'Подрядчики',
    'Соинвесторы',
    'Каналы продаж',
    'Нетворкинг'
  ],
  
  // Что предлагают (10 тегов)
  offers: [
    'Инвестирую',
    'Менторство',
    'Экспертиза',
    'Разработка',
    'Маркетинг',
    'Продажи B2B',
    'Связи',
    'Производство',
    'Логистика',
    'Юридическая помощь'
  ],
  
  // Модель бизнеса (9 тегов)
  model: [
    'B2B',
    'B2C',
    'B2B2C',
    'Marketplace',
    'SaaS',
    'Subscription',
    'Freemium',
    'Агентская модель',
    'Франшиза'
  ]
};

// Получить все теги в одном массиве
export const ALL_TAGS = Object.values(ENTREPRENEUR_TAGS).flat();

// Логика связей между тегами
export interface TagConnection {
  tag1: string;
  tag2: string;
  strength: number; // 0-1, где 1 - максимально сильная связь
}

// Матрица связей - определяет силу связи между парами тегов
export const TAG_CONNECTIONS: TagConnection[] = [
  // Взаимодополняющие потребности и предложения (сильные связи)
  { tag1: 'Инвестиции', tag2: 'Инвестирую', strength: 1.0 },
  { tag1: 'Партнёры', tag2: 'Нетворкинг', strength: 0.8 },
  { tag1: 'Клиенты', tag2: 'Продажи B2B', strength: 0.9 },
  { tag1: 'Сотрудники', tag2: 'HR', strength: 0.9 },
  { tag1: 'Менторство', tag2: 'Менторство', strength: 0.7 },
  { tag1: 'Экспертиза', tag2: 'Экспертиза', strength: 0.7 },
  { tag1: 'Подрядчики', tag2: 'Разработка', strength: 0.8 },
  { tag1: 'Подрядчики', tag2: 'Маркетинг', strength: 0.8 },
  { tag1: 'Соинвесторы', tag2: 'Инвестирую', strength: 0.9 },
  { tag1: 'Каналы продаж', tag2: 'Продажи B2B', strength: 0.8 },
  
  // Связи по стадиям бизнеса
  { tag1: 'Идея', tag2: 'Менторство', strength: 0.8 },
  { tag1: 'MVP', tag2: 'Экспертиза', strength: 0.7 },
  { tag1: 'Первые клиенты', tag2: 'Продажи', strength: 0.8 },
  { tag1: 'Масштабирование', tag2: 'Инвестиции', strength: 0.9 },
  
  // Связи по отраслям (средние связи для схожих отраслей)
  { tag1: 'IT/Software', tag2: 'EdTech', strength: 0.6 },
  { tag1: 'IT/Software', tag2: 'FinTech', strength: 0.6 },
  { tag1: 'E-commerce', tag2: 'Маркетинг', strength: 0.7 },
  { tag1: 'E-commerce', tag2: 'Логистика', strength: 0.7 },
  
  // Связи по навыкам
  { tag1: 'Маркетинг', tag2: 'SMM', strength: 0.8 },
  { tag1: 'Финансы', tag2: 'Аналитика', strength: 0.7 },
  { tag1: 'Управление', tag2: 'Стратегия', strength: 0.8 },
  { tag1: 'Разработка', tag2: 'Data Science', strength: 0.6 },
  
  // Связи по моделям бизнеса
  { tag1: 'SaaS', tag2: 'Subscription', strength: 0.8 },
  { tag1: 'B2B', tag2: 'Продажи B2B', strength: 0.9 },
  { tag1: 'Marketplace', tag2: 'E-commerce', strength: 0.8 },
];

// Функция для расчета силы связи между двумя наборами тегов
export function calculateConnectionStrength(tags1: string[], tags2: string[]): number {
  let maxStrength = 0;
  
  // Проверяем прямые совпадения тегов
  const commonTags = tags1.filter(tag => tags2.includes(tag));
  if (commonTags.length > 0) {
    // Базовая сила связи за общие теги
    maxStrength = Math.max(maxStrength, 0.3 + commonTags.length * 0.1);
  }
  
  // Проверяем связи из матрицы
  for (const tag1 of tags1) {
    for (const tag2 of tags2) {
      const connection = TAG_CONNECTIONS.find(
        c => (c.tag1 === tag1 && c.tag2 === tag2) || (c.tag1 === tag2 && c.tag2 === tag1)
      );
      if (connection) {
        maxStrength = Math.max(maxStrength, connection.strength);
      }
    }
  }
  
  // Проверяем теги из одной категории
  for (const [category, categoryTags] of Object.entries(ENTREPRENEUR_TAGS)) {
    const tags1InCategory = tags1.filter(tag => categoryTags.includes(tag));
    const tags2InCategory = tags2.filter(tag => categoryTags.includes(tag));
    
    if (tags1InCategory.length > 0 && tags2InCategory.length > 0) {
      // Если есть теги из одной категории, добавляем слабую связь
      if (category === 'industry' && tags1InCategory.some(tag => tags2InCategory.includes(tag))) {
        // Сильная связь для одинаковой индустрии
        maxStrength = Math.max(maxStrength, 0.7);
      } else if (category !== 'needs' && category !== 'offers') {
        // Слабая связь для других категорий
        maxStrength = Math.max(maxStrength, 0.3);
      }
    }
  }
  
  return Math.min(maxStrength, 1.0);
}

// Функция для определения, должны ли два участника быть связаны
export function shouldConnect(tags1: string[], tags2: string[]): boolean {
  const strength = calculateConnectionStrength(tags1, tags2);
  return strength >= 0.5; // Порог для создания связи
}