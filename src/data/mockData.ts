import { Entrepreneur, GraphEdge } from '@/types/entrepreneur';

export const entrepreneurs: Entrepreneur[] = [
  {
    id: '1',
    name: 'Иван Петров',
    avatar: '👨‍💼',
    description: 'Основатель SaaS платформы для автоматизации продаж. 5+ лет в B2B, экспертиза в масштабировании.',
    tags: ['Платформы', 'Продажи', 'Для бизнеса', 'Автоматизация', 'Управление клиентами', 'Искусственный интеллект'],
    cluster: 'IT',
    position: { x: 150, y: 200 }
  },
  {
    id: '2',
    name: 'Мария Иванова',
    avatar: '👩‍💻',
    description: 'CEO маркетплейса экологичных товаров. Строю устойчивый бизнес с заботой о планете.',
    tags: ['Интернет-торговля', 'Экология', 'Маркетплейс', 'Для людей', 'Устойчивое развитие', 'Зеленые технологии'],
    cluster: 'E-commerce',
    position: { x: 400, y: 150 }
  },
  {
    id: '3',
    name: 'Алексей Смирнов',
    avatar: '👨‍🏫',
    description: 'Сооснователь EdTech стартапа по изучению языков с AI. Революционизируем образование.',
    tags: ['Образовательные технологии', 'Образование', 'Искусственный интеллект', 'Языки', 'Мобильные приложения', 'Платформы'],
    cluster: 'Образование',
    position: { x: 650, y: 250 }
  },
  {
    id: '4',
    name: 'Елена Козлова',
    avatar: '👩‍🔬',
    description: 'Разработчик платформы для анализа больших данных. PhD в машинном обучении.',
    tags: ['Большие данные', 'Машинное обучение', 'Аналитика', 'Для бизнеса', 'Программирование', 'Облачные технологии'],
    cluster: 'IT',
    position: { x: 250, y: 400 }
  },
  {
    id: '5',
    name: 'Дмитрий Новиков',
    avatar: '👨‍💻',
    description: 'Основатель сервиса доставки продуктов за 15 минут. Ex-Яндекс, строю логистику будущего.',
    tags: ['Доставка', 'Логистика', 'Продукты питания', 'Для людей', 'Мобильные приложения', 'Операции'],
    cluster: 'E-commerce',  
    position: { x: 500, y: 350 }
  },
  {
    id: '6',
    name: 'Анна Сидорова',
    avatar: '👩‍🎓',
    description: 'Создатель онлайн-школы программирования для детей. Учим думать, а не кодить.',
    tags: ['Образовательные технологии', 'Дети', 'Программирование', 'Для людей', 'Онлайн-обучение', 'Курсы'],
    cluster: 'Образование',
    position: { x: 750, y: 400 }
  },
  {
    id: '7',
    name: 'Михаил Волков',
    avatar: '👨‍⚕️',
    description: 'CEO телемедицинской платформы. Делаем медицину доступной в любой точке страны.',
    tags: ['Медицинские технологии', 'Телемедицина', 'Для людей', 'Мобильные приложения', 'Искусственный интеллект', 'Здоровье'],
    cluster: 'Медицина',
    position: { x: 450, y: 500 }
  },
  {
    id: '8', 
    name: 'Ольга Федорова',
    avatar: '👩‍💼',
    description: 'Основатель FinTech стартапа для МСБ. Упрощаем финансы для малого бизнеса.',
    tags: ['Финансовые технологии', 'Для бизнеса', 'Финансы', 'Интеграции', 'Банковские услуги', 'Кредитование'],
    cluster: 'Финансы',
    position: { x: 300, y: 250 }
  }
];

export const edges: GraphEdge[] = [
  // Сильные связи внутри кластеров
  { source: '1', target: '4', weight: 0.9 }, // IT и Digital
  { source: '2', target: '5', weight: 0.85 }, // E-commerce
  { source: '3', target: '6', weight: 0.95 }, // Образование
  
  // Межкластерные связи
  { source: '1', target: '8', weight: 0.7 }, // IT -> FinTech
  { source: '2', target: '7', weight: 0.5 }, // E-commerce -> HealthTech
  { source: '4', target: '7', weight: 0.75 }, // IT -> HealthTech (AI в медицине)
  { source: '5', target: '8', weight: 0.4 }, // E-commerce -> FinTech
  { source: '3', target: '4', weight: 0.6 }, // EdTech -> IT (AI в образовании)
  
  // Дополнительные связи для насыщенности графа
  { source: '1', target: '2', weight: 0.3 }, // IT -> E-commerce
  { source: '3', target: '7', weight: 0.45 }, // EdTech -> HealthTech
  { source: '6', target: '4', weight: 0.55 }, // EdTech -> IT
  { source: '8', target: '2', weight: 0.65 }, // FinTech -> E-commerce
  { source: '7', target: '3', weight: 0.35 }, // HealthTech -> EdTech
  { source: '5', target: '7', weight: 0.5 }, // E-commerce -> HealthTech
  { source: '1', target: '3', weight: 0.7 }, // IT -> EdTech (SaaS для образования)
  { source: '8', target: '4', weight: 0.8 }, // FinTech -> IT (Big Data в финансах)
  
  // Слабые но важные связи
  { source: '6', target: '7', weight: 0.25 }, // EdTech -> HealthTech
  { source: '5', target: '1', weight: 0.4 }, // E-commerce -> IT
  { source: '2', target: '8', weight: 0.3 }, // E-commerce -> FinTech
  { source: '7', target: '8', weight: 0.2 } // HealthTech -> FinTech
];

export const clusterColors: { [key: string]: string } = {
  'IT': '#ea580c',
  'E-commerce': '#dc2626', 
  'Образование': '#ca8a04',
  'Медицина': '#059669',
  'Финансы': '#7c3aed'
};