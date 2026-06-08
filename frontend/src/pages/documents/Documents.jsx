import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Download, Eye } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import { mockDocuments } from '../../lib/mockData'
import { formatDate, getStatusColor } from '../../lib/utils'

export default function Documents() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const pageSize = 10

  const filtered = mockDocuments.filter((d) => {
    const matchSearch = d.title.toLowerCase().includes(search.toLowerCase())
    const matchType = !typeFilter || d.type === typeFilter
    return matchSearch && matchType
  })

  return (
    <PageTransition>
      <PageHeader title="Documents" subtitle="Paperless document management" actions={
        <Button variant="gold" onClick={() => navigate('/documents/new')}><Plus className="h-4 w-4" /> Upload Document</Button>
      } />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Search documents..." className="max-w-sm" />
          <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} options={['Report', 'Manual', 'Policy', 'Form', 'Memo']} placeholder="All Types" className="max-w-xs" />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Author</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.slice((page - 1) * pageSize, page * pageSize).map((doc) => (
              <TableRow key={doc.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                    <span className="font-medium text-[var(--text-primary)]">{doc.title}</span>
                  </div>
                </TableCell>
                <TableCell>{doc.type}</TableCell>
                <TableCell>{doc.department}</TableCell>
                <TableCell>{doc.author}</TableCell>
                <TableCell className="text-xs font-mono">{doc.size}</TableCell>
                <TableCell><Badge variant={getStatusColor(doc.status)} dot>{doc.status}</Badge></TableCell>
                <TableCell>{formatDate(doc.updatedAt)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon"><Download className="h-4 w-4" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination page={page} totalPages={Math.ceil(filtered.length / pageSize) || 1} onPageChange={setPage} totalItems={filtered.length} pageSize={pageSize} />
      </Card>
    </PageTransition>
  )
}
