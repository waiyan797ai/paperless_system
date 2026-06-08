import { Bell, CheckCheck } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import EmptyState from '../../components/ui/EmptyState'
import { useNotifications } from '../../hooks/useNotifications'
import { formatRelativeTime } from '../../lib/utils'
import { useState } from 'react'
import { cn } from '../../lib/utils'

export default function Notifications() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications()
  const [activeTab, setActiveTab] = useState('all')

  const tabs = [
    { id: 'all', label: 'All', count: notifications.length },
    { id: 'unread', label: 'Unread', count: unreadCount },
  ]

  const filtered = activeTab === 'unread' ? notifications.filter((n) => !n.read) : notifications

  const typeVariant = { success: 'success', info: 'info', warning: 'warning', error: 'danger' }

  return (
    <PageTransition>
      <PageHeader
        title="Notifications"
        subtitle={`${unreadCount} unread notifications`}
        actions={unreadCount > 0 && (
          <Button variant="secondary" onClick={markAllAsRead}><CheckCheck className="h-4 w-4" /> Mark All Read</Button>
        )}
      />
      <Card>
        <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} className="mb-6 w-fit" />
        {filtered.length === 0 ? (
          <EmptyState icon={Bell} title="No notifications" description="You're all caught up!" />
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-xl border transition-colors',
                  !n.read ? 'bg-gold-600/5 border-gold-600/20' : 'border-[var(--border-color)] hover:bg-[var(--bg-surface)]'
                )}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-[var(--text-primary)]">{n.title}</p>
                    <Badge variant={typeVariant[n.type] || 'default'}>{n.type}</Badge>
                    {!n.read && <span className="h-2 w-2 rounded-full bg-gold-500" />}
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{n.message}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-2">{formatRelativeTime(n.createdAt)}</p>
                </div>
                {!n.read && (
                  <Button variant="ghost" size="icon" onClick={() => markAsRead(n.id)} title="Mark as read">
                    <CheckCheck className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageTransition>
  )
}
