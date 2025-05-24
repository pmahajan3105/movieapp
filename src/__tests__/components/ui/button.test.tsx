import { render } from '@testing-library/react'
import { screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom'
import { Button } from '@/components/ui/button'

describe('Button Component', () => {
  it('renders button with correct text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('handles click events', async () => {
    const user = userEvent.setup()
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)

    await user.click(screen.getByText('Click me'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies default variant styling', () => {
    render(<Button>Default Button</Button>)
    const button = screen.getByText('Default Button')
    expect(button).toHaveClass('bg-primary')
  })

  it('applies secondary variant styling', () => {
    render(<Button variant="secondary">Secondary Button</Button>)
    const button = screen.getByText('Secondary Button')
    expect(button).toHaveClass('bg-secondary')
  })

  it('applies outline variant styling', () => {
    render(<Button variant="outline">Outline Button</Button>)
    const button = screen.getByText('Outline Button')
    expect(button).toHaveClass('border-input')
  })

  it('applies destructive variant styling', () => {
    render(<Button variant="destructive">Destructive Button</Button>)
    const button = screen.getByText('Destructive Button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('applies ghost variant styling', () => {
    render(<Button variant="ghost">Ghost Button</Button>)
    const button = screen.getByText('Ghost Button')
    expect(button).toHaveClass('hover:bg-accent')
  })

  it('applies link variant styling', () => {
    render(<Button variant="link">Link Button</Button>)
    const button = screen.getByText('Link Button')
    expect(button).toHaveClass('text-primary')
  })

  it('applies small size styling', () => {
    render(<Button size="sm">Small Button</Button>)
    const button = screen.getByText('Small Button')
    expect(button).toHaveClass('h-9')
  })

  it('applies large size styling', () => {
    render(<Button size="lg">Large Button</Button>)
    const button = screen.getByText('Large Button')
    expect(button).toHaveClass('h-11')
  })

  it('applies icon size styling', () => {
    render(<Button size="icon">Icon</Button>)
    const button = screen.getByText('Icon')
    expect(button).toHaveClass('h-10', 'w-10')
  })

  it('disables button when disabled prop is true', () => {
    render(<Button disabled>Disabled Button</Button>)
    const button = screen.getByText('Disabled Button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('applies custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    const button = screen.getByText('Custom Button')
    expect(button).toHaveClass('custom-class')
  })

  it('forwards ref correctly', () => {
    const ref = jest.fn()
    render(<Button ref={ref}>Ref Button</Button>)
    expect(ref).toHaveBeenCalled()
  })

  it('renders as different HTML element when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    )
    const link = screen.getByRole('link')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
  })
})
