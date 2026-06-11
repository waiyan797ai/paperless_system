import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, Eye, Plus } from 'lucide-react'
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
import { isPdfDocument } from '../../lib/documents'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentsList } from '../../hooks/useDocuments'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatFileSize, getStatusColor } from '../../lib/utils'

export default function Documents({ direction = 'incoming' }) {
  const isOutgoing = direction === 'outgoing'
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [documentTypes, setDocumentTypes] = useState([])
  const [departments, setDepartments] = useState([])
  const [page, setPage] = useState(1)
  const { user } = useAuth()
  const { addToast } = useToast()
  const pageSize = 10

  useEffect(() => {
    Promise.all([
      api.get('/document-types', { params: { for_select: 1 } }),
      api.get('/departments', { params: { per_page: 100 } }),
    ]).then(([typesRes, deptRes]) => {
      setDocumentTypes(typesRes.data.data || [])
      setDepartments(deptRes.data.data?.data || deptRes.data.data || [])
    }).catch(() => {})
  }, [])

  const hasFilters = Boolean(typeFilter || departmentFilter || statusFilter || dateFrom || dateTo)

  const { data, isLoading, isFetching } = useDocumentsList({
    page,
    search,
    documentTypeId: typeFilter,
    departmentId: departmentFilter,
    status: statusFilter,
    dateFrom,
    dateTo,
    direction,
    pageSize,
  })

  const clearFilters = () => {
    setTypeFilter('')
    setDepartmentFilter('')
    setStatusFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const documents = data?.items || []
  const totalPages = data?.totalPages || 1
  const totalItems = data?.totalItems || 0
  const loading = isLoading && !data

  const handleDownload = async (e, doc) => {
    e?.stopPropagation()
    try {
      const { data: blob } = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([blob]))
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || `${doc.title}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      addToast('Download failed. File may not be available.', 'error')
    }
  }

  const openDocument = (doc) => {
    if (isPdfDocument(doc)) {
      navigate(`/documents/${doc.id}`, { state: { from: direction } })
      return
    }
    handleDownload(null, doc)
  }

  const getDepartmentLabel = (doc) => {
    const recipients = doc.distributions?.flatMap((d) => d.recipients || []) || []

    if (isOutgoing) {
      const names = [...new Set(recipients.map((r) => r.department?.name).filter(Boolean))]
      return names.length ? names.join(', ') : '—'
    }

    const receivedByMyDept = recipients.some((r) => r.department_id === user?.department_id)
    if (receivedByMyDept) {
      return doc.uploader?.department?.name || '—'
    }
    const names = [...new Set(recipients.map((r) => r.department?.name).filter(Boolean))]
    return names.length ? names.join(', ') : doc.uploader?.department?.name || '—'
  }

  return (
    <PageTransition>
      <PageHeader
        title={isOutgoing ? 'Outgoing mail' : 'Incoming mail'}
        subtitle={
          isFetching && data
            ? 'Refreshing...'
            : isOutgoing
              ? 'Documents you have sent to other departments'
              : 'Click a PDF to preview in-app'
        }
        actions={
          isOutgoing ? (
            <Button variant="gold" onClick={() => navigate('/documents/outgoing/new')}>
              <Plus className="h-4 w-4" /> Send mail
            </Button>
          ) : null
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder={isOutgoing ? 'Search outgoing mail...' : 'Search incoming mail...'}
            className="min-w-[160px] w-[220px] shrink-0"
          />
          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            options={documentTypes.map((t) => ({ value: String(t.id), label: t.title }))}
            placeholder="All Types"
            className="w-[128px] shrink-0"
          />
          <Select
            value={departmentFilter}
            onChange={(e) => { setDepartmentFilter(e.target.value); setPage(1) }}
            options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
            placeholder="All Departments"
            className="w-[160px] shrink-0"
          />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'archived', label: 'Archived' },
            ]}
            placeholder="All Status"
            className="w-[128px] shrink-0"
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
            <LoadingSpinner label={isOutgoing ? 'Loading outgoing mail...' : 'Loading incoming mail...'} />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={hasFilters || search ? 'No matching documents' : isOutgoing ? 'No outgoing mail yet' : 'No incoming mail yet'}
            description={
              hasFilters || search
                ? 'Try adjusting your search or filters.'
                : isOutgoing
                  ? 'Documents you send to departments will appear here.'
                  : 'Documents sent to your department appear here.'
            }
            action={isOutgoing ? () => navigate('/documents/outgoing/new') : undefined}
            actionLabel={isOutgoing ? 'Send mail' : undefined}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="max-w-[240px] sm:max-w-[320px]">Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>{isOutgoing ? 'To' : 'Department'}</TableHead>
                  {!isOutgoing && <TableHead>Author</TableHead>}
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="w-32">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((doc) => (
                  <TableRow
                    key={doc.id}
                    className={isPdfDocument(doc) ? 'cursor-pointer hover:bg-gold-500/5' : ''}
                    onClick={() => isPdfDocument(doc) && openDocument(doc)}
                  >
                    <TableCell className="max-w-[240px] sm:max-w-[320px]">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                        <span
                          className="font-medium text-[var(--text-primary)] truncate min-w-0 flex-1"
                          title={doc.title}
                        >
                          {doc.title}
                        </span>
                        {isPdfDocument(doc) && (
                          <Badge variant="gold" className="text-[10px] shrink-0">PDF</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{doc.document_type?.title || doc.category || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{getDepartmentLabel(doc)}</TableCell>
                    {!isOutgoing && <TableCell>{doc.uploader?.name || '—'}</TableCell>}
                    <TableCell className="text-xs font-mono">{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell><Badge variant={getStatusColor(doc.status)} dot>{doc.status}</Badge></TableCell>
                    <TableCell>{formatDate(doc.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          title={isPdfDocument(doc) ? 'View PDF' : 'Download'}
                          onClick={() => openDocument(doc)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Download" onClick={(e) => handleDownload(e, doc)}>
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
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
