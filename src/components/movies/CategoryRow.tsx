'use client';

import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { CategoryRowProps } from '@/types';
import { MovieGridCard } from './MovieGridCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const CategoryRow: React.FC<CategoryRowProps> = ({
  category,
  movies,
  onRate,
  className = ''
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scrollLeft = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollRight = () => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  if (!movies || movies.length === 0) {
    return (
      <div className={cn("py-6", className)}>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {category.category_name}
          </h2>
          <p className="text-sm text-gray-600 mt-1">{category.ai_description}</p>
        </div>
        <div className="text-center py-8 text-gray-500">
          No movies available in this category
        </div>
      </div>
    );
  }

  return (
    <div className={cn("py-6 group", className)}>
      {/* Category Header */}
      <div className="mb-4 flex justify-between items-start">
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {category.category_name}
          </h2>
          <p className="text-sm text-gray-600 leading-relaxed max-w-2xl">
            {category.ai_description}
          </p>
        </div>
        
        {/* Navigation Buttons */}
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={scrollLeft}
            className="p-2 bg-white/90 hover:bg-white border-gray-300"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={scrollRight}
            className="p-2 bg-white/90 hover:bg-white border-gray-300"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Movies Scrollable Row */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {movies.map((movie) => (
            <div key={movie.id} className="flex-none">
              <MovieGridCard
                movie={movie}
                onRate={(movieId, interested) => {
                  onRate(movieId, interested);
                }}
                onAddToWatchlist={(movieId) => {
                  // Handle watchlist addition through rating system
                  onRate(movieId, true);
                }}
                size="md"
                showRating={true}
                className="hover:scale-105 transition-transform duration-200"
              />
            </div>
          ))}
          
          {/* Show More Placeholder */}
          <div className="flex-none w-40 flex items-center justify-center">
            <div className="w-full h-48 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <Sparkles className="w-8 h-8 mb-2" />
              <span className="text-sm text-center px-2">
                More {category.category_name.toLowerCase()}
              </span>
            </div>
          </div>
        </div>

        {/* Gradient Overlays for scroll indication */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent pointer-events-none" />
      </div>

      {/* Category Metadata */}
      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <div>
          Generated on {new Date(category.generated_date).toLocaleDateString()}
        </div>
        <div>
          {movies.length} movie{movies.length !== 1 ? 's' : ''}
        </div>
      </div>
    </div>
  );
}; 