import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
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

const emptyForm = { code: '', title: '', status: 'active' }

export default function PolicyTypes() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [types, setTypes] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const { addToast } = useToast()
  const pageSize = 10

  const fetchTypes = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/policy-types', {
        params: { page, per_page: pageSize, search: search || undefined },
      })
      setTypes(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setTypes([])
      addToast('Failed to load policy types', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchTypes, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search])

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setModalOpen(true)
  }

  const openEdit = (type) => {
    setEditing(type)
    setForm({
      code: type.code || '',
      title: type.title || '',
      status: type.status || 'active',
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.code.trim() || !form.title.trim()) {
      addToast('Code and title are required', 'error')
      return
    }

    setSaving(true)
    try {
      if (editing) {
        await api.put(`/policy-types/${editing.id}`, form)
        addToast('Policy type updated', 'success')
      } else {
        await api.post('/policy-types', form)
        addToast('Policy type created', 'success')
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditing(null)
      fetchTypes()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save policy type', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type) => {
    if (!window.confirm(`Delete policy type "${type.title}"?`)) return

    try {
      await api.delete(`/policy-types/${type.id}`)
      addToast('Policy type deleted', 'success')
      fetchTypes()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete policy type', 'error')
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Policy Types"
        subtitle="Manage policy categories used when creating policies"
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Policy Type
          </Button>
        }
      />

      <Card>
        <div className="mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by code or title..."
            className="max-w-sm"
          />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <LoadingSpinner label="Loading policy types..." />
          </div>
        ) : types.length === 0 ? (
          <EmptyState
            title="No policy types found"
            description="Create a policy type to use in the policy form."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Policies</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => (
                  <TableRow key={type.id}>
                    <TableCell><span className="font-mono text-gold-600">{type.code}</span></TableCell>
                    <TableCell className="font-medium text-[var(--text-primary)]">{type.title}</TableCell>
                    <TableCell>{type.policies_count ?? 0}</TableCell>
                    <TableCell>
                      <Badge variant={type.status === 'active' ? 'success' : 'default'} dot>
                        {type.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEdit(type)}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-gold-600 hover:bg-gold-600/10 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(type)}
                          className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
        title={editing ? 'Edit Policy Type' : 'Add Policy Type'}
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
          <Input
            label="Code"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. HR"
            required
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Human Resources"
            required
          />
          <Select
            label="Status"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
            options={['active', 'inactive']}
          />
        </div>
      </Modal>
    </PageTransition>
  )
}
