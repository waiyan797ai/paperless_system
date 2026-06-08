import { Download, FileBarChart, TrendingUp, Users, FileText } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import StatCard from '../../components/ui/StatCard'
import { chartData } from '../../lib/mockData'
import { useState } from 'react'

export default function Reports() {
  const [period, setPeriod] = useState('6m')

  return (
    <PageTransition>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate and view system reports"
        actions={
          <div className="flex gap-2">
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} options={[
              { value: '1m', label: 'Last Month' },
              { value: '3m', label: 'Last 3 Months' },
              { value: '6m', label: 'Last 6 Months' },
              { value: '1y', label: 'Last Year' },
            ]} className="w-40" />
            <Button variant="gold"><Download className="h-4 w-4" /> Export PDF</Button>
          </div>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <StatCard title="Total Requests" value={299} icon={FileBarChart} trend={12} trendLabel="vs last period" />
        <StatCard title="Approval Rate" value="87%" icon={TrendingUp} trend={3} trendLabel="improvement" />
        <StatCard title="Active Users" value={486} icon={Users} trend={8} trendLabel="growth" />
        <StatCard title="Documents Processed" value="1.2K" icon={FileText} trend={15} trendLabel="this period" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Request Volume</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData.requests}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
              <Legend />
              <Bar dataKey="submitted" fill="#1E3A5F" name="Submitted" radius={[4, 4, 0, 0]} />
              <Bar dataKey="approved" fill="#C9A227" name="Approved" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle className="mb-4">Approval Trend</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData.requests}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12 }} />
              <Legend />
              <Line type="monotone" dataKey="submitted" stroke="#1E3A5F" strokeWidth={2} dot={{ fill: '#1E3A5F' }} name="Submitted" />
              <Line type="monotone" dataKey="approved" stroke="#C9A227" strokeWidth={2} dot={{ fill: '#C9A227' }} name="Approved" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="mt-6">
        <CardTitle className="mb-4">Available Reports</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Request Summary Report', desc: 'Overview of all requests by status and department' },
            { title: 'User Activity Report', desc: 'Login activity and user engagement metrics' },
            { title: 'Document Usage Report', desc: 'Document access and distribution analytics' },
            { title: 'Approval Performance', desc: 'Average approval times by approver' },
            { title: 'Department Comparison', desc: 'Cross-department performance metrics' },
            { title: 'Audit Compliance Report', desc: 'Security and compliance audit summary' },
          ].map((report) => (
            <div key={report.title} className="p-4 rounded-xl border border-[var(--border-color)] hover:border-gold-600/30 transition-colors group">
              <FileBarChart className="h-8 w-8 text-gold-600/60 group-hover:text-gold-600 transition-colors mb-3" />
              <p className="font-medium text-[var(--text-primary)]">{report.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{report.desc}</p>
              <Button variant="outline" size="sm" className="mt-3"><Download className="h-3 w-3" /> Generate</Button>
            </div>
          ))}
        </div>
      </Card>
    </PageTransition>
  )
}
