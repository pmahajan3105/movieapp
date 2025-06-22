import { useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '@/lib/logger'

interface RatePayload {
  movie_id: string
  interested?: boolean
  rating?: number
}

export const useRateMovie = () => {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: async (payload: RatePayload) => {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.text()
        throw new Error(err || 'Failed rating')
      }
      return (await res.json()).data
    },
    onMutate: async variables => {
      await queryClient.cancelQueries({ queryKey: ['ratings'] })
      const previous = queryClient.getQueryData<any[]>(['ratings']) || []
      queryClient.setQueryData<any[]>(['ratings'], old => [...(old || []), { ...variables }])
      return { previous }
    },
    onError: (err, vars, context) => {
      logger.error('Rate movie failed', { error: err })
      if (context?.previous) {
        queryClient.setQueryData(['ratings'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['ratings'] })
    },
  })

  return mutation
}
