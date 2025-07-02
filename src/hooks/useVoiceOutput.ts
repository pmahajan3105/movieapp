import { useState, useCallback, useEffect } from 'react';
import { audioManager } from '@/lib/audio/AudioManager';

interface VoiceOutputOptions {
  voice?: SpeechSynthesisVoice;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export const useVoiceOutput = (_options: VoiceOutputOptions = {}) => {
  void _options;
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Initialize TTS and load voices
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setIsSupported(false);
      return;
    }

    setIsSupported(true);
    
    // Load available voices
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
    };

    // Load voices immediately
    loadVoices();
    
    // Also load when voices change (some browsers load them asynchronously)
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      // Cleanup
      if (window.speechSynthesis.onvoiceschanged) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const speak = useCallback(async (text: string, _customOptions?: Partial<VoiceOutputOptions>) => {
    void _customOptions;
    if (!isSupported || !window.speechSynthesis) {
      // Silently return if TTS not supported
      return;
    }

    try {
      setIsSpeaking(true);
      await audioManager.speak(text, 'tts');
      setIsSpeaking(false);
    } catch (error) {
      setIsSpeaking(false);
      console.error('Speech synthesis error:', error);
    }
  }, [isSupported]);

  const stopSpeaking = useCallback(() => {
    // Use AudioManager to stop all audio consistently
    audioManager.stopAllAudio();
    setIsSpeaking(false);
  }, []);

  const pauseSpeaking = useCallback(() => {
    audioManager.pauseCurrentAudio();
  }, []);

  const resumeSpeaking = useCallback(() => {
    audioManager.resumeCurrentAudio();
  }, []);

  const getPreferredVoice = useCallback((language: string = 'en-US') => {
    return availableVoices.find(voice => 
      voice.lang.startsWith(language) && voice.localService
    ) || availableVoices.find(voice => voice.lang.startsWith(language));
  }, [availableVoices]);

  const getVoicesByLanguage = useCallback((language: string) => {
    return availableVoices.filter(voice => voice.lang.startsWith(language));
  }, [availableVoices]);

  return {
    speak,
    stopSpeaking,
    pauseSpeaking,
    resumeSpeaking,
    isSpeaking,
    isSupported,
    availableVoices,
    getPreferredVoice,
    getVoicesByLanguage
  };
}; 