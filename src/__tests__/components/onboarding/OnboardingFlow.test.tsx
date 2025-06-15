import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import { useAuth } from '@/contexts/AuthContext'

// Mock the auth context
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: jest.fn(),
}))

// Mock the supabase client
jest.mock('@/lib/supabase/browser-client', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn(() => Promise.resolve({ error: null })),
    })),
  },
}))

// Mock fetch for API calls
global.fetch = jest.fn()

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, ...props }: any) {
    return <img src={src} alt={alt} {...props} />
  }
})

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
}

const mockMovies = [
  {
    id: '1',
    title: 'Test Movie 1',
    poster_url: 'https://example.com/poster1.jpg',
    year: 2023,
    rating: 8.5,
    genre: ['Action', 'Adventure'],
  },
  {
    id: '2',
    title: 'Test Movie 2',
    poster_url: 'https://example.com/poster2.jpg',
    year: 2022,
    rating: 7.8,
    genre: ['Comedy', 'Romance'],
  },
]

describe('OnboardingFlow', () => {
  const mockOnComplete = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
    })
    ;(global.fetch as jest.Mock).mockResolvedValue({
      json: () =>
        Promise.resolve({
          success: true,
          data: mockMovies,
        }),
    })
  })

  it('renders the welcome screen correctly', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    expect(screen.getByText('Welcome to CineAI')).toBeInTheDocument()
    expect(screen.getByText("Let's create your perfect movie experience")).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
  })

  it('shows genre selection in step 1', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    expect(screen.getByText('What genres do you love?')).toBeInTheDocument()
    expect(
      screen.getByText('Pick 3-5 genres that excite you most (selected: 0/5)')
    ).toBeInTheDocument()

    // Check if genres are displayed
    expect(screen.getByText('Action')).toBeInTheDocument()
    expect(screen.getByText('Comedy')).toBeInTheDocument()
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('allows genre selection and updates counter', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    const actionGenre = screen.getByText('Action')
    const comedyGenre = screen.getByText('Comedy')
    const dramaGenre = screen.getByText('Drama')

    fireEvent.click(actionGenre)
    expect(
      screen.getByText('Pick 3-5 genres that excite you most (selected: 1/5)')
    ).toBeInTheDocument()

    fireEvent.click(comedyGenre)
    fireEvent.click(dramaGenre)
    expect(
      screen.getByText('Pick 3-5 genres that excite you most (selected: 3/5)')
    ).toBeInTheDocument()

    // Continue button should be enabled now
    const continueButton = screen.getByRole('button', { name: /continue/i })
    expect(continueButton).not.toBeDisabled()
  })

  it('prevents selecting more than 5 genres', () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Romance', 'Thriller']

    // Select 5 genres
    genres.slice(0, 5).forEach(genre => {
      fireEvent.click(screen.getByText(genre))
    })

    expect(
      screen.getByText('Pick 3-5 genres that excite you most (selected: 5/5)')
    ).toBeInTheDocument()

    // Try to select 6th genre - should not work
    fireEvent.click(screen.getByText('Thriller'))
    expect(
      screen.getByText('Pick 3-5 genres that excite you most (selected: 5/5)')
    ).toBeInTheDocument()
  })

  it('progresses to step 2 (mood selection) when continue is clicked', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Select 3 genres
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))

    // Click continue
    const continueButton = screen.getByRole('button', { name: /continue/i })
    fireEvent.click(continueButton)

    await waitFor(() => {
      expect(screen.getByText("What's your movie mood?")).toBeInTheDocument()
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()
    })
  })

  it('shows mood selection in step 2', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate to step 2
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText("What's your movie mood?")).toBeInTheDocument()
      expect(
        screen.getByText('Choose 2-3 moods that match your viewing style (selected: 0/3)')
      ).toBeInTheDocument()

      // Check mood options
      expect(screen.getByText('energetic')).toBeInTheDocument()
      expect(screen.getByText('happy')).toBeInTheDocument()
      expect(screen.getByText('romantic')).toBeInTheDocument()
    })
  })

  it('allows mood selection and progresses to step 3', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate to step 2
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      // Select moods
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))

      expect(
        screen.getByText('Choose 2-3 moods that match your viewing style (selected: 2/3)')
      ).toBeInTheDocument()

      // Continue to step 3
      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Rate some popular movies')).toBeInTheDocument()
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument()
    })
  })

  it('fetches movies for rating carousel in step 3', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate to step 3
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/movies?limit=20')
      expect(screen.getByText('Test Movie 1')).toBeInTheDocument()
    })
  })

  it('allows movie rating and navigation in step 3', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate to step 3
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await waitFor(() => {
      // Rate the movie
      const stars = screen.getAllByRole('button')
      const fourthStar = stars.find(button => button.querySelector('svg'))
      if (fourthStar) {
        fireEvent.click(fourthStar)
      }

      // Use quick action buttons
      const loveItButton = screen.getByText('Love it')
      fireEvent.click(loveItButton)

      expect(
        screen.getByText('Help us understand your taste by rating at least 5 movies (rated: 1/20)')
      ).toBeInTheDocument()
    })
  })

  it('progresses to final step when enough movies are rated', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate through all steps quickly
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await waitFor(() => {
      // Rate 5 movies quickly using Love it button
      for (let i = 0; i < 5; i++) {
        const loveItButton = screen.getByText('Love it')
        fireEvent.click(loveItButton)

        const nextButton = screen.getByText('Next')
        if (i < 4) {
          // Don't click next on the last iteration
          fireEvent.click(nextButton)
        }
      }

      // Now continue should be enabled
      const continueButton = screen.getByRole('button', { name: /continue/i })
      fireEvent.click(continueButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Perfect! Your movie profile is ready')).toBeInTheDocument()
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument()
    })
  })

  it('saves preferences and completes onboarding', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate through all steps
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await waitFor(() => {
      // Rate movies
      for (let i = 0; i < 5; i++) {
        const loveItButton = screen.getByText('Love it')
        fireEvent.click(loveItButton)

        const nextButton = screen.getByText('Next')
        if (i < 4) {
          fireEvent.click(nextButton)
        }
      }

      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    await waitFor(() => {
      // Complete onboarding
      const startJourneyButton = screen.getByText('Start My CineAI Journey')
      fireEvent.click(startJourneyButton)
    })

    await waitFor(() => {
      expect(mockOnComplete).toHaveBeenCalled()
    })
  })

  it('shows back navigation between steps', async () => {
    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Go to step 2
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument()

      // Go back to step 1
      const backButton = screen.getByRole('button', { name: /back/i })
      fireEvent.click(backButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument()
      expect(screen.getByText('What genres do you love?')).toBeInTheDocument()
    })
  })

  it('handles API errors gracefully', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValue(new Error('API Error'))

    render(<OnboardingFlow onComplete={mockOnComplete} />)

    // Navigate to step 3 where API is called
    fireEvent.click(screen.getByText('Action'))
    fireEvent.click(screen.getByText('Comedy'))
    fireEvent.click(screen.getByText('Drama'))
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() => {
      fireEvent.click(screen.getByText('energetic'))
      fireEvent.click(screen.getByText('happy'))
      fireEvent.click(screen.getByRole('button', { name: /continue/i }))
    })

    // Should still render step 3 even if API fails
    await waitFor(() => {
      expect(screen.getByText('Rate some popular movies')).toBeInTheDocument()
    })
  })
})
