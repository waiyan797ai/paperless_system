import { createContext, useContext, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useToast } from '../components/ui/Toast'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'

const RealtimeContext = createContext(null)

// SSE is disabled by default — php artisan serve is single-threaded and an open
// SSE connection blocks all other API requests. Use polling instead.
const ENABLE_SSE = import.meta.env.VITE_ENABLE_SSE === 'true'
const POLL_MS = 8000

export function RealtimeProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const { addToast } = useToast()
  const { prependNotification } = useNotifications({ enabled: isAuthenticated })
  const lastCountsRef = useRef('')
  const lastDocumentVersionRef = useRef(0)
  const lastNotificationIdRef = useRef(0)
  const eventSourceRef = useRef(null)

  useEffect(() => {
    if (!isAuthenticated) {
      lastCountsRef.current = ''
      lastDocumentVersionRef.current = 0
      lastNotificationIdRef.current = 0
      return undefined
    }

    const poll = async () => {
      try {
        const [countsRes, notifRes, docVersionRes] = await Promise.all([
          api.get('/form-requests/counts'),
          api.get('/notifications', { params: { per_page: 5 } }),
          api.get('/documents/realtime-version'),
        ])

        const counts = countsRes.data?.data || {}
        const countsJson = JSON.stringify(counts)
        if (countsJson !== lastCountsRef.current) {
          lastCountsRef.current = countsJson
          queryClient.setQueryData(queryKeys.formRequestCounts, counts)
          queryClient.invalidateQueries({ queryKey: ['form-requests'] })
        }

        const docVersion = docVersionRes.data?.data?.version ?? 0
        if (lastDocumentVersionRef.current === 0 && docVersion > 0) {
          lastDocumentVersionRef.current = docVersion
        } else if (docVersion !== lastDocumentVersionRef.current) {
          lastDocumentVersionRef.current = docVersion
          queryClient.invalidateQueries({ queryKey: ['documents'] })
        }

        const notifications = notifRes.data?.data?.data || notifRes.data?.data || []
        const latest = notifications[0]
        if (latest?.id && latest.id > lastNotificationIdRef.current) {
          const newOnes = notifications.filter((n) => n.id > lastNotificationIdRef.current)
          newOnes.reverse().forEach((n) => {
            prependNotification(n)
            addToast(n.title || n.message, 'info', 5000)
            if (n.type === 'document') {
              queryClient.invalidateQueries({ queryKey: ['documents'] })
            }
          })
          lastNotificationIdRef.current = latest.id
        } else if (notifications.length && lastNotificationIdRef.current === 0) {
          lastNotificationIdRef.current = notifications[0].id
        }
      } catch {
        // ignore transient network errors during polling
      }
    }

    poll()
    const interval = setInterval(poll, POLL_MS)

    return () => clearInterval(interval)
  }, [isAuthenticated, addToast, prependNotification, queryClient])

  // Optional SSE — only when VITE_ENABLE_SSE=true AND using a proper web server (not artisan serve)
  useEffect(() => {
    if (!isAuthenticated || !ENABLE_SSE) return undefined

    const token = localStorage.getItem('oms_token')
    if (!token) return undefined

    const source = new EventSource(`/api/v1/realtime/stream?token=${encodeURIComponent(token)}`)
    eventSourceRef.current = source

    source.addEventListener('requests_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['form-requests'] })
    })

    source.addEventListener('documents_updated', () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    })

    return () => {
      source.close()
      eventSourceRef.current = null
    }
  }, [isAuthenticated, queryClient])

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}
