import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

const emptyField = { name: '', label: '', type: 'text', required: true, options: [] }

const emptyForm = {
  code: '',
  title: '',
  description: '',
  target_department_id: '',
  status: 'active',
  fields: [{ ...emptyField }],
}

export default function FormTemplates() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [templates, setTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const pageSize = 10

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/form-templates', {
        params: { page, per_page: pageSize, search: search || undefined },
      })
      setTemplates(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setTemplates([])
      addToast('Failed to load form templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    api.get('/departments', { params: { per_page: 100 } })
      .then(({ data }) => setDepartments(data.data?.data || data.data || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const timer = setTimeout(fetchTemplates, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (template) => {
    setEditing(template)
    setForm({
      code: template.code || '',
      title: template.title || '',
      description: template.description || '',
      target_department_id: template.target_department_id ? String(template.target_department_id) : '',
      status: template.status || 'active',
      fields: template.fields?.length ? template.fields : [{ ...emptyField }],
    })
    setModalOpen(true)
  }

  const updateField = (index, key, value) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      fields[index] = { ...fields[index], [key]: value }
      return { ...prev, fields }
    })
  }

  const addField = () => {
    setForm((prev) => ({ ...prev, fields: [...prev.fields, { ...emptyField }] }))
  }

  const removeField = (index) => {
    setForm((prev) => ({
      ...prev,
      fields: prev.fields.filter((_, i) => i !== index),
    }))
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim() || !form.fields.length) {
      addToast('Code, title and at least one field are required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...form,
        target_department_id: form.target_department_id || null,
        fields: form.fields.map((f) => ({
          ...f,
          name: f.name || f.label.toLowerCase().replace(/\s+/g, '_'),
          options: f.type === 'select' ? (f.options || []).filter(Boolean) : undefined,
        })),
      }

      if (editing) {
        await api.put(`/form-templates/${editing.id}`, payload)
        addToast('Form template updated', 'success')
      } else {
        await api.post('/form-templates', payload)
        addToast('Form template created', 'success')
      }
      setModalOpen(false)
      fetchTemplates()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save form template', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (template) => {
    if (!window.confirm(`Delete form template "${template.title}"?`)) return
    try {
      await api.delete(`/form-templates/${template.id}`)
      addToast('Form template deleted', 'success')
      fetchTemplates()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete', 'error')
    }
  }

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))

  return (
    <PageTransition>
      <PageHeader
        title="Form Templates"
        subtitle="Define request forms with dynamic fields"
        actions={<Button variant="gold" onClick={openCreate}><Plus className="h-4 w-4" /> New Template</Button>}
      />
      <Card>
        <div className="mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search by code or title..." className="max-w-sm" />
        </div>
        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading templates..." /></div>
        ) : templates.length === 0 ? (
          <EmptyState title="No form templates" description="Create a template for users to submit requests." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Fields</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell><span className="font-mono text-gold-600">{t.code}</span></TableCell>
                    <TableCell className="font-medium">{t.title}</TableCell>
                    <TableCell>{t.fields?.length || 0}</TableCell>
                    <TableCell>{t.target_department?.name || 'Any'}</TableCell>
                    <TableCell><Badge variant={t.status === 'active' ? 'success' : 'default'} dot>{t.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <button onClick={() => openEdit(t)} className="p-2 rounded-lg hover:bg-gold-600/10 text-[var(--text-muted)] hover:text-gold-600"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(t)} className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Form Template' : 'New Form Template'} footer={
        <>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Create'}</Button>
        </>
      }>
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <Input label="Form Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LEAVE-001" required />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm resize-y" />
          </div>
          <Select label="Default Target Department (optional)" value={form.target_department_id} onChange={(e) => setForm({ ...form, target_department_id: e.target.value })} options={deptOptions} placeholder="Any department" />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={['active', 'inactive']} />

          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text-primary)]">Form Fields</p>
              <Button type="button" variant="secondary" size="sm" onClick={addField}><Plus className="h-3 w-3" /> Add Field</Button>
            </div>
            <div className="space-y-3">
              {form.fields.map((field, index) => (
                <div key={index} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium text-[var(--text-muted)]">Field {index + 1}</span>
                    {form.fields.length > 1 && (
                      <button type="button" onClick={() => removeField(index)} className="text-[var(--text-muted)] hover:text-red-500"><X className="h-4 w-4" /></button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Label" value={field.label} onChange={(e) => updateField(index, 'label', e.target.value)} />
                    <Input label="Name (key)" value={field.name} onChange={(e) => updateField(index, 'name', e.target.value)} placeholder="auto from label" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Select label="Type" value={field.type} onChange={(e) => updateField(index, 'type', e.target.value)} options={['text', 'textarea', 'number', 'date', 'select']} />
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mt-6">
                      <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, 'required', e.target.checked)} />
                      Required
                    </label>
                  </div>
                  {field.type === 'select' && (
                    <Input
                      label="Options (comma separated)"
                      value={(field.options || []).join(', ')}
                      onChange={(e) => updateField(index, 'options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                      placeholder="Option A, Option B"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Modal>
    </PageTransition>
  )
}
