import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

const POLL_MS = 8000

export function useDocumentsList({ page, search, category, pageSize = 10, enabled = true }) {
  return useQuery({
    queryKey: queryKeys.documents({ page, search, category, pageSize }),
    queryFn: async () => {
      const { data } = await api.get('/documents', {
        params: {
          page,
          per_page: pageSize,
          search: search || undefined,
          category: category || undefined,
        },
      })
      return {
        items: data.data?.data || [],
        totalPages: data.data?.last_page || 1,
        totalItems: data.data?.total || 0,
      }
    },
    enabled,
    refetchInterval: POLL_MS,
    staleTime: 1000,
    placeholderData: (prev) => prev,
  })
}

export function useDocumentDistributions({ pageSize = 10, enabled = true } = {}) {
  return useQuery({
    queryKey: queryKeys.documentDistributions({ pageSize }),
    queryFn: async () => {
      const { data } = await api.get('/documents/distributions', { params: { per_page: pageSize } })
      return data.data?.data || []
    },
    enabled,
    refetchInterval: POLL_MS,
    staleTime: 1000,
    placeholderData: (prev) => prev,
  })
}

export function useInvalidateDocuments() {
  const queryClient = useQueryClient()

  return () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] })
  }
}
