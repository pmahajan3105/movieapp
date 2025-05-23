'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { ThumbsUp, ThumbsDown, Heart, X } from 'lucide-react';
import { QuickRateCardProps } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const QuickRateCard: React.FC<QuickRateCardProps> = ({
  movie,
  onRate,
  className = ''
}) => {
  const [isRating, setIsRating] = useState(false);

  const handleLike = () => {
    setIsRating(true);
    setTimeout(() => {
      onRate(true);
    }, 200);
  };

  const handleDislike = () => {
    setIsRating(true);
    setTimeout(() => {
      onRate(false);
    }, 200);
  };

  return (
    <div className={cn(
      "relative bg-white rounded-xl shadow-lg overflow-hidden",
      "border border-gray-200 transition-all duration-300",
      "max-w-sm mx-auto",
      isRating && "scale-95 opacity-75",
      className
    )}>
      {/* Movie Poster */}
      <div className="relative aspect-[3/4]">
        {movie.poster_url ? (
          <Image
            src={movie.poster_url}
            alt={movie.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
            <span className="text-white text-4xl font-bold">
              {movie.title.charAt(0)}
            </span>
          </div>
        )}

        {/* Quick Action Buttons */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-200">
          <div className="flex gap-6">
            <Button
              onClick={handleDislike}
              size="lg"
              className="bg-red-500 hover:bg-red-600 text-white rounded-full p-4 shadow-lg transform hover:scale-110 transition-all duration-200"
              disabled={isRating}
            >
              <X className="w-8 h-8" />
            </Button>
            
            <Button
              onClick={handleLike}
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transform hover:scale-110 transition-all duration-200"
              disabled={isRating}
            >
              <Heart className="w-8 h-8 fill-current" />
            </Button>
          </div>
        </div>

        {/* Movie Rating */}
        {movie.rating && (
          <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded text-sm flex items-center gap-1">
            ⭐ {movie.rating.toFixed(1)}
          </div>
        )}

        {/* Year Badge */}
        <div className="absolute top-3 right-3 bg-purple-600 text-white px-2 py-1 rounded text-sm font-medium">
          {movie.year}
        </div>

        {/* Rating Animation Overlay */}
        {isRating && (
          <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
            <div className="animate-pulse text-white text-lg font-bold">
              Rating...
            </div>
          </div>
        )}
      </div>

      {/* Movie Details */}
      <div className="p-4">
        <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
          {movie.title}
        </h3>

        {/* Genres */}
        <div className="flex flex-wrap gap-1 mb-3">
          {movie.genre?.slice(0, 3).map((genre) => (
            <span
              key={genre}
              className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
            >
              {genre}
            </span>
          ))}
        </div>

        {/* Director */}
        {movie.director && movie.director.length > 0 && (
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-medium">Director:</span> {movie.director[0]}
          </p>
        )}

        {/* Plot Preview */}
        {movie.plot && (
          <p className="text-sm text-gray-700 line-clamp-3 mb-4">
            {movie.plot}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleDislike}
            variant="outline"
            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 transition-colors"
            disabled={isRating}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            Skip
          </Button>
          
          <Button
            onClick={handleLike}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white transition-colors"
            disabled={isRating}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            Like
          </Button>
        </div>

        {/* Runtime and additional info */}
        <div className="flex justify-between items-center mt-3 text-xs text-gray-500">
          {movie.runtime && (
            <span>{movie.runtime} minutes</span>
          )}
          {movie.cast && movie.cast.length > 0 && (
            <span className="truncate ml-2">
              {movie.cast.slice(0, 2).join(', ')}
            </span>
          )}
        </div>
      </div>

      {/* Swipe Indicators */}
      <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-8 opacity-50">
        <div className="flex items-center gap-1 text-red-500">
          <X className="w-4 h-4" />
          <span className="text-xs">Swipe left</span>
        </div>
        <div className="flex items-center gap-1 text-green-500">
          <Heart className="w-4 h-4" />
          <span className="text-xs">Swipe right</span>
        </div>
      </div>
    </div>
  );
}; 