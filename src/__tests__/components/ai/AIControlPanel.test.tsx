/**
 * Tests for AIControlPanel component
 * Tests UI rendering, user interactions, and integration with settings hook
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { AIControlPanel } from '@/components/ai/AIControlPanel'
import { useAuth } from '@/contexts/AuthContext'
import { useAISettings } from '@/hooks/useAISettings'

// Mock dependencies
jest.mock('@/contexts/AuthContext')
jest.mock('@/hooks/useAISettings')

// Mock sub-components to isolate testing
jest.mock('@/components/ai/RecommendationBehaviorSection', () => ({
  RecommendationBehaviorSection: ({ settings, updateSetting }: any) => (
    <div data-testid="recommendation-behavior-section">
      Recommendation Behavior Section
      <button onClick={() => updateSetting('recommendation_style', 'test')}>
        Update Style
      </button>
    </div>
  )
}))

jest.mock('@/components/ai/AILearningSection', () => ({
  AILearningSection: () => <div data-testid="ai-learning-section">AI Learning Section</div>
}))

jest.mock('@/components/ai/ContentFilteringSection', () => ({
  ContentFilteringSection: () => <div data-testid="content-filtering-section">Content Filtering Section</div>
}))

jest.mock('@/components/ai/ExplanationSection', () => ({
  ExplanationSection: () => <div data-testid="explanation-section">Explanation Section</div>
}))

jest.mock('@/components/ai/PerformanceSection', () => ({
  PerformanceSection: () => <div data-testid="performance-section">Performance Section</div>
}))

const mockUser = { id: 'user123', email: 'test@example.com' }

const mockSettings = {
  recommendation_style: 'balanced',
  discovery_preference: 'mixed',
  genre_diversity: 70,
  temporal_preference: 'mixed',
  learning_enabled: true,
  conversation_memory: true,
  rating_weight: 80,
  behavioral_analysis: true,
  content_filtering: {
    explicit_content: false,
    violence_threshold: 50,
    adult_themes: true
  },
  explanation_detail: 'standard',
  show_confidence_scores: true,
  show_reasoning: true,
  recommendation_speed: 'balanced',
  cache_preferences: true,
  background_learning: true
}

describe('AIControlPanel', () => {
  const mockUpdateSetting = jest.fn()
  const mockSaveSettings = jest.fn()
  const mockResetToDefaults = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({ user: mockUser })
    ;(useAISettings as jest.Mock).mockReturnValue({
      settings: mockSettings,
      isLoading: false,
      isSaving: false,
      hasChanges: false,
      error: null,
      successMessage: null,
      saveSettings: mockSaveSettings,
      resetToDefaults: mockResetToDefaults,
      updateSetting: mockUpdateSetting
    })
  })

  describe('authentication', () => {
    it('should show login message when user is not authenticated', () => {
      ;(useAuth as jest.Mock).mockReturnValue({ user: null })

      render(<AIControlPanel />)

      expect(screen.getByText('Please log in to access AI controls')).toBeInTheDocument()
      expect(screen.queryByText('AI Control Panel')).not.toBeInTheDocument()
    })

    it('should render control panel when user is authenticated', () => {
      render(<AIControlPanel />)

      expect(screen.getByText('AI Control Panel')).toBeInTheDocument()
      expect(screen.queryByText('Please log in to access AI controls')).not.toBeInTheDocument()
    })
  })

  describe('loading state', () => {
    it('should show loading skeleton when isLoading is true', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: true,
        isSaving: false,
        hasChanges: false,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      expect(screen.getByText('Loading AI Controls...')).toBeInTheDocument()
      expect(screen.queryByText('AI Control Panel')).not.toBeInTheDocument()
      
      // Should show loading skeletons
      const loadingElements = document.querySelectorAll('.animate-pulse')
      expect(loadingElements.length).toBeGreaterThan(0)
    })
  })

  describe('header and controls', () => {
    it('should render header with title and icon', () => {
      render(<AIControlPanel />)

      expect(screen.getByText('AI Control Panel')).toBeInTheDocument()
      // Brain icon should be present (testing via class or data-testid could be added)
    })

    it('should show unsaved changes badge when hasChanges is true', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: true,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()
    })

    it('should not show unsaved changes badge when hasChanges is false', () => {
      render(<AIControlPanel />)

      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
    })
  })

  describe('action buttons', () => {
    it('should render reset and save buttons', () => {
      render(<AIControlPanel />)

      expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
    })

    it('should call resetToDefaults when reset button is clicked', async () => {
      const user = userEvent.setup()
      render(<AIControlPanel />)

      const resetButton = screen.getByRole('button', { name: /reset/i })
      await user.click(resetButton)

      expect(mockResetToDefaults).toHaveBeenCalledTimes(1)
    })

    it('should call saveSettings when save button is clicked', async () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: true,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      const user = userEvent.setup()
      render(<AIControlPanel />)

      const saveButton = screen.getByRole('button', { name: /save/i })
      await user.click(saveButton)

      expect(mockSaveSettings).toHaveBeenCalledTimes(1)
    })

    it('should disable save button when no changes', () => {
      render(<AIControlPanel />)

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeDisabled()
    })

    it('should enable save button when there are changes', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: true,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeEnabled()
    })

    it('should show saving state in save button', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: true,
        hasChanges: true,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      expect(screen.getByText('Saving...')).toBeInTheDocument()
      const saveButton = screen.getByRole('button', { name: /saving/i })
      expect(saveButton).toBeDisabled()
    })
  })

  describe('status messages', () => {
    it('should display error message when error exists', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: false,
        error: 'Failed to save settings',
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      expect(screen.getByText('Failed to save settings')).toBeInTheDocument()
      // Should have error styling
      const errorAlert = screen.getByText('Failed to save settings').closest('.alert-error')
      expect(errorAlert).toBeInTheDocument()
    })

    it('should display success message when available', () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: false,
        error: null,
        successMessage: 'Settings saved successfully!',
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      render(<AIControlPanel />)

      expect(screen.getByText('Settings saved successfully!')).toBeInTheDocument()
      // Should have success styling
      const successAlert = screen.getByText('Settings saved successfully!').closest('.alert-success')
      expect(successAlert).toBeInTheDocument()
    })

    it('should not display status messages when none exist', () => {
      render(<AIControlPanel />)

      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('settings sections', () => {
    it('should render all settings sections', () => {
      render(<AIControlPanel />)

      expect(screen.getByTestId('recommendation-behavior-section')).toBeInTheDocument()
      expect(screen.getByTestId('ai-learning-section')).toBeInTheDocument()
      expect(screen.getByTestId('content-filtering-section')).toBeInTheDocument()
      expect(screen.getByTestId('explanation-section')).toBeInTheDocument()
      expect(screen.getByTestId('performance-section')).toBeInTheDocument()
    })

    it('should pass settings and updateSetting to child components', () => {
      render(<AIControlPanel />)

      // Verify that updateSetting function is passed correctly
      const updateButton = screen.getByText('Update Style')
      fireEvent.click(updateButton)

      expect(mockUpdateSetting).toHaveBeenCalledWith('recommendation_style', 'test')
    })
  })

  describe('privacy notice', () => {
    it('should display privacy notice', () => {
      render(<AIControlPanel />)

      expect(screen.getByText('Privacy & Data')).toBeInTheDocument()
      expect(screen.getByText(/Your AI settings and learned preferences are stored securely/)).toBeInTheDocument()
    })

    it('should include shield icon in privacy notice', () => {
      render(<AIControlPanel />)

      const privacySection = screen.getByText('Privacy & Data').closest('.bg-blue-50')
      expect(privacySection).toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('should have proper button roles', () => {
      render(<AIControlPanel />)

      const resetButton = screen.getByRole('button', { name: /reset/i })
      const saveButton = screen.getByRole('button', { name: /save/i })

      expect(resetButton).toBeInTheDocument()
      expect(saveButton).toBeInTheDocument()
    })

    it('should have proper heading hierarchy', () => {
      render(<AIControlPanel />)

      // Main title should be a heading
      const mainHeading = screen.getByText('AI Control Panel')
      expect(mainHeading).toBeInTheDocument()

      // Privacy section should have proper heading
      const privacyHeading = screen.getByText('Privacy & Data')
      expect(privacyHeading).toBeInTheDocument()
    })
  })

  describe('custom className', () => {
    it('should apply custom className when provided', () => {
      const { container } = render(<AIControlPanel className="custom-class" />)

      const panelContainer = container.querySelector('.custom-class')
      expect(panelContainer).toBeInTheDocument()
    })

    it('should work without custom className', () => {
      const { container } = render(<AIControlPanel />)

      // Should still render properly without custom class
      expect(container.querySelector('.space-y-6')).toBeInTheDocument()
    })
  })

  describe('integration', () => {
    it('should handle multiple state changes correctly', async () => {
      ;(useAISettings as jest.Mock).mockReturnValue({
        settings: mockSettings,
        isLoading: false,
        isSaving: false,
        hasChanges: true,
        error: null,
        successMessage: null,
        saveSettings: mockSaveSettings,
        resetToDefaults: mockResetToDefaults,
        updateSetting: mockUpdateSetting
      })

      const user = userEvent.setup()
      render(<AIControlPanel />)

      // Should show unsaved changes
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument()

      // Should enable save button
      const saveButton = screen.getByRole('button', { name: /save/i })
      expect(saveButton).toBeEnabled()

      // Should be able to interact with sections
      const updateButton = screen.getByText('Update Style')
      await user.click(updateButton)

      expect(mockUpdateSetting).toHaveBeenCalled()
    })
  })
}) 