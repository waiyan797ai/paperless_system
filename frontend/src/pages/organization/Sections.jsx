import { useEffect, useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { name: '', code: '', department_id: '', description: '', status: 'active' }

export default function Sections() {
  const [search, setSearch] = useState('')
  const [deptFilter, setDeptFilter] = useState('')
  const [page, setPage] = useState(1)
  const [sections, setSections] = useState([])
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

  const fetchDepartments = () => {
    api.get('/departments', { params: { per_page: 100 } })
      .then(({ data }) => setDepartments(data.data?.data || []))
      .catch(() => {})
  }

  const fetchSections = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/sections', {
        params: {
          page,
          per_page: pageSize,
          search: search || undefined,
          department_id: deptFilter || undefined,
        },
      })
      setSections(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setSections([])
      addToast('Failed to load sections', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDepartments() }, [])

  useEffect(() => {
    const timer = setTimeout(fetchSections, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search, deptFilter])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm, department_id: deptFilter || '' })
    setModalOpen(true)
  }

  const openEdit = (section) => {
    setEditing(section)
    setForm({
      name: section.name || '',
      code: section.code || '',
      department_id: String(section.department_id || section.department?.id || ''),
      description: section.description || '',
      status: section.status || 'active',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim() || !form.department_id) {
      addToast('Name, code and department are required', 'error')
      return
    }

    setSaving(true)
    try {
      const payload = { ...form, department_id: Number(form.department_id) }
      if (editing) {
        await api.put(`/sections/${editing.id}`, payload)
        addToast('Section updated', 'success')
      } else {
        await api.post('/sections', payload)
        addToast('Section created', 'success')
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditing(null)
      fetchSections()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save section', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (section) => {
    if (!window.confirm(`Delete section "${section.name}"? This cannot be undone.`)) return

    try {
      await api.delete(`/sections/${section.id}`)
      addToast('Section deleted', 'success')
      fetchSections()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete section', 'error')
    }
  }

  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))

  return (
    <PageTransition>
      <PageHeader
        title="Sections"
        subtitle="Manage department sections"
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Section
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search sections..." className="max-w-sm" />
          <Select
            value={deptFilter}
            onChange={(e) => { setDeptFilter(e.target.value); setPage(1) }}
            options={deptOptions}
            placeholder="All Departments"
            className="max-w-xs"
          />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading sections..." /></div>
        ) : sections.length === 0 ? (
          <EmptyState title="No sections found" description="Create a section to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sections.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell><span className="font-mono text-gold-600">{s.code}</span></TableCell>
                    <TableCell className="font-medium text-[var(--text-primary)]">{s.name}</TableCell>
                    <TableCell>{s.department?.name || '—'}</TableCell>
                    <TableCell>{s.head?.name || '—'}</TableCell>
                    <TableCell>{s.users_count ?? 0}</TableCell>
                    <TableCell><Badge variant="success" dot>{s.status}</Badge></TableCell>
                    <TableCell>
                      <Dropdown trigger={<Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>}>
                        <DropdownItem icon={Pencil} onClick={() => openEdit(s)}>Edit</DropdownItem>
                        <DropdownItem icon={Trash2} danger onClick={() => handleDelete(s)}>Delete</DropdownItem>
                      </Dropdown>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              totalItems={totalItems}
              pageSize={pageSize}
            />
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Section' : 'Add Section'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="gold" onClick={handleSave} loading={saving}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Section Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          <Select
            label="Department"
            value={form.department_id}
            onChange={(e) => setForm({ ...form, department_id: e.target.value })}
            options={deptOptions}
            placeholder="Select department..."
            required
          />
          <Input label="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </Modal>
    </PageTransition>
  )
}
