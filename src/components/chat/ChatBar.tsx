'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, MessageCircle, Sparkles } from 'lucide-react';
import { ChatBarProps } from '@/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const ChatBar: React.FC<ChatBarProps> = ({
  onSendMessage,
  isLoading = false,
  placeholder = "Ask me anything about movies... 🍿",
  className = ''
}) => {
  const [message, setMessage] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading) {
      onSendMessage(message.trim());
      setMessage('');
      setIsExpanded(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleFocus = () => {
    setIsExpanded(true);
  };

  const handleBlur = (e: React.FocusEvent) => {
    // Don't collapse if clicking on submit button
    if (!e.relatedTarget?.closest('[data-chat-form]')) {
      setTimeout(() => setIsExpanded(false), 100);
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [message]);

  const suggestedQueries = [
    "Show me sci-fi movies like Blade Runner",
    "I'm in the mood for a comedy tonight",
    "Movies with strong female leads",
    "Something similar to The Godfather",
    "Best movies from the 80s",
    "Hidden gem horror movies"
  ];

  return (
    <div className={cn(
      "fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg",
      "transition-all duration-300 ease-in-out",
      isExpanded ? "h-auto max-h-96" : "h-16",
      className
    )}>
      {/* Suggested Queries (shown when expanded) */}
      {isExpanded && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="text-xs text-gray-600 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Try asking:
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQueries.slice(0, 3).map((query, index) => (
              <button
                key={index}
                onClick={() => setMessage(query)}
                className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 hover:bg-gray-50 hover:border-gray-300 transition-colors"
              >
                {query}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat Input */}
      <form 
        onSubmit={handleSubmit}
        data-chat-form
        className="flex items-end gap-3 p-4"
      >
        <div className="flex-1 relative">
          {/* Chat Icon */}
          <div className="absolute left-3 bottom-3 text-purple-500">
            <MessageCircle className="w-5 h-5" />
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={message}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={handleFocus}
            onBlur={handleBlur}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl",
              "resize-none overflow-y-auto max-h-32",
              "focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 outline-none",
              "placeholder:text-gray-500 text-sm leading-5",
              "transition-all duration-200",
              isLoading && "opacity-50 cursor-not-allowed"
            )}
            rows={1}
          />

          {/* Character count (when message is long) */}
          {message.length > 100 && (
            <div className="absolute right-2 bottom-1 text-xs text-gray-400">
              {message.length}/500
            </div>
          )}
        </div>

        {/* Send Button */}
        <Button
          type="submit"
          disabled={!message.trim() || isLoading}
          className={cn(
            "bg-purple-600 hover:bg-purple-700 text-white rounded-xl px-4 py-3",
            "transition-all duration-200 flex items-center gap-2",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
          {isExpanded && (
            <span className="hidden sm:inline text-sm">
              {isLoading ? 'Thinking...' : 'Send'}
            </span>
          )}
        </Button>
      </form>

      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-1 bg-purple-100">
          <div className="h-full bg-purple-500 animate-pulse"></div>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {isExpanded && !message && (
        <div className="absolute right-4 top-4 text-xs text-gray-400 hidden sm:block">
          Press Enter to send, Shift+Enter for new line
        </div>
      )}
    </div>
  );
}; 