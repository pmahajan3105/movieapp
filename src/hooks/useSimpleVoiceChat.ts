'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

interface UseSimpleVoiceChatOptions {
  onTranscript?: (text: string, isFinal: boolean) => void
  onResponse?: (text: string) => void
  onError?: (error: string) => void
}

export const useSimpleVoiceChat = ({
  onTranscript,
  onResponse,
  onError
}: UseSimpleVoiceChatOptions = {}) => {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const synthesisRef = useRef<SpeechSynthesis | null>(null)

  // Check if browser supports speech recognition
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognition()
    
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setIsListening(true)
    }

    recognition.onend = () => {
      setIsListening(false)
    }

    recognition.onerror = (event) => {
      setIsListening(false)
      onError?.(`Speech recognition error: ${event.error}`)
    }

    recognition.onresult = (event) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcript
        } else {
          interimTranscript += transcript
        }
      }

      if (interimTranscript) {
        onTranscript?.(interimTranscript, false)
      }

      if (finalTranscript) {
        onTranscript?.(finalTranscript, true)
        // Process the final transcript
        processSpeech(finalTranscript)
      }
    }

    recognitionRef.current = recognition
    synthesisRef.current = window.speechSynthesis

    return () => {
      recognition.abort()
    }
  }, [isSupported, onTranscript, onError])

  // Process speech and get AI response
  const processSpeech = useCallback(async (text: string) => {
    if (!text.trim()) return

    setIsProcessing(true)
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          voice: true // Flag to indicate this is a voice request
        })
      })

      if (!response.ok) throw new Error('Failed to get response')
      
      const data = await response.json()
      const aiResponse = data.response || data.message || 'Sorry, I could not process that.'
      
      onResponse?.(aiResponse)
      speak(aiResponse)
      
    } catch (error) {
      const errorMsg = 'Sorry, I encountered an error processing your request.'
      onError?.(errorMsg)
      speak(errorMsg)
    } finally {
      setIsProcessing(false)
    }
  }, [onResponse, onError])

  // Text-to-speech
  const speak = useCallback((text: string) => {
    if (!synthesisRef.current || !text) return

    // Stop any current speech
    synthesisRef.current.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 0.9
    utterance.pitch = 1
    utterance.volume = 0.8

    utterance.onstart = () => setIsSpeaking(true)
    utterance.onend = () => setIsSpeaking(false)
    utterance.onerror = () => {
      setIsSpeaking(false)
      onError?.('Speech synthesis error')
    }

    synthesisRef.current.speak(utterance)
  }, [onError])

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current || isListening) return

    try {
      recognitionRef.current.start()
    } catch (error) {
      onError?.('Could not start voice recognition')
    }
  }, [isListening, onError])

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current || !isListening) return

    recognitionRef.current.stop()
  }, [isListening])

  // Stop speaking
  const stopSpeaking = useCallback(() => {
    if (!synthesisRef.current) return
    
    synthesisRef.current.cancel()
    setIsSpeaking(false)
  }, [])

  // Toggle voice chat
  const toggleVoiceChat = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      stopSpeaking() // Stop any current speech before starting to listen
      startListening()
    }
  }, [isListening, startListening, stopListening, stopSpeaking])

  return {
    isSupported,
    isListening,
    isSpeaking,
    isProcessing,
    isActive: isListening || isSpeaking || isProcessing,
    startListening,
    stopListening,
    stopSpeaking,
    toggleVoiceChat,
    speak
  }
}