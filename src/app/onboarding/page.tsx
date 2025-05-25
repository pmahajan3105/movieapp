'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ArrowRight, CheckCircle, Clock, MessageCircle } from 'lucide-react'
import type { PreferenceData } from '@/types/chat'
import { toast } from 'react-hot-toast'

export default function OnboardingPage() {
  const router = useRouter()
  const [isStarted, setIsStarted] = useState(false)

  const handlePreferencesExtracted = (extractedPreferences: PreferenceData) => {
    // Preferences are automatically saved by the API, no need to handle here
    console.log('Preferences extracted:', extractedPreferences)
    toast.success('Preferences saved! Redirecting to your recommendations...')
    
    // Redirect to dashboard after a short delay
    setTimeout(() => {
      router.push('/dashboard')
    }, 2000)
  }

  const handleSkip = () => {
    router.push('/dashboard')
  }

  if (isStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <div className="mx-auto max-w-4xl px-4 py-8">
          {/* Progress indicator */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <MessageCircle className="h-3 w-3" />
                Step 1 of 1
              </Badge>
              <span className="text-sm text-gray-600">Learning your preferences</span>
            </div>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
          </div>

          {/* Chat interface */}
          <Card className="shadow-lg">
            <CardContent className="p-0">
              <div className="h-[600px]">
                <ChatInterface onPreferencesExtracted={handlePreferencesExtracted} />
              </div>
            </CardContent>
          </Card>

          {/* Help text */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              💡 <strong>Tip:</strong> Be specific about movies you love or hate - it helps me understand your taste better!
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-4 flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
              <Sparkles className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="mb-4 text-4xl font-bold text-gray-900">
            Welcome to CineAI! 🎬
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Let&apos;s have a quick conversation about your movie preferences so I can recommend films you&apos;ll absolutely love.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center">
            <CardHeader>
              <MessageCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Natural Conversation</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Just chat naturally about movies you love. No boring forms to fill out!
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Clock className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <CardTitle className="text-lg">3-5 Minutes</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Quick and easy! We&apos;ll learn your preferences in just a few exchanges.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <CheckCircle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <CardTitle className="text-lg">Better Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get personalized movie suggestions that actually match your taste.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* What we'll learn */}
        <Card className="mb-12">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-600" />
              What We&apos;ll Learn About You
            </CardTitle>
            <CardDescription>
              Through our conversation, I&apos;ll understand your preferences for:
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Your favorite movies and genres</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Themes and moods you enjoy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Preferred actors and directors</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">When and how you like to watch</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">What you want to avoid</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Your viewing contexts and moods</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Call to action */}
        <div className="text-center">
          <Button 
            size="lg" 
            className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg"
            onClick={() => setIsStarted(true)}
          >
            Start Chatting with CineAI
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          
          <div className="mt-4">
            <Button variant="ghost" onClick={handleSkip}>
              Skip and explore movies
            </Button>
          </div>
          
          <p className="mt-4 text-sm text-gray-500">
            Powered by Groq + Llama 3.1 for lightning-fast responses ⚡
          </p>
        </div>
      </div>
    </div>
  )
} 