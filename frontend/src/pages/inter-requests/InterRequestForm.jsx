import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import SearchableSelect from '../../components/ui/SearchableSelect'
import Button from '../../components/ui/Button'
import FileUpload from '../../components/ui/FileUpload'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function InterRequestForm() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [assignableUsers, setAssignableUsers] = useState([])
  const [files, setFiles] = useState([])
  const [form, setForm] = useState({
    subject: '',
    assigned_to: '',
    priority: 'normal',
    description: '',
    remark: '',
  })

  useEffect(() => {
    api.get('/inter-memos/assignable-users')
      .then(({ data }) => setAssignableUsers(data.data || []))
      .catch(() => addToast('Failed to load users', 'error'))
  }, [addToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.assigned_to) {
      addToast('Please select a user to send the memo to', 'warning')
      return
    }
    setLoading(true)
    try {
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
      addToast(firstError || err.response?.data?.message || 'Failed to submit memo', 'error')
    } finally {
      setLoading(false)
    }
  }

  const userOptions = assignableUsers.map((u) => ({
    value: String(u.id),
    label: u.department?.name ? `${u.name} — ${u.department.name}` : u.name,
    keywords: `${u.name} ${u.email} ${u.department?.name || ''} ${u.section?.name || ''}`,
  }))

  return (
    <PageTransition>
      <button onClick={() => navigate('/inter-memos')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title="New Inter-Memo" subtitle="Send directly to a user — they can approve or forward with remarks" />
      <Card className="max-w-2xl">
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
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
            />
          </div>
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
          <FileUpload
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            multiple
            maxSize={30}
            onFilesSelected={setFiles}
          />
          <div className="flex gap-3">
            <Button type="submit" variant="gold" loading={loading}>Submit Memo</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/inter-memos')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageTransition>
  )
}
