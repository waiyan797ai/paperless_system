import { Download, FileBarChart, TrendingUp, Users, FileText } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import StatCard from '../../components/ui/StatCard'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { useState } from 'react'

export default function Reports() {
  const navigate = useNavigate()
  const [period, setPeriod] = useState('6m')

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const { data } = await api.get('/reports/overview')
      return data.data
    },
  })

  const { data: requestData, isLoading: requestLoading } = useQuery({
    queryKey: ['reports', 'requests'],
    queryFn: async () => {
      const { data } = await api.get('/reports/requests')
      return data.data
    },
  })

  const { data: userData, isLoading: userLoading } = useQuery({
    queryKey: ['reports', 'users'],
    queryFn: async () => {
      const { data } = await api.get('/reports/users')
      return data.data
    },
  })

  const { data: documentData, isLoading: documentLoading } = useQuery({
    queryKey: ['reports', 'documents'],
    queryFn: async () => {
      const { data } = await api.get('/reports/documents')
      return data.data
    },
  })

  const { data: trendsData, isLoading: trendsLoading } = useQuery({
    queryKey: ['reports', 'trends', period],
    queryFn: async () => {
      const months = period === '1m' ? 1 : period === '3m' ? 3 : period === '6m' ? 6 : 12
      const { data } = await api.get('/reports/trends', { params: { months } })
      return data.data
    },
  })

  const handlePeriodChange = (value) => {
    setPeriod(value)
  }

  const handleGenerateReport = (reportType) => {
    navigate(`/reports/${reportType}`)
  }

  return (
    <PageTransition>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Generate and view system reports"
        actions={
          <div className="flex gap-2">
            <Select value={period} onChange={(e) => handlePeriodChange(e.target.value)} options={[
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
        <StatCard title="Total Requests" value={overview?.pending_requests || 0} icon={FileBarChart} />
        <StatCard title="Active Users" value={userData?.total || 0} icon={Users} />
        <StatCard title="Departments" value={overview?.departments || 0} icon={TrendingUp} />
        <StatCard title="Documents" value={documentData?.total || 0} icon={FileText} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-4">Request Volume Trend</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendsData || []}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="requests.total" stroke="#60A5FA" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" name="Total" />
              <Area type="monotone" dataKey="requests.approved" stroke="#F59E0B" strokeWidth={2} fillOpacity={1} fill="url(#colorApproved)" name="Approved" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle className="mb-4">Approval Trend</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trendsData || []}>
              <defs>
                <linearGradient id="lineApproved" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="lineTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#60A5FA" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Legend />
              <Area type="monotone" dataKey="requests.approved" stroke="#F59E0B" strokeWidth={3} fill="url(#lineApproved)" name="Approved" dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
              <Area type="monotone" dataKey="requests.total" stroke="#60A5FA" strokeWidth={3} fill="url(#lineTotal)" name="Total" dot={{ fill: '#60A5FA', strokeWidth: 2, r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card>
          <CardTitle className="mb-4">Requests by Status</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(requestData?.by_status || {}).map(([status, count]) => ({ status, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="status" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#F59E0B" name="Count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <CardTitle className="mb-4">Users by Role</CardTitle>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={Object.entries(userData?.by_role || {}).map(([role, count]) => ({ role, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
              <XAxis dataKey="role" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 12, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="count" fill="#60A5FA" name="Count" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      <Card className="mt-6">
        <CardTitle className="mb-4">Available Reports</CardTitle>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { title: 'Request Summary Report', desc: 'Overview of all requests by status and department', type: 'requests' },
            { title: 'User Activity Report', desc: 'Login activity and user engagement metrics', type: 'users' },
            { title: 'Document Usage Report', desc: 'Document access and distribution analytics', type: 'documents' },
            { title: 'Inter-Memo Report', desc: 'Inter-department memo statistics', type: 'inter-memos' },
            { title: 'Audit Log Report', desc: 'Security and compliance audit summary', type: 'audit' },
          ].map((report) => (
            <div key={report.title} className="p-4 rounded-xl border border-[var(--border-color)] hover:border-gold-600/30 transition-colors group">
              <FileBarChart className="h-8 w-8 text-gold-600/60 group-hover:text-gold-600 transition-colors mb-3" />
              <p className="font-medium text-[var(--text-primary)]">{report.title}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{report.desc}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => handleGenerateReport(report.type)}>
                <Download className="h-3 w-3" /> Generate
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </PageTransition>
  )
}
