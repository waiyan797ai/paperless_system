import { Link } from 'react-router-dom'
import {
  Users, Building2, ClipboardList, FileText, Shield, Clock, CheckCircle,
  Inbox, Layers, ArrowLeftRight, Bell, FileEdit, Activity,
} from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import StatCard from '../../components/ui/StatCard'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import { useDashboard } from '../../hooks/useDashboard'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission } from '../../lib/auth'
import { formatDate, formatRelativeTime, getStatusColor } from '../../lib/utils'

const ICONS = {
  users: Users,
  building: Building2,
  clipboard: ClipboardList,
  file: FileText,
  shield: Shield,
  clock: Clock,
  check: CheckCircle,
  inbox: Inbox,
  layers: Layers,
  arrow: ArrowLeftRight,
  bell: Bell,
  edit: FileEdit,
  activity: Activity,
}

const CHART_COLORS = ['#C9A227', '#1E3A5F', '#3D6A9E', '#D4AF37', '#64748B', '#10B981']

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading, isFetching } = useDashboard()

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner label="Loading dashboard..." />
      </div>
    )
  }

  const stats = data?.stats || []
  const recentRequests = data?.recent_requests || []
  const recentInterMemos = data?.recent_inter_memos || []
  const recentNotifications = data?.recent_notifications || []
  const requestTrends = data?.request_trends || []
  const requestsByStatus = data?.requests_by_status || []
  const canCreateRequest = hasPermission(user, 'form_requests.create')

  return (
    <PageTransition>
      <PageHeader
        title={data?.title || 'Dashboard'}
        subtitle={isFetching ? 'Refreshing...' : data?.subtitle}
        actions={
          <div className="flex flex-wrap gap-2">
            {canCreateRequest && (
              <Link to="/requests/new"><Button variant="gold">New Request</Button></Link>
            )}
            <Link to="/inter-memos/new"><Button variant="secondary">New Inter-Memo</Button></Link>
          </div>
        }
      />

      {(data?.department_name || data?.section_name) && (
        <p className="text-sm text-[var(--text-muted)] -mt-4 mb-6">
          {[data.department_name, data.section_name].filter(Boolean).join(' · ')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = ICONS[stat.icon] || Activity
          return (
            <StatCard
              key={stat.key}
              title={stat.label}
              value={stat.value}
              icon={Icon}
            />
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Request Trends (6 months)</CardTitle>
          {requestTrends.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={requestTrends}>
                <defs>
                  <linearGradient id="dashGoldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
                <Area type="monotone" dataKey="submitted" name="Submitted" stroke="#1E3A5F" fill="url(#dashGoldGrad)" strokeWidth={2} />
                <Area type="monotone" dataKey="approved" name="Approved" stroke="#C9A227" fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">No request data yet.</p>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">Requests by Status</CardTitle>
          {requestsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={requestsByStatus}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {requestsByStatus.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--text-muted)] py-8 text-center">No requests yet.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Requests</CardTitle>
            <Link to="/requests" className="text-xs text-gold-600 hover:underline">View all</Link>
          </div>
          {recentRequests.length > 0 ? (
            <div className="space-y-3">
              {recentRequests.map((req) => (
                <Link
                  key={req.id}
                  to={`/requests/${req.id}`}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{req.title}</p>
                    <p className="text-xs text-[var(--text-muted)] truncate">
                      {req.reference_no} · {req.requester || '—'} · {formatDate(req.created_at)}
                    </p>
                  </div>
                  <Badge variant={getStatusColor(req.status)} dot className="shrink-0">{req.status}</Badge>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No requests yet.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Recent Inter-Memos</CardTitle>
            <Link to="/inter-memos" className="text-xs text-gold-600 hover:underline">View all</Link>
          </div>
          {recentInterMemos.length > 0 ? (
            <div className="space-y-3">
              {recentInterMemos.map((memo) => (
                <Link
                  key={memo.id}
                  to={`/inter-memos/${memo.id}`}
                  className="block p-3 rounded-xl hover:bg-[var(--bg-surface)] transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">{memo.subject}</p>
                    <Badge variant={getStatusColor(memo.status)} dot className="shrink-0">{memo.status}</Badge>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 truncate">
                    {memo.reference_no} · {memo.requester} → {memo.assignee || '—'}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No inter-memos yet.</p>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardTitle>Notifications</CardTitle>
            <Link to="/notifications" className="text-xs text-gold-600 hover:underline">View all</Link>
          </div>
          {recentNotifications.length > 0 ? (
            <div className="space-y-3">
              {recentNotifications.map((n) => (
                <div key={n.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{n.title}</p>
                    {!n.read_at && <Badge variant="warning">New</Badge>}
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatRelativeTime(n.created_at)}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">No notifications.</p>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
