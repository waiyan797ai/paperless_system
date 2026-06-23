import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, RotateCcw, ArrowRightToLine, Users, Trash2, Paperclip, Download } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { formatDate, getStatusColor } from '../../lib/utils'
import { hasPermission, hasRole, isAdminLevel } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { useFormRequestDetail, useInvalidateFormRequests } from '../../hooks/useFormRequests'
import { useToast } from '../../components/ui/Toast'
import { queryKeys } from '../../lib/queryKeys'

const actionLabels = {
  submitted: 'Submitted',
  source_endorsed: 'Source Department Endorsed',
  dept_approved: 'Department Approved',
  forwarded_section: 'Forwarded to Section',
  cc_updated: 'CC Updated',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Returned',
}

function getApproveModalTitle(status) {
  if (status === 'submitted') return 'Approve Request (Department Review)'
  if (status === 'dept_approved') return 'Approve Request (Target Department)'
  if (status === 'at_section') return 'Approve Request (Section)'
  return 'Approve Request'
}

function getRejectModalTitle(status) {
  if (status === 'submitted') return 'Reject Request (Department Review)'
  if (status === 'dept_approved') return 'Reject Request (Target Department)'
  if (status === 'at_section') return 'Reject Request (Section)'
  return 'Reject Request'
}

