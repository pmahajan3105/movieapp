'use client'

import React from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChatInterface } from '@/components/ai/ChatInterface'
import { toast } from 'react-hot-toast'

export default function DashboardPage() {
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col justify-center bg-gray-50 py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Welcome to CineAI! 🎬</h1>
          <p className="text-gray-600">Chat with our AI to discover your perfect movies</p>
        </div>

        {/* AI Chat Section */}
        <section>
          <Card className="mx-auto max-w-4xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-green-500"></span>
                Chat with CineAI
              </CardTitle>
              <CardDescription className="text-center">
                Tell me what kind of movies you&apos;re looking for and I&apos;ll help you discover amazing films!
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[600px] overflow-hidden">
                <ChatInterface
                  onPreferencesExtracted={preferences => {
                    console.log('Preferences learned:', preferences)
                    // Show success message and suggest next steps
                    setTimeout(() => {
                      toast.success('🎯 Preferences saved! Check out your personalized movies!')
                    }, 500)
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
