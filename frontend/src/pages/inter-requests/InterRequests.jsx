import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { formatDate, getStatusColor } from '../../lib/utils'

export default function InterRequests() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [requests, setRequests] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const pageSize = 10

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/inter-requests', {
          params: { page, per_page: pageSize, search: search || undefined },
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
  }, [page, search])

  return (
    <PageTransition>
      <PageHeader
        title="Inter-Department Requests"
        subtitle="Cross-department workflow with forward and approval chain"
        actions={
          <Button variant="gold" onClick={() => navigate('/inter-requests/new')}>
            <Plus className="h-4 w-4" /> New Inter-Request
          </Button>
        }
      />
      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search inter-requests..." className="max-w-sm" />
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading inter-requests..." />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No inter-requests yet"
            description="Create a request and assign it to a user to start the approval chain."
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
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} className="cursor-pointer" onClick={() => navigate(`/inter-requests/${req.id}`)}>
                    <TableCell><span className="font-mono text-gold-600 text-xs">{req.reference_no}</span></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <ArrowLeftRight className="h-4 w-4 text-gold-600 shrink-0" />
                        <span className="font-medium text-[var(--text-primary)]">{req.subject}</span>
                      </div>
                    </TableCell>
                    <TableCell>{req.requester?.name || '—'}</TableCell>
                    <TableCell>{req.assignee?.name || '—'}</TableCell>
                    <TableCell><Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge></TableCell>
                    <TableCell>{formatDate(req.created_at)}</TableCell>
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
