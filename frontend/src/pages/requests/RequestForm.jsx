import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, X, Paperclip, Upload } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import SearchableSelect from '../../components/ui/SearchableSelect'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

function ItemColumnInput({ column, value, onChange }) {
  if (column.type === 'select') {
    return (
      <Select
        label={column.label}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        options={(column.options || []).map((o) => ({ value: o, label: o }))}
        placeholder={`Select ${column.label}`}
        required={column.required}
      />
    )
  }

  return (
    <Input
      label={column.label}
      type={column.type === 'number' ? 'number' : column.type === 'date' ? 'date' : 'text'}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      required={column.required}
    />
  )
}

function ItemsField({ field, value, onChange }) {
  const rows = Array.isArray(value) ? value : []
  const columns = field.columns || []

  const emptyRow = () => {
    const row = {}
    columns.forEach((c) => { row[c.name] = '' })
    return row
  }

  const addRow = () => onChange([...rows, emptyRow()])

  const removeRow = (index) => onChange(rows.filter((_, i) => i !== index))

  const updateCell = (rowIndex, colName, val) => {
    onChange(rows.map((row, i) => (i === rowIndex ? { ...row, [colName]: val } : row)))
  }

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
        {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {rows.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] mb-3">No items yet. Click &quot;Add Item&quot; to start.</p>
      ) : (
        <div className="space-y-3 mb-3">
          {rows.map((row, rowIndex) => (
            <div key={rowIndex} className="p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs font-medium text-[var(--text-muted)]">Item {rowIndex + 1}</span>
                <button type="button" onClick={() => removeRow(rowIndex)} className="text-[var(--text-muted)] hover:text-red-500">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {columns.map((col) => (
                  <ItemColumnInput
                    key={col.name}
                    column={col}
                    value={row[col.name]}
                    onChange={(val) => updateCell(rowIndex, col.name, val)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Button type="button" variant="secondary" size="sm" onClick={addRow}>
        <Plus className="h-3 w-3" /> Add Item
      </Button>
    </div>
  )
}

function DynamicField({ field, value, onChange }) {
  if (field.type === 'items') {
    return <ItemsField field={field} value={value} onChange={onChange} />
  }
  const common = {
    label: field.label,
    value: value || '',
    onChange: (e) => onChange(e.target.value),
    required: field.required,
  }

  if (field.type === 'textarea') {
    return (
      <div>
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {field.label}{field.required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          required={field.required}
          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm resize-y"
        />
      </div>
    )
  }

  if (field.type === 'select') {
    return (
      <Select
        {...common}
        options={(field.options || []).map((o) => ({ value: o, label: o }))}
        placeholder={`Select ${field.label}`}
      />
    )
  }

  return <Input {...common} type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'} />
}

export default function RequestForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(isEdit)
  const [templates, setTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [targetDepartmentId, setTargetDepartmentId] = useState('')
  const [targetSectionId, setTargetSectionId] = useState('')
  const [sections, setSections] = useState([])
  const [formData, setFormData] = useState({})
  const [requestStatus, setRequestStatus] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [attachments, setAttachments] = useState([])
  const [uploading, setUploading] = useState(false)

  const selectedTemplate = templates.find((t) => String(t.id) === String(selectedTemplateId))

  useEffect(() => {
    Promise.all([
      api.get('/form-templates', { params: { for_select: 1 } }),
      api.get('/departments', { params: { per_page: 100 } }),
    ]).then(([templatesRes, deptRes]) => {
      setTemplates(templatesRes.data.data || [])
      setDepartments(deptRes.data.data?.data || deptRes.data.data || [])
    }).catch(() => addToast('Failed to load form data', 'error'))
  }, [addToast])

  useEffect(() => {
    if (!isEdit) return
    api.get(`/form-requests/${id}`)
      .then(({ data }) => {
        const req = data.data
        setSelectedTemplateId(String(req.form_template_id || ''))
        setTargetDepartmentId(String(req.target_department_id || ''))
        setTargetSectionId(req.target_section_id ? String(req.target_section_id) : '')
        setFormData(req.data || {})
        setRequestStatus(req.status)
        setAttachments(req.attachments || [])
      })
      .catch(() => {
        addToast('Failed to load request', 'error')
        navigate('/requests')
      })
      .finally(() => setFetching(false))
  }, [id, isEdit, navigate, addToast])

  useEffect(() => {
    if (!targetDepartmentId) {
      setSections([])
      return
    }
    api.get('/sections', { params: { department_id: targetDepartmentId, per_page: 100 } })
      .then(({ data }) => setSections(data.data?.data || data.data || []))
      .catch(() => setSections([]))
  }, [targetDepartmentId])

  useEffect(() => {
    if (isEdit || !selectedTemplate) return
    if (selectedTemplate.target_department_id) {
      setTargetDepartmentId(String(selectedTemplate.target_department_id))
    }
    if (selectedTemplate.target_section_id) {
      setTargetSectionId(String(selectedTemplate.target_section_id))
    } else {
      setTargetSectionId('')
    }
    const initial = {}
    selectedTemplate.fields?.forEach((f) => {
      initial[f.name] = f.type === 'items' ? [] : ''
    })
    setFormData(initial)
  }, [selectedTemplateId, selectedTemplate, isEdit])

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this draft request? This cannot be undone.')) return

    setDeleting(true)
    try {
      await api.delete(`/form-requests/${id}`)
      addToast('Draft deleted', 'success')
      navigate('/requests')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete draft', 'error')
    } finally {
      setDeleting(false)
    }
  }

  const saveRequest = async (submitAfter = false) => {
    if (!selectedTemplateId || !targetDepartmentId) {
      addToast('Please select form and target department', 'error')
      return
    }

    for (const field of selectedTemplate?.fields || []) {
      if (field.type !== 'items' || !field.required) continue
      const rows = formData[field.name]
      if (!Array.isArray(rows) || rows.length === 0) {
        addToast(`${field.label} must have at least one item`, 'error')
        return
      }
    }

    setLoading(true)
    try {
      let requestId = id

      if (isEdit) {
        await api.put(`/form-requests/${id}`, {
          target_department_id: targetDepartmentId,
          target_section_id: targetDepartmentId && targetSectionId ? targetSectionId : null,
          data: formData,
        })
      } else {
        const { data } = await api.post('/form-requests', {
          form_template_id: selectedTemplateId,
          target_department_id: targetDepartmentId,
          target_section_id: targetDepartmentId && targetSectionId ? targetSectionId : null,
          data: formData,
        })
        requestId = data.data.id
      }

      if (submitAfter) {
        await api.post(`/form-requests/${requestId}/submit`)
        addToast('Request submitted successfully', 'success')
      } else {
        addToast(isEdit ? 'Request updated' : 'Draft saved', 'success')
      }

      navigate('/requests')
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors ? Object.values(errors).flat()[0] : null
      addToast(firstError || err.response?.data?.message || 'Failed to save request', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    if (!files.length) return

    let requestId = id
    if (!requestId) {
      if (!selectedTemplateId || !targetDepartmentId) {
        addToast('Please select form and target department first', 'error')
        return
      }
      try {
        const { data } = await api.post('/form-requests', {
          form_template_id: selectedTemplateId,
          target_department_id: targetDepartmentId,
          target_section_id: targetDepartmentId && targetSectionId ? targetSectionId : null,
          data: formData,
        })
        requestId = data.data.id
        navigate(`/requests/${requestId}/edit`, { replace: true })
      } catch (err) {
        addToast(err.response?.data?.message || 'Failed to save draft before uploading', 'error')
        return
      }
    }

    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const { data } = await api.post(`/form-requests/${requestId}/attachments`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        setAttachments((prev) => [data.data, ...prev])
      }
      addToast('File uploaded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload file', 'error')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const handleDeleteAttachment = async (attachmentId) => {
    try {
      await api.delete(`/form-requests/${id}/attachments/${attachmentId}`)
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId))
      addToast('Attachment removed', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete attachment', 'error')
    }
  }

  if (fetching) {
    return <div className="py-12 flex justify-center"><LoadingSpinner label="Loading request..." /></div>
  }

  const templateOptions = templates.map((t) => ({
    value: String(t.id),
    label: `${t.code} — ${t.title}`,
    keywords: t.code,
  }))

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))
  const sectionOptions = sections.map((s) => ({ value: String(s.id), label: s.name }))
  const canDelete = isEdit && requestStatus === 'draft'
  const sectionLocked = !!selectedTemplate?.target_section_id && !isEdit

  const handleDepartmentChange = (deptId) => {
    setTargetDepartmentId(deptId)
    setTargetSectionId('')
  }

  return (
    <PageTransition>
      <button onClick={() => navigate('/requests')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Requests
      </button>
      <PageHeader title={isEdit ? 'Edit Request' : 'New Request'} subtitle="Select a form template and fill in the fields" />
      <Card className="max-w-2xl">
        {!isEdit && templates.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            No active form templates available. Ask your administrator to create form templates first.
          </p>
        ) : (
        <form onSubmit={(e) => { e.preventDefault(); saveRequest(true) }} className="space-y-5">
          {!isEdit && (
            <SearchableSelect
              label="Form Code"
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              options={templateOptions}
              placeholder="Select form template..."
              searchPlaceholder="Search by code or title..."
              required
            />
          )}

          {isEdit && selectedTemplate && (
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <p className="text-sm text-[var(--text-muted)]">Form</p>
              <p className="font-medium">{selectedTemplate.code} — {selectedTemplate.title}</p>
            </div>
          )}

          <Select
            label="Target Department"
            value={targetDepartmentId}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            options={deptOptions}
            placeholder="Select department..."
            required
            disabled={!!selectedTemplate?.target_department_id && !isEdit}
          />

          <Select
            label="Target Section (optional)"
            value={targetSectionId}
            onChange={(e) => setTargetSectionId(e.target.value)}
            options={sectionOptions}
            placeholder={targetDepartmentId ? 'Any section' : 'Select department first'}
            disabled={!targetDepartmentId || sectionLocked}
          />

          {selectedTemplate?.fields?.map((field) => (
            <DynamicField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(val) => updateField(field.name, val)}
            />
          ))}

          {selectedTemplate && selectedTemplate.attachment_type !== 'none' && (
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                <Paperclip className="h-4 w-4 inline mr-1" />
                Attachments {selectedTemplate.attachment_type === 'single' ? '(1 file)' : '(multiple files)'}
              </label>
              {attachments.length > 0 && (
                <div className="space-y-2 mb-3">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center justify-between p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                      <div className="flex items-center gap-2 min-w-0">
                        <Paperclip className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                        <span className="text-sm truncate">{att.file_name}</span>
                        <span className="text-xs text-[var(--text-muted)] shrink-0">{(att.file_size / 1024).toFixed(0)} KB</span>
                      </div>
                      <button type="button" onClick={() => handleDeleteAttachment(att.id)} className="text-[var(--text-muted)] hover:text-red-500 shrink-0 ml-2">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(selectedTemplate.attachment_type === 'multiple' || attachments.length === 0) && (
                <label className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-[var(--border-color)] hover:border-gold-500 cursor-pointer transition-colors">
                  <Upload className="h-4 w-4 text-[var(--text-muted)]" />
                  <span className="text-sm text-[var(--text-muted)]">{uploading ? 'Uploading...' : 'Click to upload file'}</span>
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} multiple={selectedTemplate.attachment_type === 'multiple'} />
                </label>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="submit" variant="gold" loading={loading}>Submit Request</Button>
            <Button type="button" variant="secondary" loading={loading} onClick={() => saveRequest(false)}>
              {isEdit ? 'Save Draft' : 'Save as Draft'}
            </Button>
            {canDelete && (
              <Button type="button" variant="danger" loading={deleting} onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Delete Draft
              </Button>
            )}
            <Button type="button" variant="secondary" onClick={() => navigate('/requests')}>Cancel</Button>
          </div>
        </form>
        )}
      </Card>
    </PageTransition>
  )
}
