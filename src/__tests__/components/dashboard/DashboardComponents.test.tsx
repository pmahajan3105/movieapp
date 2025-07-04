/**
 * Tests for Dashboard components
 * Tests UI rendering, props handling, and accessibility
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DashboardHeader } from '@/components/dashboard/DashboardHeader'
import { DashboardLoadingScreen } from '@/components/dashboard/DashboardLoadingScreen'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'

describe('Dashboard Components', () => {
  describe('DashboardHeader', () => {
    it('should render with default title and subtitle', () => {
      render(<DashboardHeader />)

      expect(screen.getByText('Welcome to CineAI!')).toBeInTheDocument()
      expect(
        screen.getByText('Your personal AI movie companion with intelligent recommendations and conversation')
      ).toBeInTheDocument()
    })

    it('should render with custom title and subtitle', () => {
      const customTitle = 'Custom Dashboard Title'
      const customSubtitle = 'Custom subtitle for testing'

      render(<DashboardHeader title={customTitle} subtitle={customSubtitle} />)

      expect(screen.getByText(customTitle)).toBeInTheDocument()
      expect(screen.getByText(customSubtitle)).toBeInTheDocument()
    })

    it('should display the CineAI logo icon', () => {
      render(<DashboardHeader />)

      // Check for the Sparkles icon container
      const iconContainer = document.querySelector('.rounded-2xl.bg-gradient-to-r')
      expect(iconContainer).toBeInTheDocument()
      expect(iconContainer).toHaveClass('from-purple-500', 'to-blue-500')
    })

    it('should have proper heading hierarchy', () => {
      render(<DashboardHeader />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toBeInTheDocument()
      expect(heading).toHaveTextContent('Welcome to CineAI!')
    })

    it('should apply gradient text styling to title', () => {
      render(<DashboardHeader />)

      const heading = screen.getByRole('heading', { level: 1 })
      expect(heading).toHaveClass('bg-gradient-to-r', 'from-slate-800', 'to-slate-600', 'bg-clip-text')
    })

    it('should be accessible', () => {
      render(<DashboardHeader />)

      // Check that the title is properly marked as a heading
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()

      // Check that subtitle has proper text color for contrast
      const subtitle = screen.getByText(/Your personal AI movie companion/i)
      expect(subtitle).toHaveClass('text-slate-600')
    })
  })

  describe('DashboardLoadingScreen', () => {
    it('should render with default loading message', () => {
      render(<DashboardLoadingScreen />)

      expect(screen.getByText('Loading your dashboard...')).toBeInTheDocument()
    })

    it('should render with custom loading message', () => {
      const customMessage = 'Custom loading message'
      render(<DashboardLoadingScreen message={customMessage} />)

      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('should display the CineAI branding', () => {
      render(<DashboardLoadingScreen />)

      expect(screen.getByText('CineAI')).toBeInTheDocument()
    })

    it('should show loading spinner', () => {
      render(<DashboardLoadingScreen />)

      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveClass('border-4', 'border-purple-200', 'border-t-purple-500')
    })

    it('should have full screen layout', () => {
      render(<DashboardLoadingScreen />)

      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('flex', 'flex-col', 'justify-center')
    })

    it('should apply gradient background', () => {
      render(<DashboardLoadingScreen />)

      const container = document.querySelector('.bg-gradient-to-br')
      expect(container).toBeInTheDocument()
      expect(container).toHaveClass('from-slate-50', 'via-blue-50', 'to-purple-50')
    })

    it('should be accessible for screen readers', () => {
      render(<DashboardLoadingScreen />)

      // Loading message should be readable
      const message = screen.getByText('Loading your dashboard...')
      expect(message).toBeInTheDocument()

      // Brand name should be accessible
      const brandName = screen.getByText('CineAI')
      expect(brandName).toBeInTheDocument()
    })
  })

  describe('DashboardLayout', () => {
    it('should render children content', () => {
      const testContent = 'Test dashboard content'
      render(
        <DashboardLayout>
          <div>{testContent}</div>
        </DashboardLayout>
      )

      expect(screen.getByText(testContent)).toBeInTheDocument()
    })

    it('should apply proper layout styling', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      )

      const outerContainer = document.querySelector('.min-h-screen.bg-gradient-to-br')
      expect(outerContainer).toBeInTheDocument()
      expect(outerContainer).toHaveClass('from-slate-50', 'via-blue-50', 'to-purple-50')

      const innerContainer = document.querySelector('.max-w-7xl')
      expect(innerContainer).toBeInTheDocument()
      expect(innerContainer).toHaveClass('mx-auto', 'px-4', 'py-8', 'sm:px-6', 'lg:px-8')
    })

    it('should be responsive', () => {
      render(
        <DashboardLayout>
          <div>Content</div>
        </DashboardLayout>
      )

      const container = document.querySelector('.max-w-7xl')
      expect(container).toHaveClass('sm:px-6', 'lg:px-8')
    })

    it('should handle multiple children', () => {
      render(
        <DashboardLayout>
          <div>First child</div>
          <div>Second child</div>
          <span>Third child</span>
        </DashboardLayout>
      )

      expect(screen.getByText('First child')).toBeInTheDocument()
      expect(screen.getByText('Second child')).toBeInTheDocument()
      expect(screen.getByText('Third child')).toBeInTheDocument()
    })

    it('should handle empty children gracefully', () => {
      render(<DashboardLayout>{null}</DashboardLayout>)

      const container = document.querySelector('.min-h-screen')
      expect(container).toBeInTheDocument()
    })
  })

  describe('Integration tests', () => {
    it('should work together in typical usage', () => {
      render(
        <DashboardLayout>
          <DashboardHeader title="Test Title" subtitle="Test Subtitle" />
          <div>Dashboard content</div>
        </DashboardLayout>
      )

      expect(screen.getByText('Test Title')).toBeInTheDocument()
      expect(screen.getByText('Test Subtitle')).toBeInTheDocument()
      expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    })

    it('should maintain proper styling hierarchy', () => {
      render(
        <DashboardLayout>
          <DashboardHeader />
        </DashboardLayout>
      )

      // Both should have gradient backgrounds but different elements
      const layoutBackground = document.querySelector('.min-h-screen.bg-gradient-to-br')
      const headerTitle = screen.getByRole('heading', { level: 1 })

      expect(layoutBackground).toBeInTheDocument()
      expect(headerTitle).toHaveClass('bg-gradient-to-r')
    })
  })
}) 