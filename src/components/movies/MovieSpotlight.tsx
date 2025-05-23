'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { Heart, Plus, Star, Clock, Calendar } from 'lucide-react';
import { MovieSpotlightProps } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const MovieSpotlight: React.FC<MovieSpotlightProps> = ({
  spotlight,
  onRate,
  onAddToWatchlist,
  className = ''
}) => {
  const [isRating, setIsRating] = useState(false);
  const [selectedRating, setSelectedRating] = useState<number | null>(null);
  const { movie } = spotlight;

  if (!movie) {
    return (
      <div className={cn(
        "animate-pulse bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl h-96",
        className
      )}>
        <div className="p-6 h-full flex items-center justify-center">
          <div className="text-gray-500">Loading movie...</div>
        </div>
      </div>
    );
  }

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
    <div className="flex items-center gap-1 mt-2">
      <span className="text-sm text-gray-600 mr-2">Rate this movie:</span>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => setSelectedRating(star)}
          className={cn(
            "p-1 rounded transition-colors",
            selectedRating && star <= selectedRating
              ? "text-yellow-500"
              : "text-gray-300 hover:text-yellow-400"
          )}
        >
          <Star className="w-5 h-5 fill-current" />
        </button>
      ))}
    </div>
  );

  return (
    <div className={cn(
      "group relative bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300",
      "border border-gray-200",
      className
    )}>
      {/* Spotlight Badge */}
      <div className="absolute top-4 right-4 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-3 py-1 rounded-full text-sm font-medium">
        Spotlight #{spotlight.position}
      </div>

      <div className="md:flex">
        {/* Movie Poster */}
        <div className="md:w-1/3 relative">
          <div className="aspect-[3/4] relative">
            {movie.poster_url ? (
              <Image
                src={movie.poster_url}
                alt={movie.title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 33vw"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center">
                <span className="text-white text-xl font-bold">
                  {movie.title.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          {/* Confidence Score */}
          <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
            {Math.round(spotlight.confidence_score * 100)}% match
          </div>
        </div>

        {/* Movie Details */}
        <div className="md:w-2/3 p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">
                {movie.title}
              </h3>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {movie.year}
                </div>
                {movie.runtime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {movie.runtime}m
                  </div>
                )}
                {movie.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {movie.rating.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-2 mb-4">
            {movie.genre?.slice(0, 3).map((genre) => (
              <span
                key={genre}
                className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* Plot */}
          {movie.plot && (
            <p className="text-gray-700 text-sm mb-4 line-clamp-3">
              {movie.plot}
            </p>
          )}

          {/* AI Reasoning */}
          <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4 mb-4">
            <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              Why we think you&apos;ll love this
            </h4>
            <p className="text-purple-800 text-sm leading-relaxed">
              {spotlight.ai_reason}
            </p>
          </div>

          {/* Director and Cast */}
          {(movie.director?.length > 0 || movie.cast?.length > 0) && (
            <div className="text-sm text-gray-600 mb-4 space-y-1">
              {movie.director?.length > 0 && (
                <div>
                  <span className="font-medium">Director:</span> {movie.director.join(', ')}
                </div>
              )}
              {movie.cast?.length > 0 && (
                <div>
                  <span className="font-medium">Cast:</span> {movie.cast.slice(0, 3).join(', ')}
                  {movie.cast.length > 3 && '...'}
                </div>
              )}
            </div>
          )}

          {/* Star Rating (if rating mode is active) */}
          {isRating && renderStarRating()}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-4">
            <Button
              onClick={handleLike}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={isRating && !selectedRating}
            >
              <Heart className="w-4 h-4 mr-2" />
              {isRating ? 'Submit Rating' : 'Love It'}
            </Button>
            
            <Button
              onClick={handleDislike}
              variant="outline"
              className="flex-1 border-red-300 text-red-600 hover:bg-red-50"
            >
              Not Interested
            </Button>
            
            <Button
              onClick={handleAddToWatchlist}
              variant="outline"
              className="border-blue-300 text-blue-600 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Advanced Rating Toggle */}
          <div className="mt-3 text-center">
            <button
              onClick={() => setIsRating(!isRating)}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              {isRating ? 'Simple rating' : 'Rate with stars'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 