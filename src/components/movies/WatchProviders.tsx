'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Tv, ShoppingCart, DollarSign, ExternalLink } from 'lucide-react'

interface WatchProvider {
  provider_id: number
  provider_name: string
  logo_path: string
  display_priority: number
}

interface WatchProvidersData {
  flatrate?: WatchProvider[]
  rent?: WatchProvider[]
  buy?: WatchProvider[]
  link?: string
}

interface WatchProvidersProps {
  movieId: string
  tmdbId?: number
  compact?: boolean // For movie cards
  region?: string
}

export function WatchProviders({ movieId, tmdbId, compact = false, region = 'US' }: WatchProvidersProps) {
  const [providers, setProviders] = useState<WatchProvidersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchProviders() {
      if (!movieId && !tmdbId) {
        setLoading(false)
        return
      }

      try {
        const response = await fetch(`/api/movies/${movieId}/providers?region=${region}`)
        const data = await response.json()

        if (data.success) {
          setProviders(data.providers)
        } else {
          setError(data.error)
        }
      } catch (err) {
        setError('Failed to load streaming info')
      } finally {
        setLoading(false)
      }
    }

    fetchProviders()
  }, [movieId, tmdbId, region])

  if (loading) {
    return compact ? (
      <div className="flex gap-1">
        <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
        <div className="h-6 w-6 animate-pulse rounded bg-gray-200" />
      </div>
    ) : (
      <div className="animate-pulse space-y-2">
        <div className="h-4 w-24 rounded bg-gray-200" />
        <div className="flex gap-2">
          <div className="h-8 w-8 rounded bg-gray-200" />
          <div className="h-8 w-8 rounded bg-gray-200" />
        </div>
      </div>
    )
  }

  if (error || !providers) {
    return compact ? null : (
      <div className="text-sm text-gray-500">
        No streaming info available
      </div>
    )
  }

  const hasProviders = providers.flatrate?.length || providers.rent?.length || providers.buy?.length

  if (!hasProviders) {
    return compact ? null : (
      <div className="text-sm text-gray-500">
        Not available for streaming
      </div>
    )
  }

  // Compact version for movie cards
  if (compact) {
    const streamingProviders = providers.flatrate?.slice(0, 4) || []

    if (streamingProviders.length === 0) {
      // Show rent/buy if no streaming
      const rentProviders = providers.rent?.slice(0, 2) || []
      if (rentProviders.length === 0) return null

      return (
        <div className="flex items-center gap-1" title="Available to rent">
          <DollarSign className="h-3 w-3 text-gray-400" />
          {rentProviders.map((provider) => (
            <ProviderLogo key={provider.provider_id} provider={provider} size="small" />
          ))}
        </div>
      )
    }

    return (
      <div className="flex items-center gap-1" title="Stream on">
        {streamingProviders.map((provider) => (
          <ProviderLogo key={provider.provider_id} provider={provider} size="small" />
        ))}
        {providers.flatrate && providers.flatrate.length > 4 && (
          <span className="text-xs text-gray-400">+{providers.flatrate.length - 4}</span>
        )}
      </div>
    )
  }

  // Full version for detail pages
  return (
    <div className="space-y-4">
      {providers.flatrate && providers.flatrate.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <Tv className="h-4 w-4" />
            Stream
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.flatrate.map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} showName />
            ))}
          </div>
        </div>
      )}

      {providers.rent && providers.rent.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <ShoppingCart className="h-4 w-4" />
            Rent
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.rent.slice(0, 6).map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} showName />
            ))}
          </div>
        </div>
      )}

      {providers.buy && providers.buy.length > 0 && (
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
            <DollarSign className="h-4 w-4" />
            Buy
          </div>
          <div className="flex flex-wrap gap-2">
            {providers.buy.slice(0, 6).map((provider) => (
              <ProviderLogo key={provider.provider_id} provider={provider} showName />
            ))}
          </div>
        </div>
      )}

      {providers.link && (
        <a
          href={providers.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
        >
          View on JustWatch
          <ExternalLink className="h-3 w-3" />
        </a>
      )}

      <p className="text-xs text-gray-400">
        Streaming info powered by JustWatch
      </p>
    </div>
  )
}

function ProviderLogo({
  provider,
  size = 'normal',
  showName = false
}: {
  provider: WatchProvider
  size?: 'small' | 'normal'
  showName?: boolean
}) {
  const sizeClasses = size === 'small' ? 'h-6 w-6' : 'h-10 w-10'

  if (!provider.logo_path) {
    return (
      <div
        className={`${sizeClasses} flex items-center justify-center rounded bg-gray-100 text-xs text-gray-500`}
        title={provider.provider_name}
      >
        {provider.provider_name.charAt(0)}
      </div>
    )
  }

  return (
    <div className="group relative">
      <Image
        src={provider.logo_path}
        alt={provider.provider_name}
        width={size === 'small' ? 24 : 40}
        height={size === 'small' ? 24 : 40}
        className={`${sizeClasses} rounded object-cover shadow-sm`}
        title={provider.provider_name}
      />
      {showName && (
        <span className="mt-1 block text-center text-xs text-gray-600">
          {provider.provider_name.length > 10
            ? provider.provider_name.slice(0, 10) + '...'
            : provider.provider_name}
        </span>
      )}
    </div>
  )
}

export default WatchProviders
