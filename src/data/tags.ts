// Система тегов для сообщества предпринимателей
export const ENTREPRENEUR_TAGS = {
  // Отрасли и направления
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
    'Строительство',
    'Медиа',
    'Развлечения',
    'Спорт/Фитнес',
    'Красота',
    'Образование'
  ],
  
  // Навыки и экспертиза
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
  
  // Стадия бизнеса
  stage: [
    'Идея',
    'MVP',
    'Первые клиенты',
    'Растущий бизнес',
    'Масштабирование',
    'Зрелый бизнес',
    'Экзит'
  ],
  
  // Что ищет
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
  
  // Что может предложить
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
  
  // Бизнес-модель
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

// Все теги в одном массиве для удобства
export const ALL_TAGS = [
  ...ENTREPRENEUR_TAGS.industry,
  ...ENTREPRENEUR_TAGS.skills,
  ...ENTREPRENEUR_TAGS.stage,
  ...ENTREPRENEUR_TAGS.needs,
  ...ENTREPRENEUR_TAGS.offers,
  ...ENTREPRENEUR_TAGS.model
];

// Матрица совместимости тегов (вес связи от 0 до 1)
export const TAG_COMPATIBILITY_RULES = {
  // Сильные связи (0.8-1.0)
  strong: [
    // Ищет инвестиции <-> Инвестирую
    { tags: ['Инвестиции', 'Инвестирую'], weight: 1.0 },
    // Ищет клиентов <-> в той же отрасли
    { category: ['needs:Клиенты', 'industry:*'], weight: 0.9 },
    // Ищет партнёров <-> комплементарные навыки
    { tags: ['Партнёры', 'Разработка', 'Маркетинг'], weight: 0.9 },
    // Ищет экспертизу <-> Предлагает экспертизу
    { tags: ['Экспертиза', 'Менторство'], weight: 0.9 },
  ],
  
  // Средние связи (0.5-0.8)
  medium: [
    // Одна отрасль
    { sameCategoryMultiplier: 'industry', weight: 0.7 },
    // Одна стадия бизнеса
    { sameCategoryMultiplier: 'stage', weight: 0.6 },
    // B2B <-> B2B
    { tags: ['B2B'], weight: 0.6 },
  ],
  
  // Слабые связи (0.1-0.5)
  weak: [
    // Разные отрасли но схожие модели
    { sameCategoryMultiplier: 'model', weight: 0.3 },
  ]
};

// Функция для расчёта силы связи между двумя наборами тегов
export function calculateConnectionStrength(tags1: string[], tags2: string[]): number {
  let maxStrength = 0;
  
  // Проверяем прямые совпадения тегов
  const commonTags = tags1.filter(tag => tags2.includes(tag));
  if (commonTags.length > 0) {
    maxStrength = Math.max(maxStrength, 0.5 + (commonTags.length * 0.1));
  }
  
  // Проверяем взаимодополняющие теги
  const complementaryPairs = [
    ['Инвестиции', 'Инвестирую'],
    ['Клиенты', 'Продажи B2B'],
    ['Сотрудники', 'HR'],
    ['Подрядчики', 'Разработка'],
    ['Маркетинг', 'SMM'],
    ['Юридические вопросы', 'Юридическая помощь'],
    ['Менторство', 'Идея'],
    ['Экспертиза', 'MVP']
  ];
  
  for (const [tag1, tag2] of complementaryPairs) {
    if ((tags1.includes(tag1) && tags2.includes(tag2)) || 
        (tags1.includes(tag2) && tags2.includes(tag1))) {
      maxStrength = Math.max(maxStrength, 0.9);
    }
  }
  
  // Проверяем теги из одной категории
  for (const [category, categoryTags] of Object.entries(ENTREPRENEUR_TAGS)) {
    const tags1InCategory = tags1.filter(tag => categoryTags.includes(tag));
    const tags2InCategory = tags2.filter(tag => categoryTags.includes(tag));
    
    if (tags1InCategory.length > 0 && tags2InCategory.length > 0) {
      // Особенно сильная связь для одинаковых отраслей
      if (category === 'industry') {
        const commonIndustry = tags1InCategory.filter(tag => tags2InCategory.includes(tag));
        if (commonIndustry.length > 0) {
          maxStrength = Math.max(maxStrength, 0.8);
        }
      }
      // Средняя связь для других категорий
      else {
        maxStrength = Math.max(maxStrength, 0.4);
      }
    }
  }
  
  return Math.min(maxStrength, 1.0);
}

// Определяем должны ли два участника быть связаны
export function shouldConnect(tags1: string[], tags2: string[]): boolean {
  const strength = calculateConnectionStrength(tags1, tags2);
  return strength >= 0.5; // Связываем только при силе связи >= 0.5
}