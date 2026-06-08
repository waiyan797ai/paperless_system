import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function UserForm() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const [departments, setDepartments] = useState([])
  const [sections, setSections] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState({
    name: '',
    email: '',
    employee_id: '',
    phone: '',
    department_id: '',
    section_id: '',
    position: '',
    role_id: '',
    status: 'active',
    password: '',
  })

  useEffect(() => {
    api.get('/departments', { params: { per_page: 100 } })
      .then(({ data }) => setDepartments(data.data?.data || []))
      .catch(() => {})

    api.get('/roles-permissions')
      .then(({ data }) => setRoles(data.data?.roles || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!form.department_id) {
      setSections([])
      return
    }
    api.get('/sections', { params: { department_id: form.department_id, per_page: 100 } })
      .then(({ data }) => setSections(data.data?.data || []))
      .catch(() => setSections([]))
  }, [form.department_id])

  useEffect(() => {
    if (!isEdit) return
    setLoading(true)
    api.get(`/users/${id}`)
      .then(({ data }) => {
        const user = data.data
        setForm({
          name: user.name || '',
          email: user.email || '',
          employee_id: user.employee_id || '',
          phone: user.phone || '',
          department_id: user.department_id ? String(user.department_id) : '',
          section_id: user.section_id ? String(user.section_id) : '',
          position: user.position || '',
          role_id: user.role_id ? String(user.role_id) : '',
          status: user.status || 'active',
          password: '',
        })
      })
      .catch(() => {
        addToast('User not found', 'error')
        navigate('/users')
      })
      .finally(() => setLoading(false))
  }, [id, isEdit, navigate, addToast])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email,
        employee_id: form.employee_id || null,
        phone: form.phone || null,
        department_id: form.department_id ? Number(form.department_id) : null,
        section_id: form.section_id ? Number(form.section_id) : null,
        position: form.position || null,
        role_id: Number(form.role_id),
        status: form.status,
      }
      if (!isEdit) {
        payload.password = form.password
        await api.post('/users', payload)
        addToast('User created', 'success')
      } else {
        await api.put(`/users/${id}`, payload)
        addToast('User updated', 'success')
      }
      navigate('/users')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save user', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><LoadingSpinner label="Loading user..." /></div>
  }

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))
  const sectionOptions = sections.map((s) => ({ value: String(s.id), label: s.name }))
  const roleOptions = roles.map((r) => ({ value: String(r.id), label: r.display_name }))

  return (
    <PageTransition>
      <button onClick={() => navigate('/users')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to Users
      </button>
      <PageHeader title={isEdit ? 'Edit User' : 'Add User'} subtitle={isEdit ? 'Update user details' : 'Create a new system user'} />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Full Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Employee ID" value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select
              label="Department"
              value={form.department_id}
              onChange={(e) => setForm({ ...form, department_id: e.target.value, section_id: '' })}
              options={deptOptions}
              placeholder="Select department..."
            />
            <Select
              label="Section"
              value={form.section_id}
              onChange={(e) => setForm({ ...form, section_id: e.target.value })}
              options={sectionOptions}
              placeholder={form.department_id ? 'Select section...' : 'Select department first'}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Input label="Position" value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} />
            <Select
              label="Role"
              value={form.role_id}
              onChange={(e) => setForm({ ...form, role_id: e.target.value })}
              options={roleOptions}
              placeholder="Select role..."
              required
            />
          </div>
          {isEdit && (
            <Select
              label="Status"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'inactive', label: 'Inactive' },
                { value: 'suspended', label: 'Suspended' },
              ]}
            />
          )}
          {!isEdit && (
            <Input
              label="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              hint="Minimum 8 characters"
              required
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="gold" loading={saving}>{isEdit ? 'Update User' : 'Create User'}</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/users')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageTransition>
  )
}
