import { Button } from '@/components/ui/button'
import { SortAsc } from 'lucide-react'

type FilterType = 'all' | 'watched' | 'unwatched'
type SortType = 'added_at' | 'title' | 'year'

interface WatchlistFiltersProps {
  filter: FilterType
  sortBy: SortType
  totalCount: number
  watchedCount: number
  unwatchedCount: number
  onFilterChange: (filter: FilterType) => void
  onSortChange: (sort: SortType) => void
}

export function WatchlistFilters({
  filter,
  sortBy,
  totalCount,
  watchedCount,
  unwatchedCount,
  onFilterChange,
  onSortChange,
}: WatchlistFiltersProps) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('all')}
        >
          All ({totalCount})
        </Button>
        <Button
          variant={filter === 'unwatched' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('unwatched')}
        >
          To Watch ({unwatchedCount})
        </Button>
        <Button
          variant={filter === 'watched' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onFilterChange('watched')}
        >
          Watched ({watchedCount})
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <SortAsc className="h-4 w-4 text-gray-500" />
        <select
          value={sortBy}
          onChange={e => onSortChange(e.target.value as SortType)}
          className="rounded border border-gray-300 px-3 py-1 text-sm"
        >
          <option value="added_at">Date Added</option>
          <option value="title">Title</option>
          <option value="year">Year</option>
        </select>
      </div>
    </div>
  )
}
