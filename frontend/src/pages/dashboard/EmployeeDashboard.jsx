import { ClipboardList, Clock, CheckCircle, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import StatCard from '../../components/ui/StatCard'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { mockRequests, mockNotifications } from '../../lib/mockData'
import { formatDate, getStatusColor } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'

export default function EmployeeDashboard() {
  const { user } = useAuth()
  const myRequests = mockRequests.filter((r) => r.requester === user?.name)

  return (
    <PageTransition>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0]}`}
        subtitle="Your personal workspace overview"
        actions={<Link to="/requests/new"><Button variant="gold">New Request</Button></Link>}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="My Requests" value={myRequests.length || 3} icon={ClipboardList} trend={12} trendLabel="this month" />
        <StatCard title="Pending" value={2} icon={Clock} />
        <StatCard title="Approved" value={5} icon={CheckCircle} trend={8} trendLabel="vs last month" />
        <StatCard title="Documents" value={12} icon={FileText} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Recent Requests</CardTitle>
          <div className="space-y-3">
            {mockRequests.slice(0, 4).map((req) => (
              <Link key={req.id} to={`/requests/${req.id}`} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{req.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{req.id} · {formatDate(req.createdAt)}</p>
                </div>
                <Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge>
              </Link>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Recent Notifications</CardTitle>
          <div className="space-y-3">
            {mockNotifications.slice(0, 4).map((n) => (
              <div key={n.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                <p className="text-xs text-[var(--text-muted)] mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
