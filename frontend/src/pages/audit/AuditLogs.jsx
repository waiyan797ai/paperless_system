import { useState } from 'react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import { mockAuditLogs } from '../../lib/mockData'
import { formatDate } from '../../lib/utils'

const actionColors = { CREATE: 'success', UPDATE: 'info', DELETE: 'danger', APPROVE: 'gold', LOGIN: 'default' }

export default function AuditLogs() {
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const filtered = mockAuditLogs.filter((log) => {
    const matchSearch = log.user.toLowerCase().includes(search.toLowerCase()) || log.details.toLowerCase().includes(search.toLowerCase())
    const matchAction = !actionFilter || log.action === actionFilter
    return matchSearch && matchAction
  })

  return (
    <PageTransition>
      <PageHeader title="Audit Logs" subtitle="System activity and security audit trail" />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search logs..." className="max-w-sm" />
          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)} options={['CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'LOGIN']} placeholder="All Actions" className="max-w-xs" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
              <TableHead>IP Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice((page - 1) * pageSize, page * pageSize).map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-xs font-mono whitespace-nowrap">{formatDate(log.timestamp, { hour: '2-digit', minute: '2-digit' })}</TableCell>
                <TableCell className="font-medium text-[var(--text-primary)]">{log.user}</TableCell>
                <TableCell><Badge variant={actionColors[log.action] || 'default'}>{log.action}</Badge></TableCell>
                <TableCell>{log.resource}</TableCell>
                <TableCell className="max-w-xs truncate">{log.details}</TableCell>
                <TableCell className="font-mono text-xs">{log.ip}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalPages={Math.ceil(filtered.length / pageSize) || 1} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} />
      </Card>
    </PageTransition>
  )
}
