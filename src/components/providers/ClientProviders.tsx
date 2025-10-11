'use client'

import { Toaster } from 'react-hot-toast'

import ErrorBoundary from '@/components/ErrorBoundary'
import LoadingOverlay from '@/components/ui/LoadingOverlay'
import { OfflineIndicator } from '@/components/ui/OfflineIndicator'
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration'
import { AuthProvider } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { ErrorRecoveryProvider } from '@/contexts/ErrorRecoveryContext'
import { QueryProvider } from './QueryProvider'
import { LocalUserGate } from '@/components/auth/LocalUserGate'

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <ErrorRecoveryProvider>
        <QueryProvider>
          <ThemeProvider defaultTheme="pastel">
            <AuthProvider>
              <LocalUserGate>
                {children}
              </LocalUserGate>
              <Toaster />
              <LoadingOverlay />
              <OfflineIndicator showOnlineStatus={true} />
              <ServiceWorkerRegistration />
            </AuthProvider>
          </ThemeProvider>
        </QueryProvider>
      </ErrorRecoveryProvider>
    </ErrorBoundary>
  )
}
