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

const emptyColumn = { name: '', label: '', type: 'text', required: false, options: [] }
const emptyField = { name: '', label: '', type: 'text', required: true, options: [], columns: [{ ...emptyColumn }] }

const fieldTypeOptions = [
  { value: 'text', label: 'Text' },
  { value: 'items', label: 'Items — multiple rows' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'select', label: 'Select' },
  { value: 'attachment', label: 'Attachment (file upload)' },
]

const emptyItemsField = {
  name: 'items',
  label: 'Items',
  type: 'items',
  required: true,
  columns: [
    { name: 'item_name', label: 'Item Name', type: 'text', required: true, options: [] },
    { name: 'quantity', label: 'Quantity', type: 'number', required: true, options: [] },
    { name: 'unit', label: 'Unit', type: 'text', required: false, options: [] },
  ],
}

const columnTypeOptions = ['text', 'number', 'date', 'select']

const attachmentTypeOptions = [
  { value: 'none', label: 'No Attachments' },
  { value: 'single', label: 'Single File' },
  { value: 'multiple', label: 'Multiple Files' },
]

const emptyForm = {
  code: '',
  title: '',
  description: '',
  target_department_id: '',
  target_section_id: '',
  status: 'active',
  attachment_type: 'none',
  fields: [{ ...emptyField }],
}

