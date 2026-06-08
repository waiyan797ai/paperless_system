import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, ArrowLeftRight } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import { mockInterRequests } from '../../lib/mockData'
import { formatDate, getStatusColor } from '../../lib/utils'

export default function InterRequests() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const pageSize = 10

  const filtered = mockInterRequests.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.id.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageTransition>
      <PageHeader title="Inter-Department Requests" subtitle="Cross-department workflow requests" actions={
        <Button variant="gold" onClick={() => navigate('/inter-requests/new')}><Plus className="h-4 w-4" /> New Inter-Request</Button>
      } />
      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search inter-requests..." className="max-w-sm" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>From</TableHead>
              <TableHead>To</TableHead>
              <TableHead>Requester</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice((page - 1) * pageSize, page * pageSize).map((req) => (
              <TableRow key={req.id} onClick={() => navigate(`/inter-requests/${req.id}`)}>
                <TableCell><span className="font-mono text-gold-600 text-xs">{req.id}</span></TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <ArrowLeftRight className="h-4 w-4 text-gold-600 shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">{req.title}</span>
                  </div>
                </TableCell>
                <TableCell>{req.fromDept}</TableCell>
                <TableCell>{req.toDept}</TableCell>
                <TableCell>{req.requester}</TableCell>
                <TableCell><Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge></TableCell>
                <TableCell>{formatDate(req.createdAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalPages={Math.ceil(filtered.length / pageSize) || 1} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} />
      </Card>
    </PageTransition>
  )
}
