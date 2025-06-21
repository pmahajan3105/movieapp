import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ClientProviders } from '@/components/providers/ClientProviders'
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
      <body className={`${inter.variable} min-h-screen font-sans antialiased`}>
        <ClientProviders>
          <NavigationHeader />
          <main>{children}</main>
        </ClientProviders>
      </body>
    </html>
  )
}
