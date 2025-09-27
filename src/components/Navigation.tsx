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
            <span className="text-3xl">🦄</span>
            <span className="font-semibold text-lg">UNICORN MAP</span>
          </Link>
          
          <div className="flex items-center gap-4">
            {/* Убрал лишние кнопки навигации */}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;