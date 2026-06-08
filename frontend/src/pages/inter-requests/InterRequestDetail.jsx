import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, ArrowRight, CheckCircle, Download, FileText } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import SearchableSelect from '../../components/ui/SearchableSelect'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { formatDate, formatFileSize, getStatusColor } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

const stepLabels = {
  submitted: 'Submitted',
  forwarded: 'Forwarded',
  approved: 'Approved',
}

const stepVariants = {
  submitted: 'info',
  forwarded: 'warning',
  approved: 'success',
}

export default function InterRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [request, setRequest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [approveOpen, setApproveOpen] = useState(false)
  const [remark, setRemark] = useState('')
  const [forwardUserId, setForwardUserId] = useState('')
  const [assignableUsers, setAssignableUsers] = useState([])

  const loadRequest = () => {
    setLoading(true)
    return api.get(`/inter-requests/${id}`)
      .then(({ data }) => setRequest(data.data))
      .catch(() => {
        addToast('Request not found', 'error')
        navigate('/inter-requests')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadRequest()
  }, [id])

  const isCurrentHolder = request?.assigned_to === user?.id
  const isOpen = request && ['pending', 'processing'].includes(request.status)
  const canProcess = isCurrentHolder && isOpen

  const openForwardModal = async () => {
    setRemark('')
    setForwardUserId('')
    setForwardOpen(true)
    try {
      const { data } = await api.get(`/inter-requests/${id}/assignable-users`)
      setAssignableUsers(data.data || [])
    } catch {
      addToast('Failed to load users', 'error')
      setForwardOpen(false)
    }
  }

  const handleForward = async () => {
    if (!forwardUserId || !remark.trim()) {
      addToast('Select a user and enter a remark', 'warning')
      return
    }
    setActionLoading(true)
    try {
      const { data } = await api.post(`/inter-requests/${id}/forward`, {
        assigned_to: Number(forwardUserId),
        remark: remark.trim(),
      })
      addToast(data.message || 'Forwarded', 'success')
      setForwardOpen(false)
      setRequest(data.data)
    } catch (err) {
      addToast(err.response?.data?.message || 'Forward failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleApprove = async () => {
    if (!remark.trim()) {
      addToast('Please enter a remark', 'warning')
      return
    }
    setActionLoading(true)
    try {
      const { data } = await api.post(`/inter-requests/${id}/approve`, { remark: remark.trim() })
      addToast(data.message || 'Approved', 'success')
      setApproveOpen(false)
      setRequest(data.data)
    } catch (err) {
      addToast(err.response?.data?.message || 'Approve failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (attachment) => {
    try {
      const { data } = await api.get(`/inter-requests/${id}/attachments/${attachment.id}/download`, { responseType: 'blob' })
      const url = window.URL.createObjectURL(new Blob([data]))
      const link = document.createElement('a')
      link.href = url
      link.download = attachment.file_name
      link.click()
      window.URL.revokeObjectURL(url)
    } catch {
      addToast('Download failed', 'error')
    }
  }

  if (loading) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner label="Loading request..." />
      </div>
    )
  }

  if (!request) return null

  const userOptions = assignableUsers
    .filter((u) => u.id !== user?.id)
    .map((u) => ({
      value: String(u.id),
      label: u.department?.name ? `${u.name} — ${u.department.name}` : u.name,
      keywords: `${u.name} ${u.email} ${u.department?.name || ''}`,
    }))

  return (
    <PageTransition>
      <button onClick={() => navigate('/inter-requests')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <PageHeader
        title={request.subject}
        subtitle={request.reference_no}
        actions={
          canProcess ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={openForwardModal}>
                <ArrowRight className="h-4 w-4" /> Forward
              </Button>
              <Button variant="gold" onClick={() => { setRemark(''); setApproveOpen(true) }}>
                <CheckCircle className="h-4 w-4" /> Approve
              </Button>
            </div>
          ) : null
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Request Details</CardTitle>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] mb-6">
            <div className="text-center flex-1">
              <p className="text-xs text-[var(--text-muted)] uppercase">From</p>
              <p className="font-semibold text-[var(--text-primary)] mt-1">{request.requester?.name}</p>
              {request.from_department?.name && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{request.from_department.name}</p>
              )}
            </div>
            <ArrowLeftRight className="h-6 w-6 text-gold-600 shrink-0" />
            <div className="text-center flex-1">
              <p className="text-xs text-[var(--text-muted)] uppercase">Current Holder</p>
              <p className="font-semibold text-[var(--text-primary)] mt-1">{request.assignee?.name || '—'}</p>
              {request.assignee?.department?.name && (
                <p className="text-xs text-[var(--text-muted)] mt-0.5">{request.assignee.department.name}</p>
              )}
            </div>
          </div>
          {request.description && (
            <p className="text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">{request.description}</p>
          )}
          {request.attachments?.length > 0 && (
            <div className="mt-6">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Attachments</p>
              <div className="space-y-2">
                {request.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                      <span className="text-sm truncate">{att.file_name}</span>
                      <span className="text-xs text-[var(--text-muted)]">{formatFileSize(att.file_size)}</span>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => handleDownload(att)}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <Badge variant={getStatusColor(request.status)} dot className="mb-4">{request.status}</Badge>
          <div className="space-y-3 text-sm">
            <div><p className="text-[var(--text-muted)]">Requester</p><p className="font-medium">{request.requester?.name}</p></div>
            <div><p className="text-[var(--text-muted)]">Current Holder</p><p className="font-medium">{request.assignee?.name || '—'}</p></div>
            <div><p className="text-[var(--text-muted)]">Priority</p><p className="font-medium capitalize">{request.priority}</p></div>
            <div><p className="text-[var(--text-muted)]">Created</p><p className="font-medium">{formatDate(request.created_at)}</p></div>
            {request.completed_at && (
              <div><p className="text-[var(--text-muted)]">Completed</p><p className="font-medium">{formatDate(request.completed_at)}</p></div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mt-6">
        <CardTitle className="mb-4">Workflow History</CardTitle>
        {request.steps?.length ? (
          <div className="space-y-4">
            {request.steps.map((step, index) => (
              <div key={step.id} className="relative pl-8 pb-4 border-l-2 border-[var(--border-color)] last:border-transparent last:pb-0">
                <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-gold-600 ring-4 ring-[var(--bg-primary)]" />
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge variant={stepVariants[step.action] || 'default'}>{stepLabels[step.action] || step.action}</Badge>
                  <span className="text-sm font-medium text-[var(--text-primary)]">{step.user?.name}</span>
                  <span className="text-xs text-[var(--text-muted)]">{formatDate(step.created_at)}</span>
                </div>
                {step.assignee && step.action !== 'approved' && (
                  <p className="text-sm text-[var(--text-secondary)] mb-1">
                    → Sent to <strong>{step.assignee.name}</strong>
                  </p>
                )}
                {step.remark && (
                  <p className="text-sm text-[var(--text-muted)] bg-[var(--bg-surface)] rounded-lg p-3 border border-[var(--border-color)]">
                    {step.remark}
                  </p>
                )}
                {index < request.steps.length - 1 && <div className="h-2" />}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">No workflow steps yet.</p>
        )}
      </Card>

      <Modal
        open={forwardOpen}
        onClose={() => setForwardOpen(false)}
        title="Forward to Another User"
        footer={
          <>
            <Button variant="secondary" onClick={() => setForwardOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleForward} loading={actionLoading}>Forward</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Add a remark and select the next person who should handle this request.
        </p>
        <SearchableSelect
          label="Forward To"
          value={forwardUserId}
          onChange={(e) => setForwardUserId(e.target.value)}
          options={userOptions}
          placeholder="Select user"
          required
          className="mb-4"
        />
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Remark</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
            placeholder="Why are you forwarding this?"
          />
        </div>
      </Modal>

      <Modal
        open={approveOpen}
        onClose={() => setApproveOpen(false)}
        title="Approve Request"
        footer={
          <>
            <Button variant="secondary" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleApprove} loading={actionLoading}>Approve & Close</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Approving will close this case. Add your final remark below.
        </p>
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Remark</label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
            placeholder="Approval remark..."
          />
        </div>
      </Modal>
    </PageTransition>
  )
}
