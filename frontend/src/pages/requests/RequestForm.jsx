import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import SearchableSelect from '../../components/ui/SearchableSelect'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

function DynamicField({ field, value, onChange }) {
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
  const [formData, setFormData] = useState({})

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
        setFormData(req.data || {})
      })
      .catch(() => {
        addToast('Failed to load request', 'error')
        navigate('/requests')
      })
      .finally(() => setFetching(false))
  }, [id, isEdit, navigate, addToast])

  useEffect(() => {
    if (isEdit || !selectedTemplate) return
    if (selectedTemplate.target_department_id) {
      setTargetDepartmentId(String(selectedTemplate.target_department_id))
    }
    const initial = {}
    selectedTemplate.fields?.forEach((f) => { initial[f.name] = '' })
    setFormData(initial)
  }, [selectedTemplateId, selectedTemplate, isEdit])

  const updateField = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const saveRequest = async (submitAfter = false) => {
    if (!selectedTemplateId || !targetDepartmentId) {
      addToast('Please select form and target department', 'error')
      return
    }

    setLoading(true)
    try {
      let requestId = id

      if (isEdit) {
        await api.put(`/form-requests/${id}`, {
          target_department_id: targetDepartmentId,
          data: formData,
        })
      } else {
        const { data } = await api.post('/form-requests', {
          form_template_id: selectedTemplateId,
          target_department_id: targetDepartmentId,
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

  if (fetching) {
    return <div className="py-12 flex justify-center"><LoadingSpinner label="Loading request..." /></div>
  }

  const templateOptions = templates.map((t) => ({
    value: String(t.id),
    label: `${t.code} — ${t.title}`,
    keywords: t.code,
  }))

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))

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
            onChange={(e) => setTargetDepartmentId(e.target.value)}
            options={deptOptions}
            placeholder="Select department..."
            required
            disabled={!!selectedTemplate?.target_department_id && !isEdit}
          />

          {selectedTemplate?.fields?.map((field) => (
            <DynamicField
              key={field.name}
              field={field}
              value={formData[field.name]}
              onChange={(val) => updateField(field.name, val)}
            />
          ))}

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="gold" loading={loading}>Submit Request</Button>
            <Button type="button" variant="secondary" loading={loading} onClick={() => saveRequest(false)}>
              {isEdit ? 'Save Draft' : 'Save as Draft'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/requests')}>Cancel</Button>
          </div>
        </form>
        )}
      </Card>
    </PageTransition>
  )
}
