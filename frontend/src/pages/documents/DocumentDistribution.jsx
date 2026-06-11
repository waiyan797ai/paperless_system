import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Send, Building2, Eye, Download, X } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import FileUpload from '../../components/ui/FileUpload'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import PdfViewer from '../../components/ui/PdfViewer'
import { isPdfDocument } from '../../lib/documents'
import api from '../../lib/api'
import { useDocumentDistributions, useInvalidateDocuments } from '../../hooks/useDocuments'
import { useToast } from '../../components/ui/Toast'
import { formatDate } from '../../lib/utils'

export default function DocumentDistribution() {
  const navigate = useNavigate()
  const [departments, setDepartments] = useState([])
  const [selectedDistribution, setSelectedDistribution] = useState(null)
  const [selectedDepartments, setSelectedDepartments] = useState([])
  const [loading, setLoading] = useState(false)
  const invalidateDocuments = useInvalidateDocuments()
  const { data: recentDistributions = [], isLoading: loadingHistory, isFetching: refreshingHistory } = useDocumentDistributions()
  const [file, setFile] = useState(null)
  const [uploadKey, setUploadKey] = useState(0)
  const [documentTypes, setDocumentTypes] = useState([])
  const [form, setForm] = useState({ title: '', document_type_id: '', description: '', notes: '' })
  const [uploadLimitOk, setUploadLimitOk] = useState(true)
  const [serverUploadLimit, setServerUploadLimit] = useState('')
  const { addToast } = useToast()

  useEffect(() => {
    api.get('/system/upload-limits')
      .then(({ data }) => {
        const limits = data.data || {}
        setUploadLimitOk(limits.ok !== false)
        setServerUploadLimit(limits.upload_max_filesize || '')
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([
      api.get('/departments', { params: { per_page: 100 } }),
      api.get('/document-types', { params: { for_select: 1 } }),
    ])
      .then(([deptRes, typesRes]) => {
        setDepartments(deptRes.data.data?.data || deptRes.data.data || [])
        setDocumentTypes(typesRes.data.data || [])
      })
      .catch(() => addToast('Failed to load form data', 'error'))
  }, [addToast])

  const allDepartmentIds = departments.map((d) => d.id)
  const allSelected = departments.length > 0 && allDepartmentIds.every((id) => selectedDepartments.includes(id))
  const someSelected = selectedDepartments.length > 0 && !allSelected

  const toggleAllDepartments = () => {
    setSelectedDepartments(allSelected ? [] : allDepartmentIds)
  }

  const toggleDepartment = (id) => {
    setSelectedDepartments((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    )
  }

  const resetForm = () => {
    setForm({ title: '', document_type_id: '', description: '', notes: '' })
    setFile(null)
    setSelectedDepartments([])
    setUploadKey((k) => k + 1)
  }

  const handleDownload = async (doc) => {
    if (!doc?.id) return
    try {
      const { data } = await api.get(`/documents/${doc.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = doc.file_name || `${doc.title}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      addToast('Download failed. File may not be available.', 'error')
    }
  }

  const handleDistribute = async () => {
    if (!form.title.trim()) {
      addToast('Please enter a document title', 'warning')
      return
    }
    if (!form.document_type_id) {
      addToast('Please select a document type', 'warning')
      return
    }
    if (!file) {
      addToast('Please upload a file', 'warning')
      return
    }
    if (selectedDepartments.length === 0) {
      addToast('Please select at least one department', 'warning')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('document_type_id', form.document_type_id)
      if (form.description) formData.append('description', form.description)
      if (form.notes) formData.append('notes', form.notes)
      formData.append('file', file)
      selectedDepartments.forEach((id) => formData.append('department_ids[]', id))

      const { data } = await api.post('/documents/distribute', formData)

      addToast(data.message || 'Document sent successfully', 'success')
      resetForm()
      invalidateDocuments()
      navigate('/documents/outgoing')
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors && Object.values(errors).flat()[0]
      addToast(firstError || err.response?.data?.message || 'Failed to distribute document', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <button
        onClick={() => navigate('/documents/outgoing')}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4"
      >
        ← Back to Outgoing mail
      </button>
      <PageHeader
        title="Send mail"
        subtitle="Upload and send documents to departments"
        actions={
          <Button variant="secondary" onClick={() => navigate('/document-types')}>
            Document Types
          </Button>
        }
      />
      {!uploadLimitOk && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          Server upload limit is only <strong>{serverUploadLimit || '2M'}</strong>. PDFs over that size will fail.
          Stop the backend terminal and run: <code className="font-mono text-xs bg-black/10 px-1 rounded">cd backend && ./serve.sh</code>
        </div>
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-6">New Distribution</CardTitle>
          <div className="space-y-5">
            <Input
              label="Document Title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              required
            />
            <Select
              label="Document Type"
              value={form.document_type_id}
              onChange={(e) => setForm({ ...form, document_type_id: e.target.value })}
              options={documentTypes.map((t) => ({ value: String(t.id), label: t.title }))}
              placeholder={documentTypes.length ? 'Select type' : 'No document types — create one first'}
              required
            />
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={2}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
              />
            </div>
            <FileUpload
              key={uploadKey}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              maxSize={30}
              onFilesSelected={(files) => setFile(files[0] || null)}
            />
            <div className="space-y-2">
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Target Departments</label>
              <div className="rounded-xl border border-[var(--border-color)] overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-color)] cursor-pointer hover:bg-gold-500/5">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someSelected
                    }}
                    onChange={toggleAllDepartments}
                    className="rounded text-gold-600 focus:ring-gold-500/30"
                  />
                  <Building2 className="h-4 w-4 text-gold-600" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">All Departments</span>
                  {selectedDepartments.length > 0 && (
                    <span className="ml-auto text-xs text-[var(--text-muted)]">
                      {selectedDepartments.length}/{departments.length}
                    </span>
                  )}
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1 p-2">
                  {departments.map((dept) => (
                    <label
                      key={dept.id}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedDepartments.includes(dept.id)}
                        onChange={() => toggleDepartment(dept.id)}
                        className="rounded text-gold-600 focus:ring-gold-500/30"
                      />
                      <Building2 className="h-4 w-4 text-[var(--text-muted)]" />
                      <span className="text-sm">{dept.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <Input
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <Button variant="gold" onClick={handleDistribute} loading={loading} className="w-full">
              <Send className="h-4 w-4" /> Send mail
            </Button>
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">
            Recent Distributions
            {refreshingHistory && !loadingHistory && (
              <span className="ml-2 text-xs font-normal text-[var(--text-muted)]">Updating...</span>
            )}
          </CardTitle>
          {loadingHistory ? (
            <div className="py-8 flex justify-center">
              <LoadingSpinner label="Loading history..." />
            </div>
          ) : recentDistributions.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">No distributions yet.</p>
          ) : (
            <div className="space-y-3">
              {recentDistributions.map((d) => {
                const deptNames = d.recipients?.map((r) => r.department?.name).filter(Boolean).join(', ') || '—'
                return (
                  <div
                    key={d.id}
                    className="p-4 rounded-xl border border-[var(--border-color)] hover:border-gold-600/20 transition-colors cursor-pointer"
                    onClick={() => setSelectedDistribution(d)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-[var(--text-primary)]">{d.document?.title || 'Document'}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                          <Building2 className="h-3 w-3 shrink-0" />
                          <span className="truncate">{deptNames}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setSelectedDistribution(d) }}
                          className="p-2 rounded-lg text-gold-600 hover:bg-gold-600/10 transition-colors"
                          title="View distribution"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <Badge variant="success" dot>sent</Badge>
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-2">
                      {d.recipients?.length || 0} department(s) · {formatDate(d.distributed_at)}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      <Modal
        open={!!selectedDistribution}
        onClose={() => setSelectedDistribution(null)}
        title={selectedDistribution?.document?.title || 'Distribution Details'}
        size="xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSelectedDistribution(null)}>
              <X className="h-4 w-4" /> Close
            </Button>
            {selectedDistribution?.document?.file_path && (
              <Button variant="secondary" onClick={() => handleDownload(selectedDistribution.document)}>
                <Download className="h-4 w-4" /> Download
              </Button>
            )}
            {selectedDistribution?.document?.id && isPdfDocument(selectedDistribution.document) && (
              <Button
                variant="gold"
                onClick={() => {
                  navigate(`/documents/${selectedDistribution.document.id}`, { state: { from: 'outgoing' } })
                  setSelectedDistribution(null)
                }}
              >
                <Eye className="h-4 w-4" /> Open Full View
              </Button>
            )}
          </>
        }
      >
        {selectedDistribution && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Document Type</p>
                <p className="font-medium mt-1">
                  {selectedDistribution.document?.document_type?.title || selectedDistribution.document?.category || '—'}
                </p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Distributed</p>
                <p className="font-medium mt-1">{formatDate(selectedDistribution.distributed_at)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Sent By</p>
                <p className="font-medium mt-1">{selectedDistribution.distributor?.name || '—'}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Departments</p>
                <p className="font-medium mt-1">{selectedDistribution.recipients?.length || 0}</p>
              </div>
            </div>

            {selectedDistribution.document?.description && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Description</p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {selectedDistribution.document.description}
                </p>
              </div>
            )}

            {selectedDistribution.notes && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-1">Notes</p>
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{selectedDistribution.notes}</p>
              </div>
            )}

            <div>
              <p className="text-sm text-[var(--text-muted)] mb-2">Target Departments</p>
              <div className="flex flex-wrap gap-2">
                {selectedDistribution.recipients?.map((r) => (
                  <Badge key={r.id} variant="default">{r.department?.name || 'Department'}</Badge>
                ))}
              </div>
            </div>

            {selectedDistribution.document?.file_path && isPdfDocument(selectedDistribution.document) && (
              <div>
                <p className="text-sm text-[var(--text-muted)] mb-2">Preview</p>
                <PdfViewer
                  src={`/documents/${selectedDistribution.document.id}/download`}
                  fileName={selectedDistribution.document.file_name || selectedDistribution.document.title}
                  height="h-[50vh]"
                />
              </div>
            )}
          </div>
        )}
      </Modal>
    </PageTransition>
  )
}
