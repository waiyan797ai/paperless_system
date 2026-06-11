import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'

const POLL_MS = 30000

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const { data } = await api.get('/dashboard')
      return data.data
    },
    refetchInterval: POLL_MS,
    staleTime: 5000,
  })
}
