import { useState, useCallback, useRef, useEffect } from 'react';
import '../types/speech';

interface VoiceInputOptions {
  language?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (transcript: string) => void;
  onError?: (error: string) => void;
}

export const useVoiceInput = (options: VoiceInputOptions = {}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Initialize speech recognition
  const initializeRecognition = useCallback(() => {
    if (typeof window === 'undefined') {
      setIsSupported(false);
      return false;
    }
    
    const SpeechRecognition =
      window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      setIsSupported(false);
      return false;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = options.language || 'en-US';
    recognition.continuous = options.continuous || false;
    recognition.interimResults = options.interimResults !== false; // Default to true

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result && result[0]) {
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }
      }

      if (final) {
        setTranscript(prev => prev + final);
        options.onResult?.(final);
      }
      setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      const errorMessage = `Speech recognition error: ${event.error}`;
      setError(errorMessage);
      setIsListening(false);
      options.onError?.(errorMessage);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsSupported(true);
    return true;
  }, [options.language, options.continuous, options.interimResults, options.onResult, options.onError]);

  // Initialize speech recognition on mount (after function defined)
  useEffect(() => {
    initializeRecognition();
  }, [initializeRecognition]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      if (!initializeRecognition()) {
        return;
      }
    }

    try {
      recognitionRef.current?.start();
    } catch {
      const errorMessage = 'Failed to start voice recognition';
      setError(errorMessage);
      options.onError?.(errorMessage);
    }
  }, [initializeRecognition, options.onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const abortListening = useCallback(() => {
    recognitionRef.current?.abort();
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    error,
    isSupported,
    startListening,
    stopListening,
    resetTranscript,
    abortListening
  };
}; 