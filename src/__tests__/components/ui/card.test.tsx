import React from 'react'
import { render, screen } from '@testing-library/react'
import {
  Card,
  CardHeader,
  CardBody,
  CardContent,
  CardTitle,
  CardDescription,
  CardActions,
  CardFigure,
} from '../../../components/ui/card'

// Mock the utils function
jest.mock('../../../lib/utils', () => ({
  cn: (...classes: any[]) => classes.filter(Boolean).join(' '),
}))

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with default classes', () => {
      render(<Card data-testid="card">Card content</Card>)
      const card = screen.getByTestId('card')

      expect(card).toBeInTheDocument()
      expect(card).toHaveClass('card', 'bg-base-100', 'shadow-sm')
    })

    it('applies size classes correctly', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

      sizes.forEach(size => {
        const { rerender } = render(
          <Card data-testid={`card-${size}`} size={size}>
            Content
          </Card>
        )
        const card = screen.getByTestId(`card-${size}`)
        expect(card).toHaveClass(`card-${size}`)
        rerender(<div />)
      })
    })

    it('applies variant classes correctly', () => {
      const variants = [
        { variant: 'default' as const, expectedClass: '' },
        { variant: 'bordered' as const, expectedClass: 'card-border' },
        { variant: 'dash' as const, expectedClass: 'card-dash' },
        { variant: 'side' as const, expectedClass: 'card-side' },
        { variant: 'image-full' as const, expectedClass: 'image-full' },
      ]

      variants.forEach(({ variant, expectedClass }) => {
        const { rerender } = render(
          <Card data-testid={`card-${variant}`} variant={variant}>
            Content
          </Card>
        )
        const card = screen.getByTestId(`card-${variant}`)

        if (expectedClass) {
          expect(card).toHaveClass(expectedClass)
        }
        rerender(<div />)
      })
    })

    it('merges custom className with default classes', () => {
      render(
        <Card data-testid="card" className="custom-class">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')

      expect(card).toHaveClass('card', 'bg-base-100', 'shadow-sm', 'custom-class')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<Card ref={ref}>Content</Card>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })

    it('passes through HTML attributes', () => {
      render(
        <Card data-testid="card" id="test-id" role="region">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')

      expect(card).toHaveAttribute('id', 'test-id')
      expect(card).toHaveAttribute('role', 'region')
    })
  })

  describe('CardHeader', () => {
    it('renders with correct classes', () => {
      render(<CardHeader data-testid="card-header">Header content</CardHeader>)
      const header = screen.getByTestId('card-header')

      expect(header).toBeInTheDocument()
      expect(header).toHaveClass('card-body', 'pb-2')
    })

    it('merges custom className', () => {
      render(
        <CardHeader data-testid="card-header" className="custom-header">
          Header
        </CardHeader>
      )
      const header = screen.getByTestId('card-header')

      expect(header).toHaveClass('card-body', 'pb-2', 'custom-header')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardHeader ref={ref}>Header</CardHeader>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardBody', () => {
    it('renders with default classes', () => {
      render(<CardBody data-testid="card-body">Body content</CardBody>)
      const body = screen.getByTestId('card-body')

      expect(body).toBeInTheDocument()
      expect(body).toHaveClass('card-body')
    })

    it('applies centered classes when centered prop is true', () => {
      render(
        <CardBody data-testid="card-body" centered>
          Centered content
        </CardBody>
      )
      const body = screen.getByTestId('card-body')

      expect(body).toHaveClass('card-body', 'items-center', 'text-center')
    })

    it('does not apply centered classes when centered prop is false', () => {
      render(
        <CardBody data-testid="card-body" centered={false}>
          Content
        </CardBody>
      )
      const body = screen.getByTestId('card-body')

      expect(body).toHaveClass('card-body')
      expect(body).not.toHaveClass('items-center', 'text-center')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardBody ref={ref}>Body</CardBody>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardContent', () => {
    it('renders with correct classes', () => {
      render(<CardContent data-testid="card-content">Content</CardContent>)
      const content = screen.getByTestId('card-content')

      expect(content).toBeInTheDocument()
      expect(content).toHaveClass('card-body')
    })

    it('is an alias for CardBody', () => {
      const { rerender } = render(<CardContent data-testid="content">Content</CardContent>)
      const content = screen.getByTestId('content')

      rerender(<CardBody data-testid="body">Content</CardBody>)
      const body = screen.getByTestId('body')

      expect(content.className).toBe(body.className)
    })
  })

  describe('CardTitle', () => {
    it('renders as h2 with correct classes', () => {
      render(<CardTitle data-testid="card-title">Title</CardTitle>)
      const title = screen.getByTestId('card-title')

      expect(title).toBeInTheDocument()
      expect(title.tagName).toBe('H2')
      expect(title).toHaveClass('card-title')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLHeadingElement>()
      render(<CardTitle ref={ref}>Title</CardTitle>)

      expect(ref.current).toBeInstanceOf(HTMLHeadingElement)
    })
  })

  describe('CardDescription', () => {
    it('renders as paragraph with correct classes', () => {
      render(<CardDescription data-testid="card-description">Description</CardDescription>)
      const description = screen.getByTestId('card-description')

      expect(description).toBeInTheDocument()
      expect(description.tagName).toBe('P')
      expect(description).toHaveClass('text-base-content/70', 'text-sm')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLParagraphElement>()
      render(<CardDescription ref={ref}>Description</CardDescription>)

      expect(ref.current).toBeInstanceOf(HTMLParagraphElement)
    })
  })

  describe('CardActions', () => {
    it('renders with default position (end)', () => {
      render(<CardActions data-testid="card-actions">Actions</CardActions>)
      const actions = screen.getByTestId('card-actions')

      expect(actions).toBeInTheDocument()
      expect(actions).toHaveClass('card-actions', 'justify-end')
    })

    it('applies position classes correctly', () => {
      const positions = [
        { position: 'start' as const, expectedClass: 'justify-start' },
        { position: 'end' as const, expectedClass: 'justify-end' },
        { position: 'center' as const, expectedClass: 'justify-center' },
      ]

      positions.forEach(({ position, expectedClass }) => {
        const { rerender } = render(
          <CardActions data-testid={`actions-${position}`} position={position}>
            Actions
          </CardActions>
        )
        const actions = screen.getByTestId(`actions-${position}`)
        expect(actions).toHaveClass('card-actions', expectedClass)
        rerender(<div />)
      })
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLDivElement>()
      render(<CardActions ref={ref}>Actions</CardActions>)

      expect(ref.current).toBeInstanceOf(HTMLDivElement)
    })
  })

  describe('CardFigure', () => {
    it('renders as figure element', () => {
      render(<CardFigure data-testid="card-figure">Figure content</CardFigure>)
      const figure = screen.getByTestId('card-figure')

      expect(figure).toBeInTheDocument()
      expect(figure.tagName).toBe('FIGURE')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLElement>()
      render(<CardFigure ref={ref}>Figure</CardFigure>)

      expect(ref.current).toBeInstanceOf(HTMLElement)
    })

    it('applies custom className', () => {
      render(
        <CardFigure data-testid="card-figure" className="custom-figure">
          Figure
        </CardFigure>
      )
      const figure = screen.getByTestId('card-figure')

      expect(figure).toHaveClass('custom-figure')
    })
  })

  describe('Integration Tests', () => {
    it('renders complete card structure', () => {
      render(
        <Card data-testid="complete-card" size="lg" variant="bordered">
          <CardFigure data-testid="figure">
            <img src="/test.jpg" alt="Test" />
          </CardFigure>
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Card Title</CardTitle>
            <CardDescription data-testid="description">Card Description</CardDescription>
          </CardHeader>
          <CardBody data-testid="body" centered>
            <p>Card body content</p>
          </CardBody>
          <CardActions data-testid="actions" position="center">
            <button>Action 1</button>
            <button>Action 2</button>
          </CardActions>
        </Card>
      )

      // Verify all components are rendered
      expect(screen.getByTestId('complete-card')).toBeInTheDocument()
      expect(screen.getByTestId('figure')).toBeInTheDocument()
      expect(screen.getByTestId('header')).toBeInTheDocument()
      expect(screen.getByTestId('title')).toBeInTheDocument()
      expect(screen.getByTestId('description')).toBeInTheDocument()
      expect(screen.getByTestId('body')).toBeInTheDocument()
      expect(screen.getByTestId('actions')).toBeInTheDocument()

      // Verify classes are applied correctly
      expect(screen.getByTestId('complete-card')).toHaveClass('card-lg', 'card-border')
      expect(screen.getByTestId('body')).toHaveClass('items-center', 'text-center')
      expect(screen.getByTestId('actions')).toHaveClass('justify-center')
    })

    it('handles all size and variant combinations', () => {
      const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const
      const variants = ['default', 'bordered', 'dash', 'side', 'image-full'] as const

      sizes.forEach(size => {
        variants.forEach(variant => {
          const testId = `card-${size}-${variant}`
          const { rerender } = render(
            <Card data-testid={testId} size={size} variant={variant}>
              Test content
            </Card>
          )

          const card = screen.getByTestId(testId)
          expect(card).toBeInTheDocument()
          expect(card).toHaveClass('card')

          rerender(<div />)
        })
      })
    })
  })

  describe('Accessibility', () => {
    it('supports ARIA attributes', () => {
      render(
        <Card
          data-testid="accessible-card"
          role="article"
          aria-label="Movie card"
          aria-describedby="card-description"
        >
          <CardTitle id="card-title">Movie Title</CardTitle>
          <CardDescription id="card-description">Movie description</CardDescription>
        </Card>
      )

      const card = screen.getByTestId('accessible-card')
      expect(card).toHaveAttribute('role', 'article')
      expect(card).toHaveAttribute('aria-label', 'Movie card')
      expect(card).toHaveAttribute('aria-describedby', 'card-description')
    })

    it('maintains semantic structure', () => {
      render(
        <Card>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
        </Card>
      )

      const title = screen.getByRole('heading', { level: 2 })
      expect(title).toBeInTheDocument()
      expect(title).toHaveTextContent('Title')
    })
  })
})
