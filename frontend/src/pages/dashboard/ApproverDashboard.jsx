import { ClipboardCheck, Clock, AlertTriangle, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import StatCard from '../../components/ui/StatCard'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { mockRequests, chartData } from '../../lib/mockData'
import { formatDate, getStatusColor } from '../../lib/utils'

export default function ApproverDashboard() {
  const pending = mockRequests.filter((r) => r.status === 'pending')

  return (
    <PageTransition>
      <PageHeader title="Approver Dashboard" subtitle="Review and manage pending approvals" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Pending Approval" value={pending.length} icon={Clock} />
        <StatCard title="Approved Today" value={4} icon={ClipboardCheck} trend={15} trendLabel="vs yesterday" />
        <StatCard title="High Priority" value={2} icon={AlertTriangle} />
        <StatCard title="Approval Rate" value="94%" icon={TrendingUp} trend={3} trendLabel="this week" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Pending Requests</CardTitle>
          <div className="space-y-3">
            {pending.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-4 rounded-xl border border-[var(--border-color)] hover:border-gold-600/30 transition-colors">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{req.title}</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">{req.requester} · {req.department} · {formatDate(req.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={req.priority === 'high' ? 'danger' : 'default'}>{req.priority}</Badge>
                  <Button variant="gold" size="sm" as={Link} to={`/requests/${req.id}`}>Review</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Weekly Activity</CardTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData.requests.slice(-4)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
              <Bar dataKey="approved" fill="#C9A227" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageTransition>
  )
}
