import { createContext, useContext, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../hooks/useAuth'
import { useNotifications } from '../hooks/useNotifications'
import { useToast } from '../components/ui/Toast'
import api from '../lib/api'
import { queryKeys } from '../lib/queryKeys'
import { requestNotificationPermission, onForegroundMessage } from '../lib/firebase'

const RealtimeContext = createContext(null)

// WebSocket enabled for real-time notifications
const ENABLE_WEBSOCKET = true
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

  // Initialize Firebase notifications
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission()
      
      // Handle foreground messages
      onForegroundMessage((payload) => {
        const notification = {
          title: payload.notification?.title,
          message: payload.notification?.body,
          data: payload.data
        }
        
        prependNotification(notification)
        addToast(notification.title || notification.message, 'info', 5000)
        
        // Show desktop notification if available
        if (window.__OMS_DESKTOP__?.showNotification) {
          window.__OMS_DESKTOP__.showNotification(
            notification.title || 'New Notification',
            notification.message
          )
        }
      })
    }
  }, [isAuthenticated, prependNotification, addToast])

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
        if (lastNotificationIdRef.current === 0) {
          // First poll — set baseline without showing toasts for existing notifications
          if (latest?.id) lastNotificationIdRef.current = latest.id
        } else if (latest?.id && latest.id > lastNotificationIdRef.current) {
          const newOnes = notifications.filter((n) => n.id > lastNotificationIdRef.current)
          newOnes.reverse().forEach((n) => {
            prependNotification(n)
            addToast(n.title || n.message, 'info', 5000)
            if (n.type === 'document') {
              queryClient.invalidateQueries({ queryKey: ['documents'] })
            }
          })
          lastNotificationIdRef.current = latest.id
        }
      } catch {
        // ignore transient network errors during polling
      }
    }

    poll()
    const interval = setInterval(poll, POLL_MS)

    return () => clearInterval(interval)
  }, [isAuthenticated, addToast, prependNotification, queryClient])

  // WebSocket for real-time notifications
  useEffect(() => {
    if (!isAuthenticated || !ENABLE_WEBSOCKET) return undefined

    const token = localStorage.getItem('oms_token')
    if (!token) return undefined

    // Create WebSocket connection — use wss:// in production via nginx reverse proxy at /ws
    const wsScheme = window.location.protocol === 'https:' ? 'wss' : 'ws'
    const wsHost = import.meta.env.VITE_PUSHER_HOST || window.location.hostname
    const wsPort = import.meta.env.VITE_PUSHER_PORT || window.location.port || (window.location.protocol === 'https:' ? '443' : '80')
    const wsPath = import.meta.env.VITE_PUSHER_PATH || '/ws/'
    const wsUrl = `${wsScheme}://${wsHost}:${wsPort}${wsPath}app/${import.meta.env.VITE_PUSHER_APP_KEY || 'local-key'}`
    const ws = new WebSocket(wsUrl)

    ws.onopen = () => {
      console.log('WebSocket connected')
      // Subscribe to private channel
      ws.send(JSON.stringify({
        event: 'pusher:subscribe',
        data: {
          channel: `private-users.${JSON.parse(atob(token.split('.')[1])).sub}`,
          auth: token
        }
      }))
    }

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.event === 'notification.sent') {
        const notification = data.data
        prependNotification(notification)
        addToast(notification.title || notification.message, 'info', 5000)
        
        // Show desktop notification if available
        if (window.__OMS_DESKTOP__?.showNotification) {
          window.__OMS_DESKTOP__.showNotification(
            notification.title || 'New Notification',
            notification.message
          )
        }
        
        if (notification.type === 'document') {
          queryClient.invalidateQueries({ queryKey: ['documents'] })
        }
      }
      
      if (data.event === 'requests_updated') {
        queryClient.invalidateQueries({ queryKey: ['form-requests'] })
      }
      
      if (data.event === 'documents_updated') {
        queryClient.invalidateQueries({ queryKey: ['documents'] })
      }
    }

    ws.onclose = () => {
      console.log('WebSocket disconnected')
    }

    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    eventSourceRef.current = ws

    return () => {
      ws.close()
      eventSourceRef.current = null
    }
  }, [isAuthenticated, queryClient, addToast, prependNotification])

  return <RealtimeContext.Provider value={{}}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}
