import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Network, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

const Navigation = () => {
  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="https://cdn.poehali.dev/files/c89340bd-1f40-4b4d-8f75-77fbf9a67772.jpg" 
              alt="Unicorn LAB" 
              className="h-8 w-8 object-contain"
            />
            <span className="font-semibold text-lg">Unicorn LAB</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="sm" className="gap-2">
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">Главная</span>
              </Button>
            </Link>
            <Link to="/search">
              <Button variant="ghost" size="sm" className="gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Поиск</span>
              </Button>
            </Link>
            <Link to="/network">
              <Button variant="ghost" size="sm" className="gap-2">
                <Network className="w-4 h-4" />
                <span className="hidden sm:inline">Граф</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;