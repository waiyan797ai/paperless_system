import { useCallback, useMemo, useState } from 'react'
import { mockNotifications } from '../lib/mockData'

export function useNotifications() {
  const [notifications, setNotifications] = useState(mockNotifications)

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  )

  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const removeNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification }
}
