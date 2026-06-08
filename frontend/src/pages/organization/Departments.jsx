import { useEffect, useState } from 'react'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

const emptyForm = { name: '', code: '', description: '', status: 'active' }

export default function Departments() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
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

  const fetchDepartments = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/departments', {
        params: { page, per_page: pageSize, search: search || undefined },
      })
      setDepartments(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setDepartments([])
      addToast('Failed to load departments', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchDepartments, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (dept) => {
    setEditing(dept)
    setForm({
      name: dept.name || '',
      code: dept.code || '',
      description: dept.description || '',
      status: dept.status || 'active',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.code.trim()) {
      addToast('Name and code are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await api.put(`/departments/${editing.id}`, form)
        addToast('Department updated', 'success')
      } else {
        await api.post('/departments', form)
        addToast('Department created', 'success')
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditing(null)
      fetchDepartments()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save department', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (dept) => {
    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return

    try {
      await api.delete(`/departments/${dept.id}`)
      addToast('Department deleted', 'success')
      fetchDepartments()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete department', 'error')
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Departments"
        subtitle="Manage organizational departments"
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Department
          </Button>
        }
      />
      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search departments..."
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading departments..." /></div>
        ) : departments.length === 0 ? (
          <EmptyState title="No departments found" description="Create a department to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Head</TableHead>
                  <TableHead>Sections</TableHead>
                  <TableHead>Employees</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell><span className="font-mono text-gold-600">{dept.code}</span></TableCell>
                    <TableCell className="font-medium text-[var(--text-primary)]">{dept.name}</TableCell>
                    <TableCell>{dept.head?.name || '—'}</TableCell>
                    <TableCell>{dept.sections_count ?? 0}</TableCell>
                    <TableCell>{dept.users_count ?? 0}</TableCell>
                    <TableCell><Badge variant="success" dot>{dept.status}</Badge></TableCell>
                    <TableCell>
                      <Dropdown trigger={<Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>}>
                        <DropdownItem icon={Pencil} onClick={() => openEdit(dept)}>Edit</DropdownItem>
                        <DropdownItem icon={Trash2} danger onClick={() => handleDelete(dept)}>Delete</DropdownItem>
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
        title={editing ? 'Edit Department' : 'Add Department'}
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
          <Input label="Department Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Input label="Code" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. FIN" required />
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
