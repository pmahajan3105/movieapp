'use client'

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated, redirect to appropriate page
      if (user.onboarding_completed) {
        router.push('/dashboard/swipe');
      } else {
        router.push('/dashboard/preferences');
      }
    }
  }, [user, loading, router]);

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
          <p className="mt-4 text-center text-sm text-gray-600">
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // Don't render if user is authenticated (will redirect)
  if (user) {
    return null;
  }

  // Show landing page for non-authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="text-center mb-16">
          <h1 className="text-6xl font-bold text-white mb-6">
            🎬 <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">CineAI</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Your Personal AI Movie Recommendation Assistant
          </p>
        </header>

        {/* Hero Section */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-6">
            Discover Movies You&apos;ll Actually Love
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            Have a natural conversation with our AI about your movie taste. CineAI learns your preferences 
            and recommends films perfectly tailored to your unique style.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/auth/login">
              <Button size="lg" className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 text-lg">
                Get Started
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-purple-900 px-8 py-3 text-lg">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto mb-16">
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold text-white mb-3">AI-Powered Chat</h3>
            <p className="text-gray-300">
              Have natural conversations about movies. Our AI understands your taste and asks the right questions.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-white mb-3">Smart Recommendations</h3>
            <p className="text-gray-300">
              Get personalized movie suggestions based on your unique preferences, mood, and viewing context.
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-white/10 backdrop-blur-sm">
            <div className="text-4xl mb-4">💫</div>
            <h3 className="text-xl font-semibold text-white mb-3">Discover & Track</h3>
            <p className="text-gray-300">
              Swipe through recommendations, build your watchlist, and discover hidden gems you&apos;ll love.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="text-center max-w-4xl mx-auto">
          <h3 className="text-3xl font-bold text-white mb-8">How CineAI Works</h3>
          <div className="grid md:grid-cols-3 gap-6 text-left">
            <div className="flex items-start space-x-3">
              <div className="bg-purple-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">1</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Chat About Movies</h4>
                <p className="text-gray-300">Tell our AI about movies you love, genres you enjoy, and your viewing preferences.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">2</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Get Recommendations</h4>
                <p className="text-gray-300">Swipe through personalized movie recommendations tailored to your taste.</p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="bg-indigo-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">3</div>
              <div>
                <h4 className="text-lg font-semibold text-white mb-2">Build Your List</h4>
                <p className="text-gray-300">Save movies to your watchlist and track what you&apos;ve watched.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
