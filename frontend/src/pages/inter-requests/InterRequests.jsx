import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight, Pencil, Trash2 } from 'lucide-react'
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
import { formatDate, getStatusColor } from '../../lib/utils'
import { isAdminLevel } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
]

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

const scopeOptions = [
  { value: 'sent', label: 'Sent by Me' },
  { value: 'assigned', label: 'Assigned to Me' },
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
]

export default function InterRequests() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [scopeFilter, setScopeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [requests, setRequests] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const pageSize = 10
  const isAdmin = isAdminLevel(user)

  const hasFilters = Boolean(statusFilter || priorityFilter || scopeFilter || dateFrom || dateTo)

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/inter-memos', {
          params: {
            page,
            per_page: pageSize,
            search: search || undefined,
            status: statusFilter || undefined,
            priority: priorityFilter || undefined,
            scope: scopeFilter || undefined,
            date_from: dateFrom || undefined,
            date_to: dateTo || undefined,
          },
        })
        setRequests(data.data?.data || [])
        setTotalPages(data.data?.last_page || 1)
        setTotalItems(data.data?.total || 0)
      } catch {
        setRequests([])
      } finally {
        setLoading(false)
      }
    }
    const timer = setTimeout(fetchRequests, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search, statusFilter, priorityFilter, scopeFilter, dateFrom, dateTo])

  const clearFilters = () => {
    setStatusFilter('')
    setPriorityFilter('')
    setScopeFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleDelete = async (e, req) => {
    e.stopPropagation()
    if (!window.confirm(`Delete inter-memo "${req.subject}"?`)) return
    setDeletingId(req.id)
    try {
      await api.delete(`/inter-memos/${req.id}`)
      addToast('Inter-memo deleted', 'success')
      setRequests((prev) => prev.filter((r) => r.id !== req.id))
      setTotalItems((prev) => Math.max(0, prev - 1))
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete inter-memo', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Inter-Department Memos"
        subtitle="Cross-department workflow with forward and approval chain"
        actions={
          <Button variant="gold" onClick={() => navigate('/inter-memos/new')}>
            <Plus className="h-4 w-4" /> New Inter-Memo
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search inter-memos..."
            className="min-w-[160px] w-[220px] shrink-0"
          />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            options={statusOptions}
            placeholder="All Status"
            className="w-[128px] shrink-0"
          />
          <Select
            value={priorityFilter}
            onChange={(e) => { setPriorityFilter(e.target.value); setPage(1) }}
            options={priorityOptions}
            placeholder="All Priority"
            className="w-[128px] shrink-0"
          />
          <Select
            value={scopeFilter}
            onChange={(e) => { setScopeFilter(e.target.value); setPage(1) }}
            options={scopeOptions}
            placeholder="All Memos"
            className="w-[140px] shrink-0"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
            title="From Date"
            aria-label="From Date"
            className="w-[132px] shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
            title="To Date"
            aria-label="To Date"
            className="w-[132px] shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
          />
          {hasFilters && (
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters} className="shrink-0">
              Clear
            </Button>
          )}
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading inter-memos..." />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title={hasFilters || search ? 'No matching inter-memos' : 'No inter-memos yet'}
            description={
              hasFilters || search
                ? 'Try adjusting your search or filters.'
                : 'Create a memo and assign it to a user to start the approval chain.'
            }
            action={!hasFilters && !search ? () => navigate('/inter-memos/new') : undefined}
            actionLabel={!hasFilters && !search ? 'New Inter-Memo' : undefined}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Current Holder</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  {isAdmin && <TableHead className="w-24">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => navigate(`/inter-memos/${req.id}`)}>
                    <TableCell><span className="font-mono text-gold-600 text-xs">{req.reference_no}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-gold-600 shrink-0" />
                        <span className="font-medium text-[var(--text-primary)]">{req.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>{req.requester?.name || '—'}</TableCell>
                    <TableCell>{req.assignee?.name || '—'}</TableCell>
                    <TableCell><span className="capitalize text-sm">{req.priority || '—'}</span></TableCell>
                    <TableCell><Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge></TableCell>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
                    {isAdmin && (
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); navigate(`/inter-memos/${req.id}/edit`) }}
                            className="p-2 rounded-lg hover:bg-gold-500/10 text-[var(--text-muted)] hover:text-gold-600"
                            title="Edit memo"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, req)}
                            disabled={deletingId === req.id}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 disabled:opacity-50"
                            title="Delete memo"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
          </>
        )}
      </Card>
    </PageTransition>
  )
}
