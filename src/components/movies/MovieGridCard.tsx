'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, Plus, Star, ThumbsUp, ThumbsDown } from 'lucide-react';
import { MovieGridCardProps } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MovieGridCard: React.FC<MovieGridCardProps> = ({
  movie,
  userRating,
  onRate,
  onAddToWatchlist,
  size = 'md',
  showRating = true,
  className = ''
}) => {
  const [isRating, setIsRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);

  const sizeClasses = {
    sm: 'w-32',
    md: 'w-40',
    lg: 'w-48'
  };

  const posterAspectRatio = 'aspect-[3/4]';

  const handleLike = () => {
    if (selectedRating) {
      onRate(movie.id, true, selectedRating);
    } else {
      onRate(movie.id, true);
    }
    setIsRating(false);
    setSelectedRating(null);
  };

  const handleDislike = () => {
    onRate(movie.id, false);
    setIsRating(false);
    setSelectedRating(null);
  };

  const handleAddToWatchlist = () => {
    onAddToWatchlist(movie.id);
  };

  const renderStarRating = () => (
    <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-2">
      <div className="text-white text-xs mb-2 text-center">Rate this movie</div>
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setSelectedRating(star)}
            className={cn(
              "p-1 rounded transition-colors",
              selectedRating && star <= selectedRating
                ? "text-yellow-400"
                : "text-gray-400 hover:text-yellow-300"
            )}
          >
            <Star className="w-3 h-3 fill-current" />
          </button>
        ))}
      </div>
      <div className="flex gap-1">
        <Button
          size="sm"
          onClick={handleLike}
          disabled={!selectedRating}
          className="text-xs px-2 py-1 h-auto bg-green-600 hover:bg-green-700"
        >
          Submit
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsRating(false)}
          className="text-xs px-2 py-1 h-auto"
        >
          Cancel
        </Button>
      </div>
    </div>
  );

  const renderQuickActions = () => (
    <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleLike}
          className="bg-green-600 hover:bg-green-700 text-white p-2"
          title="Like"
        >
          <ThumbsUp className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={handleDislike}
          variant="outline"
          className="bg-white/90 hover:bg-white border-red-300 text-red-600 p-2"
          title="Dislike"
        >
          <ThumbsDown className="w-4 h-4" />
        </Button>
        
        <Button
          size="sm"
          onClick={handleAddToWatchlist}
          variant="outline"
          className="bg-white/90 hover:bg-white border-blue-300 text-blue-600 p-2"
          title="Add to Watchlist"
        >
          <Plus className="w-4 h-4" />
        </Button>
        
        {showRating && (
          <Button
            size="sm"
            onClick={() => setIsRating(true)}
            variant="outline"
            className="bg-white/90 hover:bg-white border-yellow-300 text-yellow-600 p-2"
            title="Rate with Stars"
          >
            <Star className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        "group relative bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-all duration-200",
        "border border-gray-200 cursor-pointer",
        sizeClasses[size],
        className
      )}
    >
      {/* Movie Poster */}
      <div className={cn("relative", posterAspectRatio)}>
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes={`(max-width: 768px) 50vw, ${size === 'sm' ? '16vw' : size === 'md' ? '20vw' : '24vw'}`}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
            <span className="text-white text-lg font-bold">
              {movie.title.charAt(0)}
            </span>
          </div>
        )}

        {/* User Rating Indicator */}
        {userRating && (
          <div className="absolute top-2 right-2 z-10">
            {userRating.interested ? (
              <div className="bg-green-500 text-white rounded-full p-1">
                <Heart className="w-3 h-3 fill-current" />
              </div>
            ) : (
              <div className="bg-red-500 text-white rounded-full p-1">
                <ThumbsDown className="w-3 h-3" />
              </div>
            )}
          </div>
        )}

        {/* Movie Rating */}
        {movie.rating && (
          <div className="absolute top-2 left-2 bg-black/70 text-white px-1.5 py-0.5 rounded text-xs flex items-center gap-1">
            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
            {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Rating Overlay */}
        {isRating && renderStarRating()}

        {/* Quick Actions Overlay */}
        {!isRating && renderQuickActions()}
      </div>

      {/* Movie Info */}
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm line-clamp-2 mb-1">
          {movie.title}
        </h3>
        
        <div className="text-xs text-gray-600 mb-2">
          {movie.year}
        </div>

        {/* Genres */}
        <div className="flex flex-wrap gap-1">
          {movie.genre?.slice(0, 2).map((genre) => (
            <span
              key={genre}
              className="px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded text-xs"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Runtime */}
        {movie.runtime && (
          <div className="text-xs text-gray-500 mt-1">
            {movie.runtime}m
          </div>
        )}
      </div>
    </div>
  );
}; 