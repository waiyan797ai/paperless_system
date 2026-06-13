import { ArrowLeft, Download, Filter } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Table from '../../components/ui/Table'
import Badge from '../../components/ui/Badge'
import api from '../../lib/api'
import { formatDate } from '../../lib/utils'

export default function ReportDetail() {
  const { type } = useParams()
  const navigate = useNavigate()

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['reports', type],
    queryFn: async () => {
      const { data } = await api.get(`/reports/${type}`)
      return data.data
    },
  })

  const reportConfig = {
    requests: {
      title: 'Request Summary Report',
      description: 'Overview of all requests by status and department',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'reference_no', label: 'Reference' },
        { key: 'title', label: 'Title' },
        { key: 'status', label: 'Status' },
        { key: 'user', label: 'Requester' },
        { key: 'created_at', label: 'Created' },
      ],
    },
    'inter-memos': {
      title: 'Inter-Department Memo Report',
      description: 'Statistics on inter-department communications',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'reference_no', label: 'Reference' },
        { key: 'subject', label: 'Subject' },
        { key: 'status', label: 'Status' },
        { key: 'requester', label: 'Requester' },
        { key: 'created_at', label: 'Created' },
      ],
    },
    documents: {
      title: 'Document Usage Report',
      description: 'Document access and distribution analytics',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'file_name', label: 'File Name' },
        { key: 'category', label: 'Category' },
        { key: 'uploaded_by', label: 'Uploaded By' },
        { key: 'created_at', label: 'Uploaded' },
      ],
    },
    users: {
      title: 'User Activity Report',
      description: 'Login activity and user engagement metrics',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'role', label: 'Role' },
        { key: 'department', label: 'Department' },
        { key: 'status', label: 'Status' },
      ],
    },
    audit: {
      title: 'Audit Log Report',
      description: 'Security and compliance audit summary',
      columns: [
        { key: 'id', label: 'ID' },
        { key: 'action', label: 'Action' },
        { key: 'user', label: 'User' },
        { key: 'auditable_type', label: 'Entity' },
        { key: 'created_at', label: 'Timestamp' },
      ],
    },
  }

  const config = reportConfig[type] || reportConfig.requests

  const handleExport = async () => {
    try {
      const response = await api.get('/reports/export', {
        params: { type },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${type}_export_${new Date().toISOString().split('T')[0]}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('Failed to export report')
    }
  }

  if (isLoading) {
    return (
      <PageTransition>
        <PageHeader title="Loading..." />
        <Card>
          <p className="text-center text-[var(--text-muted)] py-8">Loading report data...</p>
        </Card>
      </PageTransition>
    )
  }

  const getStatusColor = (status) => {
    const colors = {
      approved: 'success',
      rejected: 'danger',
      pending: 'warning',
      draft: 'default',
      submitted: 'info',
      active: 'success',
      inactive: 'default',
    }
    return colors[status?.toLowerCase()] || 'default'
  }

  return (
    <PageTransition>
      <PageHeader
        title={config.title}
        subtitle={config.description}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/reports')}>
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button variant="gold" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          </div>
        }
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {reportData?.total !== undefined && (
          <Card>
            <CardTitle className="text-sm text-[var(--text-muted)]">Total Records</CardTitle>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{reportData.total}</p>
          </Card>
        )}
        {reportData?.by_status && (
          <Card>
            <CardTitle className="text-sm text-[var(--text-muted)]">By Status</CardTitle>
            <div className="mt-2 space-y-1">
              {Object.entries(reportData.by_status).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize">{status}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {reportData?.by_role && (
          <Card>
            <CardTitle className="text-sm text-[var(--text-muted)]">By Role</CardTitle>
            <div className="mt-2 space-y-1">
              {Object.entries(reportData.by_role).map(([role, count]) => (
                <div key={role} className="flex justify-between text-sm">
                  <span>{role}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
        {reportData?.by_department && (
          <Card>
            <CardTitle className="text-sm text-[var(--text-muted)]">By Department</CardTitle>
            <div className="mt-2 space-y-1">
              {reportData.by_department.slice(0, 5).map((item) => (
                <div key={item.department?.id} className="flex justify-between text-sm">
                  <span>{item.department?.name}</span>
                  <span className="font-medium">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Data Table */}
      <Card>
        <CardTitle>Detailed Records</CardTitle>
        {reportData?.records?.data?.length > 0 ? (
          <Table>
            <thead>
              <tr>
                {config.columns.map((col) => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportData.records.data.map((row) => (
                <tr key={row.id}>
                  {config.columns.map((col) => (
                    <td key={col.key}>
                      {col.key === 'status' ? (
                        <Badge variant={getStatusColor(row[col.key])}>{row[col.key]}</Badge>
                      ) : col.key === 'user' || col.key === 'requester' || col.key === 'uploaded_by' ? (
                        row[col.key]?.name || row[col.key] || '—'
                      ) : col.key === 'department' ? (
                        row[col.key]?.name || '—'
                      ) : col.key === 'role' ? (
                        row[col.key]?.display_name || row[col.key] || '—'
                      ) : col.key.includes('_at') ? (
                        formatDate(row[col.key])
                      ) : (
                        row[col.key] || '—'
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <p className="text-center text-[var(--text-muted)] py-8">No records found</p>
        )}
      </Card>
    </PageTransition>
  )
}
