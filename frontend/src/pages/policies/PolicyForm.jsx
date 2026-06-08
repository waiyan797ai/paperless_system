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
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

export default function PolicyForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [loadingTypes, setLoadingTypes] = useState(true)
  const [policyTypes, setPolicyTypes] = useState([])
  const [file, setFile] = useState(null)
  const [form, setForm] = useState({
    title: '',
    policy_type_id: '',
    version: '1.0',
    status: 'active',
    description: '',
    approved_by: '',
  })

  useEffect(() => {
    api.get('/policy-types', { params: { for_select: 1 } })
      .then(({ data }) => setPolicyTypes(data.data || []))
      .catch(() => addToast('Failed to load policy types', 'error'))
      .finally(() => setLoadingTypes(false))
  }, [addToast])

  useEffect(() => {
    if (!isEdit) return
    api.get(`/policies/${id}`)
      .then(({ data }) => {
        const p = data.data
        setForm({
          title: p.title || '',
          policy_type_id: p.policy_type_id ? String(p.policy_type_id) : '',
          version: p.version || '1.0',
          status: p.status || 'active',
          description: p.description || '',
          approved_by: p.approved_by || '',
        })
      })
      .catch(() => addToast('Failed to load policy', 'error'))
      .finally(() => setFetching(false))
  }, [id, isEdit, addToast])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!form.policy_type_id) {
      addToast('Please select a policy type', 'error')
      return
    }

    setLoading(true)
    try {
      const formData = new FormData()
      Object.entries(form).forEach(([key, val]) => {
        if (val) formData.append(key, val)
      })
      if (file) formData.append('file', file)

      if (isEdit) {
        // PHP only accepts multipart file uploads on POST
        await api.post(`/policies/${id}`, formData)
        addToast('Policy updated', 'success')
      } else {
        await api.post('/policies', formData)
        addToast('Policy created — visible to all users', 'success')
      }
      navigate('/policies')
    } catch (err) {
      const payload = err.response?.data
      const fieldError = payload?.errors ? Object.values(payload.errors).flat()[0] : null
      addToast(fieldError || payload?.message || 'Failed to save policy', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (fetching || loadingTypes) {
    return (
      <div className="py-12 flex justify-center">
        <LoadingSpinner label="Loading policy form..." />
      </div>
    )
  }

  const typeOptions = policyTypes.map((type) => ({
    value: String(type.id),
    label: type.title,
    keywords: type.code,
  }))

  return (
    <PageTransition>
      <button onClick={() => navigate('/policies')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Policies
      </button>
      <PageHeader title={isEdit ? 'Edit Policy' : 'New Policy'} subtitle="Active policies are visible to all employees" />
      <Card className="max-w-3xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Policy Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Created By</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{user?.name || '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-secondary)]">Department</p>
              <p className="mt-1 text-sm text-[var(--text-primary)]">{user?.departmentName || user?.department?.name || '—'}</p>
            </div>
          </div>

          <Input
            label="Approved By"
            value={form.approved_by}
            onChange={(e) => setForm({ ...form, approved_by: e.target.value })}
            placeholder="Enter approver name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SearchableSelect
              label="Policy Type"
              value={form.policy_type_id}
              onChange={(e) => setForm({ ...form, policy_type_id: e.target.value })}
              options={typeOptions}
              placeholder={typeOptions.length ? 'Select policy type...' : 'No policy types — create one first'}
              searchPlaceholder="Search by title or code..."
              disabled={!typeOptions.length}
              required
            />
            <Input label="Version" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })} />
            <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={['active', 'inactive', 'archived']} />
          </div>

          {typeOptions.length === 0 && (
            <p className="text-sm text-amber-600">
              No policy types available.{' '}
              <button type="button" onClick={() => navigate('/policy-types')} className="underline hover:text-gold-600">
                Create policy types first
              </button>
            </p>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y"
              placeholder="Policy description..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">PDF Attachment</label>
            <FileUpload accept=".pdf" onFilesSelected={(files) => setFile(files[0] || null)} />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="gold" loading={loading} disabled={!typeOptions.length}>
              {isEdit ? 'Update' : 'Create'} Policy
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/policies')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageTransition>
  )
}