export default function FormTemplates() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [templates, setTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [sections, setSections] = useState([])
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
    if (!form.target_department_id) {
      setSections([])
      return
    }
    api.get('/sections', { params: { department_id: form.target_department_id, per_page: 100 } })
      .then(({ data }) => setSections(data.data?.data || data.data || []))
      .catch(() => setSections([]))
  }, [form.target_department_id])

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
      target_section_id: template.target_section_id ? String(template.target_section_id) : '',
      status: template.status || 'active',
      attachment_type: template.attachment_type || 'none',
      fields: template.fields?.length
        ? template.fields.map((f) => ({
            ...f,
            columns: f.type === 'items'
              ? (f.columns?.length ? f.columns : [{ ...emptyColumn }])
              : f.columns,
          }))
        : [{ ...emptyField }],
    })
    setModalOpen(true)
  }

  const updateField = (index, key, value) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      const next = { ...fields[index], [key]: value }
      if (key === 'type' && value === 'items' && !next.columns?.length) {
        next.columns = [{ ...emptyColumn }]
      }
      fields[index] = next
      return { ...prev, fields }
    })
  }

  const updateColumn = (fieldIndex, colIndex, key, value) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      const columns = [...(fields[fieldIndex].columns || [])]
      columns[colIndex] = { ...columns[colIndex], [key]: value }
      fields[fieldIndex] = { ...fields[fieldIndex], columns }
      return { ...prev, fields }
    })
  }

  const addColumn = (fieldIndex) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      fields[fieldIndex] = {
        ...fields[fieldIndex],
        columns: [...(fields[fieldIndex].columns || []), { ...emptyColumn }],
      }
      return { ...prev, fields }
    })
  }

  const removeColumn = (fieldIndex, colIndex) => {
    setForm((prev) => {
      const fields = [...prev.fields]
      const columns = (fields[fieldIndex].columns || []).filter((_, i) => i !== colIndex)
      fields[fieldIndex] = { ...fields[fieldIndex], columns }
      return { ...prev, fields }
    })
  }

  const addField = (preset = null) => {
    setForm((prev) => ({
      ...prev,
      fields: [...prev.fields, preset ? { ...preset, columns: preset.columns.map((c) => ({ ...c })) } : { ...emptyField }],
    }))
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
        target_section_id: form.target_department_id && form.target_section_id ? form.target_section_id : null,
        attachment_type: form.attachment_type || 'none',
        fields: form.fields.map((f) => {
          const base = {
            name: f.name || f.label.toLowerCase().replace(/\s+/g, '_'),
            label: f.label,
            type: f.type,
            required: f.required,
          }

          if (f.type === 'items') {
            return {
              ...base,
              columns: (f.columns || []).map((c) => ({
                name: c.name || c.label.toLowerCase().replace(/\s+/g, '_'),
                label: c.label,
                type: c.type,
                required: c.required,
                options: c.type === 'select' ? (c.options || []).filter(Boolean) : undefined,
              })),
            }
          }

          return {
            ...base,
            options: f.type === 'select' ? (f.options || []).filter(Boolean) : undefined,
          }
        }),
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
  const sectionOptions = sections.map((s) => ({ value: String(s.id), label: s.name }))

  const handleDepartmentChange = (deptId) => {
    setForm((prev) => ({
      ...prev,
      target_department_id: deptId,
      target_section_id: '',
    }))
  }

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
                  <TableHead>Section</TableHead>
                  <TableHead>Attachments</TableHead>
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
                    <TableCell>{t.target_section?.name || '—'}</TableCell>
                    <TableCell><span className="text-sm capitalize">{t.attachment_type === 'none' ? '—' : t.attachment_type}</span></TableCell>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} size="xl" title={editing ? 'Edit Form Template' : 'New Form Template'} footer={
        <>
          <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
          <Button variant="gold" onClick={handleSave} loading={saving}>{editing ? 'Update' : 'Create'}</Button>
        </>
      }>
        <div className="space-y-4 max-h-[75vh] overflow-y-auto overflow-x-visible pr-1">
          <Input label="Form Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="LEAVE-001" required />
          <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm resize-y" />
          </div>
          <Select label="Default Target Department (optional)" value={form.target_department_id} onChange={(e) => handleDepartmentChange(e.target.value)} options={deptOptions} placeholder="Any department" />
          <Select
            label="Default Target Section (optional)"
            value={form.target_section_id}
            onChange={(e) => setForm({ ...form, target_section_id: e.target.value })}
            options={sectionOptions}
            placeholder={form.target_department_id ? 'Any section' : 'Select department first'}
            disabled={!form.target_department_id}
          />
          <Select label="Status" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={['active', 'inactive']} />
          <Select label="Attachments" value={form.attachment_type} onChange={(e) => setForm({ ...form, attachment_type: e.target.value })} options={attachmentTypeOptions} />

          <div className="pt-2">
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-3">Form Fields</p>
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
                    <Select label="Type" value={field.type} onChange={(e) => updateField(index, 'type', e.target.value)} options={fieldTypeOptions} />
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
                  {field.type === 'attachment' && (
                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                      <input
                        type="checkbox"
                        checked={field.multiple ?? false}
                        onChange={(e) => updateField(index, 'multiple', e.target.checked)}
                      />
                      Allow multiple files
                    </label>
                  )}
                  {field.type === 'items' && (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-medium text-[var(--text-muted)]">Item columns (users can add multiple rows)</p>
                      {(field.columns || []).map((col, colIndex) => (
                        <div key={colIndex} className="p-2 rounded-lg border border-dashed border-[var(--border-color)] space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-[var(--text-muted)]">Column {colIndex + 1}</span>
                            {(field.columns || []).length > 1 && (
                              <button type="button" onClick={() => removeColumn(index, colIndex)} className="text-[var(--text-muted)] hover:text-red-500"><X className="h-3 w-3" /></button>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Input label="Label" value={col.label} onChange={(e) => updateColumn(index, colIndex, 'label', e.target.value)} />
                            <Input label="Name (key)" value={col.name} onChange={(e) => updateColumn(index, colIndex, 'name', e.target.value)} placeholder="auto from label" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <Select label="Type" value={col.type} onChange={(e) => updateColumn(index, colIndex, 'type', e.target.value)} options={columnTypeOptions} />
                            <label className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-5">
                              <input type="checkbox" checked={col.required} onChange={(e) => updateColumn(index, colIndex, 'required', e.target.checked)} />
                              Required
                            </label>
                          </div>
                          {col.type === 'select' && (
                            <Input
                              label="Options (comma separated)"
                              value={(col.options || []).join(', ')}
                              onChange={(e) => updateColumn(index, colIndex, 'options', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                              placeholder="Option A, Option B"
                            />
                          )}
                        </div>
                      ))}
                      <Button type="button" variant="secondary" size="sm" onClick={() => addColumn(index)} className="w-full">
                        <Plus className="h-3 w-3" /> Add Column
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <Button type="button" variant="secondary" size="sm" onClick={() => addField()} className="w-full">
                <Plus className="h-3 w-3" /> Add Field
              </Button>
              <Button type="button" variant="gold" size="sm" onClick={() => addField(emptyItemsField)} className="w-full">
                <Plus className="h-3 w-3" /> Add Item List
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </PageTransition>
  )
}
