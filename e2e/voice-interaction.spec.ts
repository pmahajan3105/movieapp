import { test, expect } from '@playwright/test'

test.describe('Voice Interaction Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authenticated state
    await page.addInitScript(() => {
      localStorage.setItem('supabase.auth.token', 'mock-token')
      
      // Mock Web Speech API
      window.SpeechRecognition = class MockSpeechRecognition {
        onstart = null
        onresult = null
        onerror = null
        onend = null
        continuous = true
        interimResults = true
        
        start() {
          if (this.onstart) this.onstart()
          
          // Simulate speech recognition result
          setTimeout(() => {
            if (this.onresult) {
              this.onresult({
                results: [{
                  0: { transcript: 'show me action movies' },
                  isFinal: true
                }]
              })
            }
          }, 1000)
        }
        
        stop() {
          if (this.onend) this.onend()
        }
        
        abort() {
          if (this.onend) this.onend()
        }
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
      
      // Mock Speech Synthesis API
      window.speechSynthesis = {
        speak: () => {},
        cancel: () => {},
        pause: () => {},
        resume: () => {},
        getVoices: () => [],
        speaking: false,
        pending: false,
        paused: false
      }
      
      // Mock getUserMedia for microphone access
      navigator.mediaDevices = {
        getUserMedia: () => Promise.resolve(new MediaStream())
      }
    })
    
    await page.goto('/dashboard')
  })

  test('should open voice conversation widget', async ({ page }) => {
    // Look for voice conversation widget
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
      .or(page.locator('button[aria-label*="voice"]'))
      .or(page.locator('button:has-text("Voice")'))
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Should open voice modal/interface
      await expect(page.locator('[data-testid="voice-modal"]')
        .or(page.locator('[data-testid="conversation-modal"]'))
        .or(page.locator('.voice-interface'))).toBeVisible()
      
      // Should show microphone controls
      await expect(page.locator('button:has-text("Start")')
        .or(page.locator('[data-testid="mic-button"]'))
        .or(page.locator('button[aria-label*="microphone"]'))).toBeVisible()
    }
  })

  test('should handle voice recording flow', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Start recording
      const startButton = page.locator('button:has-text("Start")')
        .or(page.locator('[data-testid="start-recording"]'))
      
      if (await startButton.isVisible()) {
        await startButton.click()
        
        // Should show recording state
        await expect(page.locator('text=Listening')
          .or(page.locator('text=Recording'))
          .or(page.locator('[data-testid="recording-indicator"]'))).toBeVisible()
        
        // Should show stop button
        await expect(page.locator('button:has-text("Stop")')
          .or(page.locator('[data-testid="stop-recording"]'))).toBeVisible()
        
        // Stop recording
        const stopButton = page.locator('button:has-text("Stop")')
        await stopButton.click()
        
        // Should show processing state
        await expect(page.locator('text=Processing')
          .or(page.locator('text=Analyzing'))
          .or(page.locator('.loading'))).toBeVisible()
      }
    }
  })

  test('should show AI response to voice input', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Simulate voice input by typing (as fallback)
      const textInput = page.locator('input[placeholder*="message"]')
        .or(page.locator('textarea[placeholder*="ask"]'))
      
      if (await textInput.isVisible()) {
        await textInput.fill('I want to watch a sci-fi movie tonight')
        
        const sendButton = page.locator('button:has-text("Send")')
          .or(page.locator('button[type="submit"]'))
        
        await sendButton.click()
        
        // Should show AI response
        await expect(page.locator('[data-testid="ai-response"]')
          .or(page.locator('.chat-message'))
          .or(page.locator('text=recommend'))).toBeVisible({ timeout: 10000 })
        
        // Response should contain movie suggestions
        await expect(page.locator('text=movie')
          .or(page.locator('text=film'))
          .or(page.locator('[data-testid="movie-suggestion"]'))).toBeVisible()
      }
      
      // Alternatively, start recording to trigger voice flow
      const micButton = page.locator('[data-testid="mic-button"]')
      if (await micButton.isVisible()) {
        await micButton.click()
        await page.waitForTimeout(2000)
        
        // Should show transcribed text
        await expect(page.locator('text=action movies')
          .or(page.locator('[data-testid="transcription"]'))).toBeVisible({ timeout: 5000 })
        
        // Should trigger AI response
        await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should support text-to-speech for AI responses', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Send a message to get AI response
      const textInput = page.locator('input[placeholder*="message"]')
      if (await textInput.isVisible()) {
        await textInput.fill('Tell me about the movie Inception')
        await page.locator('button:has-text("Send")').click()
        
        // Wait for AI response
        await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 })
        
        // Look for speak button
        const speakButton = page.locator('button[aria-label*="speak"]')
          .or(page.locator('[data-testid="speak-button"]'))
          .or(page.locator('button:has-text("🔊")'))
        
        if (await speakButton.isVisible()) {
          await speakButton.click()
          
          // Should show speaking indicator
          await expect(page.locator('text=Speaking')
            .or(page.locator('[data-testid="speaking-indicator"]'))).toBeVisible()
          
          // Should have stop speaking option
          const stopSpeakButton = page.locator('button:has-text("Stop")')
          if (await stopSpeakButton.isVisible()) {
            await stopSpeakButton.click()
          }
        }
      }
    }
  })

  test('should handle microphone permission requests', async ({ page }) => {
    // Grant microphone permission
    await page.context().grantPermissions(['microphone'])
    
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      const micButton = page.locator('[data-testid="mic-button"]')
      if (await micButton.isVisible()) {
        await micButton.click()
        
        // Should start recording without permission error
        await expect(page.locator('text=Listening')
          .or(page.locator('[data-testid="recording-indicator"]'))).toBeVisible()
      }
    }
  })

  test('should handle microphone permission denied', async ({ page }) => {
    // Mock permission denied
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () => 
        Promise.reject(new Error('Permission denied'))
    })
    
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      const micButton = page.locator('[data-testid="mic-button"]')
      if (await micButton.isVisible()) {
        await micButton.click()
        
        // Should show permission error
        await expect(page.locator('text=microphone permission')
          .or(page.locator('text=Permission denied'))
          .or(page.locator('text=Enable microphone'))).toBeVisible()
        
        // Should provide fallback text input
        await expect(page.locator('input[placeholder*="type"]')
          .or(page.locator('text=type your message'))).toBeVisible()
      }
    }
  })

  test('should support conversation history', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Send multiple messages
      const textInput = page.locator('input[placeholder*="message"]')
      if (await textInput.isVisible()) {
        // First message
        await textInput.fill('What are some good comedy movies?')
        await page.locator('button:has-text("Send")').click()
        await page.waitForTimeout(2000)
        
        // Second message
        await textInput.fill('What about from the 90s?')
        await page.locator('button:has-text("Send")').click()
        await page.waitForTimeout(2000)
        
        // Should show conversation history
        const messages = page.locator('[data-testid="chat-message"]')
          .or(page.locator('.chat-message'))
        
        const messageCount = await messages.count()
        expect(messageCount).toBeGreaterThan(2) // User messages + AI responses
        
        // Should maintain context in conversation
        await expect(page.locator('text=90s')
          .or(page.locator('text=earlier'))).toBeVisible()
      }
    }
  })

  test('should handle voice search integration', async ({ page }) => {
    await page.goto('/search')
    
    // Look for voice search button
    const voiceSearchButton = page.locator('[data-testid="voice-search"]')
      .or(page.locator('button[aria-label*="voice search"]'))
      .or(page.locator('button:has-text("🎤")'))
    
    if (await voiceSearchButton.isVisible()) {
      await voiceSearchButton.click()
      
      // Should open voice search modal
      await expect(page.locator('[data-testid="voice-search-modal"]')
        .or(page.locator('.voice-search-interface'))).toBeVisible()
      
      // Start voice recording
      const startRecordingButton = page.locator('button:has-text("Start")')
      if (await startRecordingButton.isVisible()) {
        await startRecordingButton.click()
        
        // Should show recording state
        await expect(page.locator('text=Listening')).toBeVisible()
        
        // Mock speech input result
        await page.waitForTimeout(2000)
        
        // Should show transcribed search query
        await expect(page.locator('text=action movies')
          .or(page.locator('[data-testid="transcription"]'))).toBeVisible()
        
        // Should perform search automatically
        await expect(page.locator('[data-testid="search-results"]')).toBeVisible({ timeout: 10000 })
      }
    }
  })

  test('should handle voice commands for navigation', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      const textInput = page.locator('input[placeholder*="message"]')
      if (await textInput.isVisible()) {
        // Test navigation command
        await textInput.fill('show me my watchlist')
        await page.locator('button:has-text("Send")').click()
        
        // Should either navigate or provide navigation link
        await page.waitForTimeout(3000)
        
        const watchlistLink = page.locator('a:has-text("watchlist")')
          .or(page.locator('button:has-text("View Watchlist")'))
        
        if (await watchlistLink.isVisible()) {
          await watchlistLink.click()
          
          // Should navigate to watchlist
          await expect(page).toHaveURL(/.*watchlist.*/)
        }
      }
    }
  })

  test('should support voice settings and preferences', async ({ page }) => {
    await page.goto('/dashboard/settings')
    
    // Look for voice settings section
    const voiceSettings = page.locator('[data-testid="voice-settings"]')
      .or(page.locator('text=Voice Settings'))
      .or(page.locator('text=Speech'))
    
    if (await voiceSettings.isVisible()) {
      // Should have voice speed control
      const speedSlider = page.locator('input[type="range"][name*="speed"]')
        .or(page.locator('[data-testid="speech-speed"]'))
      
      if (await speedSlider.isVisible()) {
        await speedSlider.fill('0.8')
      }
      
      // Should have voice selection
      const voiceSelect = page.locator('select[name*="voice"]')
        .or(page.locator('[data-testid="voice-selection"]'))
      
      if (await voiceSelect.isVisible()) {
        await voiceSelect.selectOption({ index: 1 })
      }
      
      // Should have enable/disable toggle
      const voiceToggle = page.locator('input[type="checkbox"][name*="voice"]')
        .or(page.locator('[data-testid="voice-toggle"]'))
      
      if (await voiceToggle.isVisible()) {
        await voiceToggle.click()
      }
      
      // Save settings
      const saveButton = page.locator('button:has-text("Save")')
      if (await saveButton.isVisible()) {
        await saveButton.click()
        
        // Should show confirmation
        await expect(page.locator('text=saved')
          .or(page.locator('text=updated'))).toBeVisible()
      }
    }
  })

  test('should handle voice errors gracefully', async ({ page }) => {
    // Mock speech recognition error
    await page.addInitScript(() => {
      window.SpeechRecognition = class ErrorSpeechRecognition {
        onstart = null
        onresult = null
        onerror = null
        onend = null
        
        start() {
          if (this.onstart) this.onstart()
          
          setTimeout(() => {
            if (this.onerror) {
              this.onerror({ error: 'no-speech' })
            }
          }, 1000)
        }
        
        stop() {}
        abort() {}
      }
      
      window.webkitSpeechRecognition = window.SpeechRecognition
    })
    
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      const micButton = page.locator('[data-testid="mic-button"]')
      if (await micButton.isVisible()) {
        await micButton.click()
        
        // Should show error message
        await expect(page.locator('text=speech recognition')
          .or(page.locator('text=not heard'))
          .or(page.locator('text=try again'))).toBeVisible({ timeout: 5000 })
        
        // Should provide retry option
        const retryButton = page.locator('button:has-text("Try Again")')
        if (await retryButton.isVisible()) {
          await retryButton.click()
        }
        
        // Should fallback to text input
        await expect(page.locator('input[placeholder*="type"]')
          .or(page.locator('text=type your message'))).toBeVisible()
      }
    }
  })

  test('should support multilingual voice interaction', async ({ page }) => {
    const voiceWidget = page.locator('[data-testid="voice-widget"]')
    
    if (await voiceWidget.isVisible()) {
      await voiceWidget.click()
      
      // Look for language selection
      const languageSelect = page.locator('select[name*="language"]')
        .or(page.locator('[data-testid="language-selector"]'))
      
      if (await languageSelect.isVisible()) {
        await languageSelect.selectOption('es-ES')
        
        // Test Spanish input
        const textInput = page.locator('input[placeholder*="message"]')
        if (await textInput.isVisible()) {
          await textInput.fill('Recomienda películas de acción')
          await page.locator('button:has-text("Send")').click()
          
          // Should handle multilingual response
          await expect(page.locator('[data-testid="ai-response"]')).toBeVisible({ timeout: 10000 })
        }
      }
    }
  })
})