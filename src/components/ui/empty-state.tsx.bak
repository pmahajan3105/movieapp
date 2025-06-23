import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Film, Search, Plus } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  title?: string
  description?: string
  actionText?: string
  actionHref?: string
  icon?: React.ReactNode
  className?: string
}

export function EmptyState({
  title = 'Nothing here yet',
  description = 'Get started by adding some content',
  actionText,
  actionHref,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[400px] flex-col items-center justify-center px-4 py-12 text-center',
        className
      )}
    >
      <div className="bg-base-200 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        {icon || <Film className="text-base-content/60 h-8 w-8" />}
      </div>

      <h3 className="text-base-content mb-2 text-lg font-semibold">{title}</h3>

      <p className="text-base-content/70 mb-6 max-w-sm">{description}</p>

      {actionText && actionHref && (
        <Link href={actionHref}>
          <Button className="btn btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            {actionText}
          </Button>
        </Link>
      )}
    </div>
  )
}

// Specific empty states for different sections
export function EmptyWatchlist() {
  return (
    <EmptyState
      title="Your watchlist is empty"
      description="Start building your personal movie collection by adding movies you want to watch."
      actionText="Discover Movies"
      actionHref="/dashboard/discover"
      icon={<Film className="text-primary h-8 w-8" />}
    />
  )
}

export function EmptyWatchedMovies() {
  return (
    <EmptyState
      title="No watched movies yet"
      description="Mark movies as watched to see your viewing history and get personalized recommendations."
      icon={<Film className="text-primary h-8 w-8" />}
    />
  )
}

export function EmptySearchResults() {
  return (
    <EmptyState
      title="No movies found"
      description="Try adjusting your search terms or browse our collection of popular movies."
      actionText="Browse Popular"
      actionHref="/dashboard/discover"
      icon={<Search className="text-warning h-8 w-8" />}
    />
  )
}
