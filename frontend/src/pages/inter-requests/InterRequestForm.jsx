import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import SearchableSelect from '../../components/ui/SearchableSelect'
import Button from '../../components/ui/Button'
import FileUpload from '../../components/ui/FileUpload'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { isAdminLevel } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'

const statusOptions = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'completed', label: 'Completed' },
]

export default function InterRequestForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [fetchLoading, setFetchLoading] = useState(isEdit)
  const [assignableUsers, setAssignableUsers] = useState([])
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({
    subject: '',
    assigned_to: '',
    priority: 'normal',
    description: '',
    remark: '',
    status: 'pending',
  })

  useEffect(() => {
    const usersUrl = isEdit ? `/inter-memos/${id}/assignable-users` : '/inter-memos/assignable-users'
    api.get(usersUrl)
      .then(({ data }) => setAssignableUsers(data.data || []))
      .catch(() => addToast('Failed to load users', 'error'))
  }, [addToast, id, isEdit])

  useEffect(() => {
    if (!isEdit) return
    setFetchLoading(true)
    api.get(`/inter-memos/${id}`)
      .then(({ data }) => {
        const memo = data.data || {}
        setForm({
          subject: memo.subject || '',
          assigned_to: memo.assigned_to ? String(memo.assigned_to) : '',
          priority: memo.priority || 'normal',
          description: memo.description || '',
          remark: '',
          status: memo.status || 'pending',
        })
      })
      .catch(() => {
        addToast('Memo not found', 'error')
        navigate('/inter-memos')
      })
      .finally(() => setFetchLoading(false))
  }, [addToast, id, isEdit, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.assigned_to) {
      addToast('Please select a user to send the memo to', 'warning')
      return
    }
    setLoading(true)
    try {
      if (isEdit) {
        const payload = {
          subject: form.subject.trim(),
          assigned_to: Number(form.assigned_to),
          priority: form.priority,
          description: form.description,
          status: form.status,
        }
        const { data } = await api.put(`/inter-memos/${id}`, payload)
        addToast(data.message || 'Inter-memo updated', 'success')
        navigate(`/inter-memos/${id}`)
        return
      }

      const formData = new FormData()
      formData.append('subject', form.subject.trim())
      formData.append('assigned_to', form.assigned_to)
      formData.append('priority', form.priority)
      if (form.description) formData.append('description', form.description)
      if (form.remark) formData.append('remark', form.remark)
      files.forEach((file) => formData.append('attachments[]', file))

      const { data } = await api.post('/inter-memos', formData)
      addToast(data.message || 'Inter-memo submitted', 'success')
      navigate(`/inter-memos/${data.data?.id}`)
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors && Object.values(errors).flat()[0]
      addToast(firstError || err.response?.data?.message || `Failed to ${isEdit ? 'update' : 'submit'} memo`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const userOptions = assignableUsers.map((u) => ({
    value: String(u.id),
    label: u.department?.name ? `${u.name} — ${u.department.name}` : u.name,
    keywords: `${u.name} ${u.email} ${u.department?.name || ''} ${u.section?.name || ''}`,
  }))

  const isAdmin = isAdminLevel(user)

  return (
    <PageTransition>
      <button onClick={() => navigate('/inter-memos')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader
        title={isEdit ? 'Edit Inter-Memo' : 'New Inter-Memo'}
        subtitle={isEdit ? 'Update memo details and assignment' : 'Send directly to a user — they can approve or forward with remarks'}
      />
      <Card className="max-w-2xl">
        {fetchLoading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading memo..." />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required />
            <SearchableSelect
              label="Send To"
              value={form.assigned_to}
              onChange={(e) => setForm({ ...form, assigned_to: e.target.value })}
              options={userOptions}
              placeholder="Select user"
              searchPlaceholder="Search by name or email..."
              required
            />
            <Select
              label="Priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'normal', label: 'Normal' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            {isEdit && isAdmin && (
              <Select
                label="Status"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                options={statusOptions}
              />
            )}
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={4}
                className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
              />
            </div>
            {!isEdit && (
              <div>
                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Initial Remark (optional)</label>
                <textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  rows={2}
                  placeholder="Note for the recipient..."
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
                />
              </div>
            )}
            {!isEdit && (
              <FileUpload
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                multiple
                maxSize={30}
                onFilesSelected={setFiles}
              />
            )}
            <div className="flex gap-3">
              <Button type="submit" variant="gold" loading={loading}>{isEdit ? 'Update Memo' : 'Submit Memo'}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate('/inter-memos')}>Cancel</Button>
            </div>
          </form>
        )}
      </Card>
    </PageTransition>
  )
}
