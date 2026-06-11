import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Download, Pencil, Eye, Trash2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { hasPermission } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, getStatusColor } from '../../lib/utils'
import { useToast } from '../../components/ui/Toast'

export default function Policies() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [policies, setPolicies] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const canManage = hasPermission(user, 'policies.manage')
  const pageSize = 10

  useEffect(() => {
    const fetchPolicies = async () => {
      setLoading(true)
      try {
        const params = { page, per_page: pageSize, search: search || undefined }
        if (canManage && statusFilter) params.status = statusFilter

        const { data } = await api.get('/policies', { params })
        setPolicies(data.data?.data || [])
        setTotalPages(data.data?.last_page || 1)
        setTotalItems(data.data?.total || 0)
      } catch {
        setPolicies([])
      } finally {
        setLoading(false)
      }
    }

    const timer = setTimeout(fetchPolicies, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search, statusFilter, canManage])

  const handleDelete = async (e, policy) => {
    e.stopPropagation()
    if (!window.confirm(`Delete policy "${policy.title}"? This cannot be undone.`)) return

    setDeletingId(policy.id)
    try {
      await api.delete(`/policies/${policy.id}`)
      addToast('Policy deleted', 'success')
      setPolicies((prev) => prev.filter((p) => p.id !== policy.id))
      setTotalItems((prev) => Math.max(0, prev - 1))
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete policy', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (e, policy) => {
    e.stopPropagation()
    try {
      const { data } = await api.get(`/policies/${policy.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = policy.file_name || `${policy.title}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Download failed. File may not be available.')
    }
  }

  const handleRowClick = (policy) => {
    navigate(`/policies/${policy.id}`)
  }

  return (
    <PageTransition>
      <PageHeader
        title="Policies"
        subtitle={canManage ? 'Manage organizational policies and guidelines' : 'View and download company policies'}
        actions={
          canManage ? (
            <Button variant="gold" onClick={() => navigate('/policies/new')}>
              <Plus className="h-4 w-4" /> New Policy
            </Button>
          ) : null
        }
      />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search policies..."
            className="max-w-sm"
          />
          {canManage && (
            <Select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              options={['active', 'inactive', 'archived']}
              placeholder="All Statuses"
              className="max-w-xs"
            />
          )}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading policies..." />
          </div>
        ) : policies.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No policies found"
            description={canManage ? 'Create a new policy to get started.' : 'No published policies available yet.'}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Policy</TableHead>
                  <TableHead>Policy Type</TableHead>
                  <TableHead>Version</TableHead>
                  {canManage && <TableHead>Status</TableHead>}
                  <TableHead>Updated</TableHead>
                  <TableHead className={canManage ? 'w-36' : 'w-24'}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((policy) => (
                  <TableRow
                    key={policy.id}
                    onClick={() => handleRowClick(policy)}
                    className="cursor-pointer"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                        <div>
                          <span className="font-medium text-[var(--text-primary)]">{policy.title}</span>
                          {policy.creator && (
                            <p className="text-xs text-[var(--text-muted)] mt-0.5">By {policy.creator.name}</p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{policy.policy_type?.title || '—'}</TableCell>
                    <TableCell><span className="font-mono text-sm">v{policy.version}</span></TableCell>
                    {canManage && (
                      <TableCell>
                        <Badge variant={getStatusColor(policy.status)} dot>{policy.status}</Badge>
                      </TableCell>
                    )}
                    <TableCell>{formatDate(policy.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/policies/${policy.id}`) }}
                          className="p-2 rounded-lg text-gold-600 hover:bg-gold-600/10 transition-colors"
                          title="View policy"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {policy.file_path && (
                          <button
                            onClick={(e) => handleDownload(e, policy)}
                            className="p-2 rounded-lg text-gold-600 hover:bg-gold-600/10 transition-colors"
                            title="Download PDF"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        {canManage && (
                          <>
                            <button
                              onClick={(e) => { e.stopPropagation(); navigate(`/policies/${policy.id}/edit`) }}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-gold-600 hover:bg-gold-600/10 transition-colors"
                              title="Edit"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => handleDelete(e, policy)}
                              disabled={deletingId === policy.id}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </>
        )}
      </Card>
    </PageTransition>
  )
}
