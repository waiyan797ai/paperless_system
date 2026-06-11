import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import PdfViewer from '../../components/ui/PdfViewer'
import api from '../../lib/api'
import { isPdfDocument } from '../../lib/documents'
import { formatDate, formatFileSize, getStatusColor } from '../../lib/utils'
import { useToast } from '../../components/ui/Toast'

export default function DocumentDetail() {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const backPath = location.state?.from === 'outgoing' ? '/documents/outgoing' : '/documents/incoming'
  const backLabel = location.state?.from === 'outgoing' ? 'Back to Outgoing mail' : 'Back to Incoming mail'
  const { addToast } = useToast()
  const [document, setDocument] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/documents/${id}`)
      .then(({ data }) => {
        setDocument(data.data)
        api.post(`/documents/${id}/view`).catch(() => {})
      })
      .catch(() => {
        addToast('Document not found or not available', 'error')
        navigate(backPath)
      })
      .finally(() => setLoading(false))
  }, [id, navigate, addToast, backPath])

  const handleDownload = async () => {
    try {
      const { data } = await api.get(`/documents/${id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.file_name || `${document.title}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      addToast('Download failed. File may not be available.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner label="Loading document..." />
      </div>
    )
  }

  if (!document) return null

  const showPdf = isPdfDocument(document)

  return (
    <PageTransition>
      <button
        onClick={() => navigate(backPath)}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {backLabel}
      </button>

      <PageHeader
        title={document.title}
        subtitle={document.uploader ? `By ${document.uploader.name}` : undefined}
        actions={
          <Button variant="gold" onClick={handleDownload}>
            <Download className="h-4 w-4" /> Download
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardTitle className="mb-4">Details</CardTitle>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Type</p>
              <p className="font-medium mt-1">{document.category || '—'}</p>
            </div>
            {document.description && (
              <div>
                <p className="text-[var(--text-muted)]">Description</p>
                <p className="mt-1">{document.description}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--text-muted)]">Department</p>
              <p className="font-medium mt-1">{document.uploader?.department?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">File</p>
              <p className="font-medium mt-1 break-all">{document.file_name || '—'}</p>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{formatFileSize(document.file_size)}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Status</p>
              <Badge variant={getStatusColor(document.status)} dot className="mt-1">
                {document.status}
              </Badge>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Last Updated</p>
              <p className="font-medium mt-1">{formatDate(document.updated_at)}</p>
            </div>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">{showPdf ? 'PDF Preview' : 'File Preview'}</CardTitle>
          {showPdf ? (
            <PdfViewer
              src={`/documents/${id}/download`}
              fileName={document.file_name || `${document.title}.pdf`}
              height="h-[75vh]"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-[var(--border-color)] bg-[var(--bg-surface)] h-[40vh] p-8 text-center">
              <FileText className="h-12 w-12 text-gold-600/50" />
              <p className="text-sm text-[var(--text-muted)]">
                Inline preview is available for PDF files only. Download this file to open it.
              </p>
              <Button variant="gold" onClick={handleDownload}>
                <Download className="h-4 w-4" /> Download File
              </Button>
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
