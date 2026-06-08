import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, Download, Eye, Share2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Avatar from '../../components/ui/Avatar'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { hasRole } from '../../lib/auth'
import { isPdfDocument } from '../../lib/documents'
import { useAuth } from '../../hooks/useAuth'
import { useDocumentsList, useInvalidateDocuments } from '../../hooks/useDocuments'
import { useToast } from '../../components/ui/Toast'
import { formatDate, formatFileSize, getStatusColor } from '../../lib/utils'

export default function Documents() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [forwardDoc, setForwardDoc] = useState(null)
  const [forwardUsers, setForwardUsers] = useState([])
  const [selectedUserIds, setSelectedUserIds] = useState([])
  const [forwardLoading, setForwardLoading] = useState(false)
  const [forwardSubmitting, setForwardSubmitting] = useState(false)
  const { user } = useAuth()
  const { addToast } = useToast()
  const invalidateDocuments = useInvalidateDocuments()
  const isDeptAdmin = hasRole(user, 'department', 'admin')
  const pageSize = 10

  const { data, isLoading, isFetching } = useDocumentsList({
    page,
    search,
    category: typeFilter,
    pageSize,
  })

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
      navigate(`/documents/${doc.id}`)
      return
    }
    handleDownload(null, doc)
  }

  const getDepartmentLabel = (doc) => {
    const recipients = doc.distributions?.flatMap((d) => d.recipients || []) || []
    const receivedByMyDept = recipients.some((r) => r.department_id === user?.department_id)
    if (receivedByMyDept) {
      return doc.uploader?.department?.name || '—'
    }
    const names = [...new Set(recipients.map((r) => r.department?.name).filter(Boolean))]
    return names.length ? names.join(', ') : doc.uploader?.department?.name || '—'
  }

  const canForwardDocument = (doc) => {
    if (!isDeptAdmin || !user?.department_id) return false
    const recipients = doc.distributions?.flatMap((d) => d.recipients || []) || []
    const received = recipients.some((r) => r.department_id === user.department_id)
    const sentByMyDept = doc.uploader?.department_id === user.department_id
    return received && !sentByMyDept
  }

  const getForwardCount = (doc) => {
    const forwards = doc.user_forwards || doc.userForwards || []
    return forwards.filter((f) => f.department_id === user?.department_id).length
  }

  const openForwardModal = async (e, doc) => {
    e.stopPropagation()
    setForwardDoc(doc)
    setSelectedUserIds([])
    setForwardUsers([])
    setForwardOpen(true)
    setForwardLoading(true)
    try {
      const { data } = await api.get(`/documents/${doc.id}/forwardable-users`)
      setForwardUsers(data.data || [])
    } catch {
      addToast('Failed to load staff list', 'error')
      setForwardOpen(false)
    } finally {
      setForwardLoading(false)
    }
  }

  const toggleForwardUser = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    )
  }

  const handleForward = async () => {
    if (!forwardDoc || selectedUserIds.length === 0) {
      addToast('Select at least one staff member', 'warning')
      return
    }
    setForwardSubmitting(true)
    try {
      const { data } = await api.post(`/documents/${forwardDoc.id}/forward`, {
        user_ids: selectedUserIds,
      })
      addToast(data.message || 'Document forwarded', 'success')
      setForwardOpen(false)
      invalidateDocuments()
    } catch (err) {
      addToast(err.response?.data?.message || 'Forward failed', 'error')
    } finally {
      setForwardSubmitting(false)
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Documents"
        subtitle={isFetching && data ? 'Refreshing documents...' : 'Click a PDF to preview in-app'}
      />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search documents..." className="max-w-sm" />
          <Select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
            options={['Report', 'Manual', 'Policy', 'Form', 'Memo']}
            placeholder="All Types"
            className="max-w-xs"
          />
        </div>
        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading documents..." />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description={
              isDeptAdmin
                ? 'Documents sent to your department appear here. Forward them to staff who need access.'
                : 'Documents forwarded to you by your department admin appear here.'
            }
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  {isDeptAdmin && <TableHead>Forwarded</TableHead>}
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
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                        <span className="font-medium text-[var(--text-primary)]">{doc.title}</span>
                        {isPdfDocument(doc) && (
                          <Badge variant="gold" className="text-[10px]">PDF</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{doc.category || '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{getDepartmentLabel(doc)}</TableCell>
                    <TableCell>{doc.uploader?.name || '—'}</TableCell>
                    <TableCell className="text-xs font-mono">{formatFileSize(doc.file_size)}</TableCell>
                    <TableCell><Badge variant={getStatusColor(doc.status)} dot>{doc.status}</Badge></TableCell>
                    {isDeptAdmin && (
                      <TableCell>
                        {canForwardDocument(doc) ? (
                          <Badge variant={getForwardCount(doc) > 0 ? 'success' : 'warning'}>
                            {getForwardCount(doc)} staff
                          </Badge>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    )}
                    <TableCell>{formatDate(doc.updated_at)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {canForwardDocument(doc) && (
                          <Button variant="ghost" size="icon" title="Forward to staff" onClick={(e) => openForwardModal(e, doc)}>
                            <Share2 className="h-4 w-4" />
                          </Button>
                        )}
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

      <Modal
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        title="Forward to Staff"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForwardOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleForward} loading={forwardSubmitting} disabled={forwardLoading}>
              Forward
            </Button>
          </>
        }
      >
        {forwardLoading ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner label="Loading staff..." />
          </div>
        ) : forwardUsers.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No more staff available to forward. Everyone who should have access already does.
          </p>
        ) : (
          <>
            <p className="text-sm text-[var(--text-muted)] mb-4">
              Select staff in your department who should receive <strong>{forwardDoc?.title}</strong>.
              Staff not selected will not see this document.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-xl border border-[var(--border-color)] p-2">
              {forwardUsers.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedUserIds.includes(u.id)}
                    onChange={() => toggleForwardUser(u.id)}
                    className="rounded text-gold-600 focus:ring-gold-500/30"
                  />
                  <Avatar name={u.name} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{u.name}</p>
                    {u.section?.name && (
                      <p className="text-xs text-[var(--text-muted)]">{u.section.name}</p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </>
        )}
      </Modal>
    </PageTransition>
  )
}
