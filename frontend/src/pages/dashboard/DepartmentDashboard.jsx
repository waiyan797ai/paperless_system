import { Users, Building2, FileText, Activity } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import StatCard from '../../components/ui/StatCard'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { mockDepartments, mockRequests, chartData } from '../../lib/mockData'
import { useAuth } from '../../hooks/useAuth'

const COLORS = ['#C9A227', '#1E3A5F', '#3D6A9E', '#D4AF37']

export default function DepartmentDashboard() {
  const { user } = useAuth()
  const dept = mockDepartments.find((d) => d.name === user?.department) || mockDepartments[0]

  return (
    <PageTransition>
      <PageHeader title={`${dept.name} Department`} subtitle="Department overview and metrics" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Employees" value={dept.employees} icon={Users} trend={5} trendLabel="this quarter" />
        <StatCard title="Sections" value={dept.sections} icon={Building2} />
        <StatCard title="Active Requests" value={8} icon={Activity} />
        <StatCard title="Documents" value={24} icon={FileText} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Department Requests</CardTitle>
          <div className="space-y-3">
            {mockRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">{req.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">{req.requester}</p>
                </div>
                <Badge variant={req.status === 'approved' ? 'success' : req.status === 'pending' ? 'warning' : 'info'} dot>
                  {req.status}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Workforce Distribution</CardTitle>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={chartData.departments} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                {chartData.departments.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageTransition>
  )
}