function getReturnModalTitle(status) {
  if (status === 'submitted') return 'Return to Requester (Department Review)'
  if (status === 'dept_approved') return 'Return to Requester'
  if (status === 'at_section') return 'Return to Requester'
  return 'Return Request'
}

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const queryClient = useQueryClient()
  const invalidateFormRequests = useInvalidateFormRequests()
  const { data: request, isLoading: loading, isError, isFetching, refetch } = useFormRequestDetail(id)
  const [actionLoading, setActionLoading] = useState(false)
  const [forwardOpen, setForwardOpen] = useState(false)
  const [ccOpen, setCcOpen] = useState(false)
  const [actionOpen, setActionOpen] = useState(null)
  const [remark, setRemark] = useState('')
  const [ccCandidates, setCcCandidates] = useState([])
  const [selectedCcIds, setSelectedCcIds] = useState([])
  const [sections, setSections] = useState([])
  const [forwardSectionId, setForwardSectionId] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [commentLoading, setCommentLoading] = useState(false)

  useEffect(() => {
    if (isError) {
      addToast('Request not found', 'error')
      navigate('/requests')
    }
  }, [isError, navigate, addToast])

  const refreshRequest = async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.formRequest(id) })
    await invalidateFormRequests()
    await refetch()
  }

  const isOwner = request?.user_id === user?.id
  const isTargetDept = request?.target_department_id === user?.department_id
  const isReviewDept = request?.review_department_id === user?.department_id
  const isSectionScope = request?.target_section_id === user?.section_id
  const isAdmin = isAdminLevel(user)
  const isDeptAdmin = hasRole(user, 'department', 'admin')

  // Own dept head can approve/reject/return submitted requests
  const canReviewDept =
    !isOwner
    && request?.status === 'submitted'
    && hasPermission(user, 'form_requests.approve')
    && (isDeptAdmin || isAdmin)
    && (isReviewDept || isAdmin)

  // Target dept head can approve/reject/return dept_approved requests
  const canTargetDeptApprove =
    !isOwner
    && request?.status === 'dept_approved'
    && hasPermission(user, 'form_requests.approve')
    && (isTargetDept || isAdmin)
    && (isDeptAdmin || isAdmin)

  // Section head can approve/reject/return at_section requests
  const canSectionApprove =
    !isOwner
    && request?.status === 'at_section'
    && hasPermission(user, 'form_requests.approve')
    && (isSectionScope || isAdmin)

  const canManageCc =
    (isDeptAdmin || isAdmin)
    && ['submitted', 'dept_approved', 'at_section'].includes(request?.status)
    && (isReviewDept || isTargetDept || isAdmin)

  const canForwardSection =
    request?.status === 'dept_approved'
    && hasPermission(user, 'form_requests.forward_section')
    && (isTargetDept || isAdmin)

  const canEdit = isOwner && ['draft', 'returned'].includes(request?.status)
  const canSubmit = isOwner && ['draft', 'returned'].includes(request?.status)
  const canDelete = isAdmin || (isOwner && request?.status !== 'approved')

  const openCcModal = async () => {
    try {
      const { data } = await api.get(`/form-requests/${id}/cc-candidates`)
      setCcCandidates(data.data || [])
      setSelectedCcIds((request.cc_users || []).map((u) => u.id))
      setCcOpen(true)
    } catch {
      addToast('Failed to load CC candidates', 'error')
    }
  }

  const openForwardModal = async () => {
    try {
      const { data } = await api.get('/sections', {
        params: { department_id: request.target_department_id },
      })
      setSections(data.data?.data || data.data || [])
      setForwardSectionId('')
      setForwardOpen(true)
    } catch {
      addToast('Failed to load sections', 'error')
    }
  }

  const handleSaveCc = async () => {
    setActionLoading(true)
    try {
      await api.put(`/form-requests/${id}/cc`, { user_ids: selectedCcIds })
      addToast('CC users updated', 'success')
      setCcOpen(false)
      await refreshRequest()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update CC', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const toggleCcUser = (userId) => {
    setSelectedCcIds((prev) =>
      prev.includes(userId) ? prev.filter((x) => x !== userId) : [...prev, userId]
    )
  }

  const handleForwardSection = async () => {
    if (!forwardSectionId) return
    setActionLoading(true)
    try {
      await api.post(`/form-requests/${id}/forward-section`, { target_section_id: forwardSectionId })
      addToast('Request forwarded to section', 'success')
      setForwardOpen(false)
      await refreshRequest()
    } catch (err) {
      addToast(err.response?.data?.message || 'Forward failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAction = async (action) => {
    if (!remark.trim()) {
      addToast('Remark is required', 'error')
      return
    }

    setActionLoading(true)
    try {
      await api.post(`/form-requests/${id}/${action}`, { comments: remark })
      const msg = action === 'approve' ? 'Request approved'
        : action === 'reject' ? 'Request rejected'
        : 'Request returned'
      addToast(msg, 'success')
      setActionOpen(null)
      setRemark('')
      await refreshRequest()
    } catch (err) {
      addToast(err.response?.data?.message || 'Action failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleSubmit = async () => {
    setActionLoading(true)
    try {
      await api.post(`/form-requests/${id}/submit`)
      addToast('Request submitted', 'success')
      await refreshRequest()
    } catch (err) {
      addToast(err.response?.data?.message || 'Submit failed', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDelete = async () => {
    setActionLoading(true)
    try {
      await api.delete(`/form-requests/${id}`)
      addToast('Draft deleted', 'success')
      setDeleteOpen(false)
      await invalidateFormRequests()
      navigate('/requests')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete draft', 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    setCommentLoading(true)
    try {
      await api.post(`/form-requests/${id}/comments`, { comment: newComment.trim() })
      setNewComment('')
      await refreshRequest()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add comment', 'error')
    } finally {
      setCommentLoading(false)
    }
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><LoadingSpinner label="Loading request..." /></div>
  }

  if (!request) return null

  const fields = request.form_template?.fields || []

  return (
    <PageTransition>
      <button onClick={() => navigate('/requests')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </button>

      <PageHeader
        title={request.title}
        subtitle={
          <span className="flex items-center gap-2">
            {request.reference_no}
            {isFetching && !loading && (
              <span className="text-xs text-[var(--text-muted)]">Updating...</span>
            )}
          </span>
        }
        actions={
          <div className="flex flex-wrap gap-2">
            {canEdit && (
              <Button variant="secondary" onClick={() => navigate(`/requests/${id}/edit`)}>Edit</Button>
            )}
            {canSubmit && (
              <Button variant="gold" loading={actionLoading} onClick={handleSubmit}>Submit</Button>
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleteOpen(true)}><Trash2 className="h-4 w-4" /> Delete</Button>
            )}
            {canManageCc && (
              <Button variant="secondary" onClick={openCcModal}><Users className="h-4 w-4" /> Manage CC</Button>
            )}
            {canReviewDept && (
              <>
                <Button variant="gold" onClick={() => setActionOpen('approve')}><CheckCircle className="h-4 w-4" /> Approve</Button>
                <Button variant="secondary" onClick={() => setActionOpen('return')}><RotateCcw className="h-4 w-4" /> Return</Button>
                <Button variant="danger" onClick={() => setActionOpen('reject')}><XCircle className="h-4 w-4" /> Reject</Button>
              </>
            )}
            {canTargetDeptApprove && (
              <>
                <Button variant="gold" onClick={() => setActionOpen('approve')}><CheckCircle className="h-4 w-4" /> Approve</Button>
                <Button variant="secondary" onClick={openForwardModal}><ArrowRightToLine className="h-4 w-4" /> Forward to Section</Button>
                <Button variant="secondary" onClick={() => setActionOpen('return')}><RotateCcw className="h-4 w-4" /> Return</Button>
                <Button variant="danger" onClick={() => setActionOpen('reject')}><XCircle className="h-4 w-4" /> Reject</Button>
              </>
            )}
            {canSectionApprove && (
              <>
                <Button variant="gold" onClick={() => setActionOpen('approve')}><CheckCircle className="h-4 w-4" /> Approve</Button>
                <Button variant="secondary" onClick={() => setActionOpen('return')}><RotateCcw className="h-4 w-4" /> Return</Button>
                <Button variant="danger" onClick={() => setActionOpen('reject')}><XCircle className="h-4 w-4" /> Reject</Button>
              </>
            )}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Form Data</CardTitle>
          <div className="space-y-4">
            {fields.map((field) => {
              const value = request.data?.[field.name]

              if (field.type === 'attachment') {
                const fieldAtts = (request.attachments || []).filter((a) => a.field_name === field.name)
                return (
                  <div key={field.name}>
                    <p className="text-sm text-[var(--text-muted)] mb-2">
                      <Paperclip className="h-3.5 w-3.5 inline mr-1" />
                      {field.label}
                      <span className="ml-1 text-xs">({field.multiple ? 'multiple files' : 'single file'})</span>
                    </p>
                    {fieldAtts.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">—</p>
                    ) : (
                      <div className="space-y-1">
                        {fieldAtts.map((att) => (
                          <a
                            key={att.id}
                            href={`/api/v1/form-requests/${request.id}/attachments/${att.id}/download`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-2 p-2 rounded-lg border border-[var(--border-color)] hover:bg-[var(--bg-surface)] text-sm"
                          >
                            <Paperclip className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                            <span className="truncate">{att.file_name}</span>
                            <Download className="h-4 w-4 text-[var(--text-muted)] shrink-0 ml-auto" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }

              if (field.type === 'items') {
                const rows = Array.isArray(value) ? value : []
                const columns = field.columns || []

                return (
                  <div key={field.name}>
                    <p className="text-sm text-[var(--text-muted)] mb-2">{field.label}</p>
                    {rows.length === 0 ? (
                      <p className="text-sm text-[var(--text-muted)]">—</p>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-color)]">
                              <th className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)]">#</th>
                              {columns.map((col) => (
                                <th key={col.name} className="px-3 py-2 text-left text-xs font-medium text-[var(--text-muted)]">{col.label}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row, index) => (
                              <tr key={index} className="border-b border-[var(--border-color)] last:border-0">
                                <td className="px-3 py-2 text-[var(--text-muted)]">{index + 1}</td>
                                {columns.map((col) => (
                                  <td key={col.name} className="px-3 py-2 font-medium text-[var(--text-primary)]">
                                    {row[col.name] || '—'}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              }

              return (
                <div key={field.name}>
                  <p className="text-sm text-[var(--text-muted)]">{field.label}</p>
                  <p className="font-medium mt-1 text-[var(--text-primary)] whitespace-pre-wrap">
                    {value || '—'}
                  </p>
                </div>
              )
            })}
          </div>

          {request.actions?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
              <CardTitle className="mb-4">Action History</CardTitle>
              <div className="space-y-3">
                {request.actions.map((a) => (
                  <div key={a.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {actionLabels[a.action] || a.action}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(a.created_at)}</p>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      by {a.user?.name || '—'}
                      {a.target_section?.name && ` → ${a.target_section.name}`}
                    </p>
                    {a.remark && (
                      <p className="text-sm text-[var(--text-primary)] mt-2 whitespace-pre-wrap">{a.remark}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {request.attachments?.length > 0 && (
            <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
              <CardTitle className="mb-4">Attachments</CardTitle>
              <div className="space-y-2">
                {request.attachments.map((att) => (
                  <div key={att.id} className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                      <span className="text-sm font-medium truncate">{att.file_name}</span>
                      <span className="text-xs text-[var(--text-muted)] shrink-0">{(att.file_size / 1024).toFixed(0)} KB</span>
                    </div>
                    <button
                      onClick={async () => {
                        try {
                          const res = await api.get(`/form-requests/${id}/attachments/${att.id}/download`, { responseType: 'blob' })
                          const url = window.URL.createObjectURL(new Blob([res.data]))
                          const link = document.createElement('a')
                          link.href = url
                          link.download = att.file_name
                          link.click()
                          window.URL.revokeObjectURL(url)
                        } catch { addToast('Failed to download file', 'error') }
                      }}
                      className="text-gold-600 hover:text-gold-700 shrink-0 ml-2"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-[var(--border-color)]">
            <CardTitle className="mb-4">Comments</CardTitle>
            {request.comments?.length > 0 && (
              <div className="space-y-3 mb-4">
                {request.comments.map((c) => (
                  <div key={c.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-[var(--text-primary)]">{c.user?.name || '—'}</p>
                      <p className="text-xs text-[var(--text-muted)]">{formatDate(c.created_at)}</p>
                    </div>
                    <p className="text-sm text-[var(--text-primary)] mt-1 whitespace-pre-wrap">{c.comment}</p>
                  </div>
                ))}
              </div>
            )}
            {request.status !== 'draft' && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={2}
                  className="flex-1 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-2.5 text-sm resize-y"
                  placeholder="Add a comment..."
                />
                <Button type="submit" variant="secondary" size="sm" loading={commentLoading} disabled={!newComment.trim()}>
                  Send
                </Button>
              </form>
            )}
          </div>
        </Card>

        <Card>
          <CardTitle className="mb-4">Information</CardTitle>
          <div className="space-y-4 text-sm">
            <div>
              <p className="text-[var(--text-muted)]">Status</p>
              <Badge variant={getStatusColor(request.status)} dot className="mt-1">{request.status}</Badge>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Requester</p>
              <p className="font-medium mt-1">{request.user?.name || '—'}</p>
              <p className="text-xs text-[var(--text-muted)]">{request.user?.department?.name}</p>
            </div>
            <div>
              <p className="text-[var(--text-muted)]">Target Department</p>
              <p className="font-medium mt-1">{request.target_department?.name || '—'}</p>
            </div>
            {request.target_section && (
              <div>
                <p className="text-[var(--text-muted)]">Target Section</p>
                <p className="font-medium mt-1">{request.target_section.name}</p>
              </div>
            )}
            {request.review_department && (
              <div>
                <p className="text-[var(--text-muted)]">Review Department</p>
                <p className="font-medium mt-1">{request.review_department.name}</p>
              </div>
            )}
            {request.dept_reviewed_by && (
              <div>
                <p className="text-[var(--text-muted)]">Dept Reviewed By</p>
                <p className="font-medium mt-1">{request.dept_reviewed_by.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{formatDate(request.dept_reviewed_at)}</p>
              </div>
            )}
            {request.cc_users?.length > 0 && (
              <div>
                <p className="text-[var(--text-muted)]">CC</p>
                <div className="mt-1 space-y-1">
                  {request.cc_users.map((cc) => (
                    <p key={cc.id} className="font-medium">{cc.name}</p>
                  ))}
                </div>
              </div>
            )}
            {request.final_approved_by && (
              <div>
                <p className="text-[var(--text-muted)]">Final Approved By</p>
                <p className="font-medium mt-1">{request.final_approved_by.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{formatDate(request.final_approved_at)}</p>
              </div>
            )}
            <div>
              <p className="text-[var(--text-muted)]">Submitted</p>
              <p className="font-medium mt-1">{formatDate(request.submitted_at)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={ccOpen} onClose={() => setCcOpen(false)} title="Manage CC" footer={
        <>
          <Button variant="secondary" onClick={() => setCcOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={handleSaveCc} loading={actionLoading}>Save CC</Button>
        </>
      }>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          CC users will be notified and can view &amp; comment on this request.
        </p>
        <div className="max-h-64 overflow-y-auto space-y-2">
          {ccCandidates.map((candidate) => (
            <label
              key={candidate.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-surface)]"
            >
              <input
                type="checkbox"
                checked={selectedCcIds.includes(candidate.id)}
                onChange={() => toggleCcUser(candidate.id)}
              />
              <div>
                <p className="text-sm font-medium">{candidate.name}</p>
                <p className="text-xs text-[var(--text-muted)]">{candidate.position || candidate.email}</p>
              </div>
            </label>
          ))}
          {ccCandidates.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No staff available for CC.</p>
          )}
        </div>
      </Modal>

      <Modal open={forwardOpen} onClose={() => setForwardOpen(false)} title="Forward to Section" footer={
        <>
          <Button variant="secondary" onClick={() => setForwardOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={handleForwardSection} loading={actionLoading}>Forward</Button>
        </>
      }>
        <p className="text-sm text-[var(--text-muted)] mb-3">
          Forward this request to a section within <strong>{request.target_department?.name}</strong>. The section head will approve.
        </p>
        <Select
          label="Section"
          value={forwardSectionId}
          onChange={(e) => setForwardSectionId(e.target.value)}
          options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
          placeholder={sections.length ? 'Select section...' : 'No sections available'}
        />
      </Modal>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete Draft"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="danger" onClick={handleDelete} loading={actionLoading}>Delete</Button>
          </>
        }
      >
        <p className="text-sm text-[var(--text-secondary)]">
          Delete this draft request? This cannot be undone.
        </p>
      </Modal>

      <Modal
        open={!!actionOpen}
        onClose={() => { setActionOpen(null); setRemark('') }}
        title={
          actionOpen === 'approve'
            ? getApproveModalTitle(request.status)
            : actionOpen === 'reject'
              ? getRejectModalTitle(request.status)
              : getReturnModalTitle(request.status)
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => { setActionOpen(null); setRemark('') }}>Cancel</Button>
            <Button
              variant={actionOpen === 'reject' ? 'danger' : 'gold'}
              onClick={() => handleAction(actionOpen)}
              loading={actionLoading}
            >
              Confirm
            </Button>
          </>
        }
      >
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Remark <span className="text-red-500">*</span>
          </label>
          <textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            rows={4}
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm resize-y"
            placeholder="Enter remark (required)..."
          />
        </div>
      </Modal>
    </PageTransition>
  )
}
