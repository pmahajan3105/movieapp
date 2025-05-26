import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { AuthProvider } from '@/contexts/AuthContext'
import { NavigationHeader } from '@/components/layout/NavigationHeader'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'CineAI - Personal Movie Recommendations',
  description: 'AI-powered movie recommendations tailored to your taste',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased min-h-screen`}>
        <ThemeProvider defaultTheme="pastel">
          <AuthProvider>
            <div className="min-h-screen bg-white">
              <NavigationHeader />
              <main>
                {children}
              </main>
            </div>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
