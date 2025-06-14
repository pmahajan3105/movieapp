import { Skeleton } from '@/components/ui/skeleton'

export function MovieCardSkeleton() {
  return (
    <div className="card bg-base-100 shadow-lg transition-shadow duration-200 hover:shadow-xl">
      {/* Movie Poster Skeleton */}
      <figure className="aspect-[2/3] overflow-hidden">
        <Skeleton className="h-full w-full" />
      </figure>

      {/* Card Body */}
      <div className="card-body p-4">
        {/* Title */}
        <Skeleton className="mb-2 h-6 w-3/4" />

        {/* Year and Rating */}
        <div className="mb-2 flex items-center justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>

        {/* Genre Pills */}
        <div className="mb-3 flex flex-wrap gap-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>

        {/* Overview */}
        <div className="mb-4 space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-4/6" />
        </div>

        {/* Action Buttons */}
        <div className="card-actions justify-end">
          <Skeleton className="rounded-btn h-8 w-20" />
          <Skeleton className="rounded-btn h-8 w-24" />
        </div>
      </div>
    </div>
  )
}

export function MovieGridSkeleton({ count = 12 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, index) => (
        <MovieCardSkeleton key={index} />
      ))}
    </div>
  )
}
