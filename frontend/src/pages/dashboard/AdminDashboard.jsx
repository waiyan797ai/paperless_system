import { Users, Building2, ClipboardList, FileText, Shield, Activity } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import StatCard from '../../components/ui/StatCard'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { mockAuditLogs, mockUsers, chartData } from '../../lib/mockData'
import { formatRelativeTime } from '../../lib/utils'

export default function AdminDashboard() {
  return (
    <PageTransition>
      <PageHeader title="Admin Dashboard" subtitle="System-wide overview and analytics" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4 mb-8">
        <StatCard title="Total Users" value={mockUsers.length * 50} icon={Users} trend={8} trendLabel="this month" />
        <StatCard title="Departments" value={12} icon={Building2} />
        <StatCard title="Active Requests" value={38} icon={ClipboardList} trend={-5} trendLabel="vs last week" />
        <StatCard title="Documents" value="10.2K" icon={FileText} trend={12} trendLabel="this month" />
        <StatCard title="System Health" value="99.9%" icon={Activity} />
        <StatCard title="Audit Events" value={156} icon={Shield} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Request Trends</CardTitle>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData.requests}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A227" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#C9A227" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
              <Area type="monotone" dataKey="submitted" stroke="#1E3A5F" fill="url(#goldGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="approved" stroke="#C9A227" fill="transparent" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle className="mb-4">Recent Activity</CardTitle>
          <div className="space-y-3">
            {mockAuditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{log.user}</p>
                  <Badge variant="gold">{log.action}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-1">{log.details}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">{formatRelativeTime(log.timestamp)}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
