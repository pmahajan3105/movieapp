'use client'

import { RequireAuth } from '@/components/auth/ProtectedRoute'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireAuth>
      <div className="min-h-screen bg-base-100">
        <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </RequireAuth>
  )
}
