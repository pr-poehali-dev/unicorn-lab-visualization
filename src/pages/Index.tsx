import React from 'react';
import { Search, Users, Network } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Index = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-background"></div>
        <div className="relative container mx-auto px-4 py-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Unicorn LAB <span className="text-primary">Чатик</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Визуализация сообщества предпринимателей с умной кластеризацией и поиском
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/search">
                <Button size="lg" className="gap-2">
                  <Search className="w-5 h-5" />
                  Найти предпринимателей
                </Button>
              </Link>
              <Link to="/network">
                <Button size="lg" variant="outline" className="gap-2">
                  <Network className="w-5 h-5" />
                  Граф связей
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-card">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-primary" />
              <h3 className="text-3xl font-bold mb-2">441</h3>
              <p className="text-muted-foreground">Сообщений в чате</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-primary flex items-center justify-center">
                <span className="text-2xl">🏷️</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">50+</h3>
              <p className="text-muted-foreground">Тегов и категорий</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 text-primary flex items-center justify-center">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-3xl font-bold mb-2">AI</h3>
              <p className="text-muted-foreground">Умная кластеризация</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Возможности платформы</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Поиск по тегам</h3>
              <p className="text-muted-foreground">
                Быстро находите предпринимателей по интересующим вас тегам и направлениям
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-3">Графовая визуализация</h3>
              <p className="text-muted-foreground">
                Наглядное представление связей и кластеров в сообществе
              </p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-semibold mb-3">AI-кластеризация</h3>
              <p className="text-muted-foreground">
                Автоматическая группировка участников по схожести деятельности
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;