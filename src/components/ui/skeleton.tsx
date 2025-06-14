import { cn } from '@/lib/utils'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  )
}

export { Skeleton }

// Movie card skeleton for loading states
export function MovieCardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-xl">
      <figure>
        <div className="skeleton h-64 w-full"></div>
      </figure>
      <div className="card-body">
        <div className="skeleton mb-2 h-6 w-3/4"></div>
        <div className="skeleton mb-4 h-4 w-1/2"></div>
        <div className="mb-4 flex flex-wrap gap-1">
          <div className="skeleton h-5 w-16"></div>
          <div className="skeleton h-5 w-20"></div>
          <div className="skeleton h-5 w-14"></div>
        </div>
        <div className="card-actions justify-end">
          <div className="skeleton h-9 w-24"></div>
          <div className="skeleton h-9 w-20"></div>
        </div>
      </div>
    </div>
  )
}

// Watchlist grid skeleton
export function WatchlistSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <MovieCardSkeleton key={i} />
      ))}
    </div>
  )
}
