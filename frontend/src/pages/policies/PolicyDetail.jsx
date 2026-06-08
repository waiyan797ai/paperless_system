import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, Pencil } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import PdfViewer from '../../components/ui/PdfViewer'
import api from '../../lib/api'
import { hasRole } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { formatDate, getStatusColor } from '../../lib/utils'
import { useToast } from '../../components/ui/Toast'

export default function PolicyDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isAdmin = hasRole(user, 'admin')
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get(`/policies/${id}`)
      .then(({ data }) => setPolicy(data.data))
      .catch(() => {
        addToast('Policy not found or not available', 'error')
        navigate('/policies')
      })
      .finally(() => setLoading(false))
  }, [id, navigate, addToast])

  const handleDownload = async () => {
    try {
      const { data } = await api.get(`/policies/${id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = policy.file_name || `${policy.title}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      addToast('Download failed. File may not be available.', 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner label="Loading policy..." />
      </div>
    )
  }

  if (!policy) return null

  return (
    <PageTransition>
      <button
        onClick={() => navigate('/policies')}
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Policies
      </button>

      <PageHeader
        title={policy.title}
        subtitle={policy.creator ? `By ${policy.creator.name}` : undefined}
        actions={
          <div className="flex gap-2">
            {policy.file_path && (
              <Button variant="gold" onClick={handleDownload}>
                <Download className="h-4 w-4" /> Download PDF
              </Button>
            )}
            {isAdmin && (
              <Button variant="secondary" onClick={() => navigate(`/policies/${id}/edit`)}>
                <Pencil className="h-4 w-4" /> Edit
              </Button>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Policy Details</CardTitle>
          {policy.description ? (
            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {policy.description}
            </p>
          ) : (
            <p className="text-[var(--text-muted)] italic">No description provided.</p>
          )}

          {!policy.file_path && (
            <div className="mt-6 flex items-center gap-3 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <FileText className="h-5 w-5 text-[var(--text-muted)] shrink-0" />
              <p className="text-sm text-[var(--text-muted)]">No PDF attachment uploaded for this policy.</p>
            </div>
          )}
        </Card>

        <Card>
          <CardTitle className="mb-4">Information</CardTitle>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Created By</p>
              <p className="font-medium mt-1">{policy.creator?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Created Department</p>
              <p className="font-medium mt-1">{policy.created_department?.name || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Approved By</p>
              <p className="font-medium mt-1">{policy.approved_by || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Policy Type</p>
              <p className="font-medium mt-1">{policy.policy_type?.title || '—'}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Version</p>
              <p className="font-medium mt-1 font-mono">v{policy.version}</p>
            </div>
            {isAdmin && (
              <div>
                <p className="text-[var(--text-muted)]">Status</p>
                <Badge variant={getStatusColor(policy.status)} dot className="mt-1">
                  {policy.status}
                </Badge>
              </div>
            )}
            {policy.effective_date && (
              <div>
                <p className="text-[var(--text-muted)]">Effective Date</p>
                <p className="font-medium mt-1">{formatDate(policy.effective_date)}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--text-muted)]">Last Updated</p>
              <p className="font-medium mt-1">{formatDate(policy.updated_at)}</p>
            </div>
          </div>
        </Card>
      </div>

      {policy.file_path && (
        <Card className="mt-6">
          <CardTitle className="mb-4">PDF Preview</CardTitle>
          <PdfViewer
            src={`/policies/${id}/download`}
            fileName={policy.file_name || `${policy.title}.pdf`}
            height="h-[75vh]"
          />
        </Card>
      )}
    </PageTransition>
  )
}
