import { useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

const POLL_MS = 15000

function normalizeNotification(n) {
  return {
    id: n.id,
    title: n.title,
    message: n.message,
    type: n.type || 'info',
    read: Boolean(n.read_at),
    readAt: n.read_at,
    createdAt: n.created_at,
    data: n.data,
  }
}

export function useNotifications(options = {}) {
  const queryClient = useQueryClient()

  const listQuery = useQuery({
    queryKey: queryKeys.notifications({ perPage: 20 }),
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { per_page: 20 } })
      const items = data.data?.data || data.data || []
      return items.map(normalizeNotification)
    },
    refetchInterval: options.refetchInterval ?? POLL_MS,
    staleTime: 1000,
    enabled: options.enabled !== false,
  })

  const unreadCountQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const { data } = await api.get('/notifications', { params: { unread_only: true, per_page: 1 } })
      return data.data?.total || data.data?.total || 0
    },
    refetchInterval: options.refetchInterval ?? POLL_MS,
    staleTime: 1000,
    enabled: options.enabled !== false,
  })

  const unreadCount = unreadCountQuery.data ?? 0

  const markAsReadMutation = useMutation({
    mutationFn: (id) => api.post(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllAsReadMutation = useMutation({
    mutationFn: () => api.post('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAsRead = useCallback((id) => {
    markAsReadMutation.mutate(id)
  }, [markAsReadMutation])

  const markAllAsRead = useCallback(() => {
    markAllAsReadMutation.mutate()
  }, [markAllAsReadMutation])

  const prependNotification = useCallback((notification) => {
    queryClient.setQueryData(queryKeys.notifications({ perPage: 20 }), (old = []) => {
      const normalized = normalizeNotification(notification)
      if (old.some((n) => n.id === normalized.id)) return old
      return [normalized, ...old].slice(0, 20)
    })
  }, [queryClient])

  return {
    notifications: listQuery.data || [],
    unreadCount,
    loading: listQuery.isLoading,
    markAsRead,
    markAllAsRead,
    prependNotification,
    refetch: listQuery.refetch,
  }
}
