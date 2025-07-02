'use client';

import { useState, useEffect } from 'react';
import { useVoiceInput } from '@/hooks/useVoiceInput';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { ConversationalParser } from '@/lib/ai/conversational-parser';
import { SmartSearchEngine } from '@/lib/ai/smart-search-engine';
import { useAuth } from '@/hooks/useAuth';
import { audioManager } from '@/lib/audio/AudioManager';
import type { Movie } from '@/types';
import type { SearchResult } from '@/lib/ai/smart-search-engine';

interface VoiceSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResults: (movies: Movie[], context: SearchResult) => void;
}

type SearchStatus = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export const VoiceSearchModal = ({ isOpen, onClose, onResults }: VoiceSearchModalProps) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<SearchStatus>('idle');

  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    error: voiceError,
    isSupported: voiceInputSupported,
    startListening,
    stopListening,
    resetTranscript
  } = useVoiceInput({
    continuous: false,
    interimResults: true,
    onResult: handleVoiceResult,
    onError: (error) => {
      console.error('Voice input error:', error);
      setStatus('error');
    }
  });

  const { 
    stopSpeaking, 
    isSpeaking,
    isSupported: voiceOutputSupported 
  } = useVoiceOutput({
    rate: 0.9,
    pitch: 1.0
  });

  // Handle voice result when speech recognition completes
  async function handleVoiceResult(finalTranscript: string) {
    if (!user || !finalTranscript.trim()) return;
    
    await processVoiceQuery(finalTranscript);
  }

  // Auto-process when transcript is complete and listening stops
  useEffect(() => {
    if (transcript && !isListening && !status.includes('processing')) {
      handleVoiceResult(transcript);
    }
  }, [transcript, isListening]);

  // Update status based on current states
  useEffect(() => {
    if (isSpeaking) {
      setStatus('speaking');
    } else if (status === 'processing') {
      // Keep processing status
    } else if (isListening) {
      setStatus('listening');
    } else if (voiceError) {
      setStatus('error');
    } else {
      setStatus('idle');
    }
  }, [isListening, isSpeaking, voiceError]);

  const processVoiceQuery = async (query: string) => {
    if (!user || !query.trim()) return;

    setStatus('processing');
    
    try {
      // Parse the conversational query
      const parser = new ConversationalParser();
      const parsedQuery = await parser.parseQuery(query, user.id);

      // Execute the search
      const searchEngine = new SmartSearchEngine();
      const results = await searchEngine.executeSearch(parsedQuery, user.id, 12);

      setSearchResults(results);

      // Provide voice feedback if supported using AudioManager
      if (voiceOutputSupported) {
        const responseText = generateVoiceResponse(results);
        await audioManager.speak(responseText, 'search');
      }

      // Return results to parent
      onResults(results.movies, results);

    } catch (error) {
      console.error('Voice search error:', error);
      setStatus('error');
      
      if (voiceOutputSupported) {
        await audioManager.speak("Sorry, I couldn't process that request. Please try again.", 'search');
      }
    }
  };

  const generateVoiceResponse = (results: SearchResult): string => {
    const movieCount = results.movies.length;
    
    if (movieCount === 0) {
      return "I didn't find any movies matching that description. Try rephrasing your request.";
    }

    const topMovie = results.movies[0];
    if (!topMovie) return "I found some movies for you. Check your screen for the results.";
    
    if (movieCount === 1) {
      return `I found ${topMovie.title}. This ${topMovie.release_date?.split('-')[0] || ''} movie seems perfect for what you're looking for.`;
    }

    if (movieCount <= 3) {
      const titles = results.movies.slice(0, 2).map(m => m.title).join(' and ');
      return `I found ${movieCount} movies including ${titles}. Check your screen for the full list.`;
    }

    return `I found ${movieCount} great options for you. The top recommendation is ${topMovie.title}. Take a look at your screen to see all the results.`;
  };

  const handleStartListening = () => {
    resetTranscript();
    // Stop all audio before starting to listen
    audioManager.stopAllAudio();
    stopSpeaking();
    setStatus('idle');
    startListening();
  };

  const handleManualSearch = () => {
    if (transcript.trim()) {
      processVoiceQuery(transcript);
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'listening':
        return 'Listening... speak your movie request';
      case 'processing':
        return 'Finding movies for you...';
      case 'speaking':
        return 'Here are my recommendations';
      case 'error':
        return 'Something went wrong. Please try again.';
      default:
        return 'Tap the microphone to start voice search';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'listening':
        return '🎤';
      case 'processing':
        return '🔍';
      case 'speaking':
        return '🗣️';
      case 'error':
        return '❌';
      default:
        return '🎬';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'listening':
        return 'text-primary';
      case 'processing':
        return 'text-warning';
      case 'speaking':
        return 'text-success';
      case 'error':
        return 'text-error';
      default:
        return 'text-base-content';
    }
  };

  if (!isOpen) return null;

  // Show unsupported message if voice features aren't available
  if (!voiceInputSupported) {
    return (
      <div className="modal modal-open">
        <div className="modal-box max-w-lg">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg">Voice Search</h3>
            <button 
              className="btn btn-sm btn-circle btn-ghost" 
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          <div className="text-center space-y-4">
            <div className="text-6xl">🚫</div>
            <p className="text-lg">Voice search not supported</p>
            <p className="text-sm opacity-70">
              Your browser doesn&apos;t support voice recognition. 
              Try using Chrome or Edge for the best experience.
            </p>
          </div>
        </div>
        <div className="modal-backdrop" onClick={onClose}></div>
      </div>
    );
  }

  return (
    <div className="modal modal-open">
      <div className="modal-box max-w-lg">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Voice Search</h3>
          <button 
            className="btn btn-sm btn-circle btn-ghost" 
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="text-center space-y-6">
          {/* Status Display */}
          <div className="space-y-4">
            <div className={`text-6xl ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <p className="text-lg">{getStatusMessage()}</p>
          </div>

          {/* Voice Input Display */}
          {(transcript || interimTranscript) && (
            <div className="bg-base-200 rounded-lg p-4">
              <div className="text-sm opacity-70 mb-2">You said:</div>
              <div className="text-lg">
                {transcript}
                {interimTranscript && (
                  <span className="opacity-50 italic">{interimTranscript}</span>
                )}
              </div>
            </div>
          )}

          {/* Search Results Summary */}
          {searchResults && searchResults.movies.length > 0 && (
            <div className="bg-primary/10 rounded-lg p-4">
              <div className="text-sm opacity-70 mb-2">Found:</div>
              <div className="text-lg font-semibold">
                {searchResults.movies.length} movies
              </div>
              <div className="text-sm opacity-70">
                {searchResults.searchContext.strategy} search • {Math.round(searchResults.searchContext.confidence * 100)}% confidence
              </div>
            </div>
          )}

          {/* Error Display */}
          {voiceError && (
            <div className="alert alert-error">
              <span>{voiceError}</span>
            </div>
          )}

          {/* Controls */}
          <div className="flex justify-center gap-4">
            <button
              className={`btn btn-circle btn-lg ${
                isListening ? 'btn-error' : 'btn-primary'
              }`}
              onClick={isListening ? stopListening : handleStartListening}
              disabled={status === 'processing'}
            >
              {isListening ? '⏹️' : '🎤'}
            </button>

            {transcript && (
              <button
                className="btn btn-circle btn-lg btn-secondary"
                onClick={handleManualSearch}
                disabled={status === 'processing'}
              >
                🔍
              </button>
            )}

            {isSpeaking && (
              <button
                className="btn btn-circle btn-lg btn-warning"
                onClick={stopSpeaking}
              >
                🔇
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="text-sm opacity-70 space-y-2">
            <p>Try saying things like:</p>
            <div className="grid grid-cols-1 gap-1 text-xs">
              <div className="bg-base-200 rounded px-2 py-1">
                &quot;Show me action movies like John Wick&quot;
              </div>
              <div className="bg-base-200 rounded px-2 py-1">
                &quot;What should I watch on a rainy Sunday?&quot;
              </div>
              <div className="bg-base-200 rounded px-2 py-1">
                &quot;Find me a funny movie from the 90s&quot;
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-backdrop" onClick={onClose}></div>
    </div>
  );
}; 