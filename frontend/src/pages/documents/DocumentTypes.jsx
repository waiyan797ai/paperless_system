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

export default function DocumentTypes() {
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
      const { data } = await api.get('/document-types', {
        params: { page, per_page: pageSize, search: search || undefined },
      })
      setTypes(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setTypes([])
      addToast('Failed to load document types', 'error')
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
        await api.put(`/document-types/${editing.id}`, form)
        addToast('Document type updated', 'success')
      } else {
        await api.post('/document-types', form)
        addToast('Document type created', 'success')
      }
      setModalOpen(false)
      setForm(emptyForm)
      setEditing(null)
      fetchTypes()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save document type', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (type) => {
    if ((type.documents_count ?? 0) > 0) {
      addToast('Cannot delete a document type that is already in use', 'error')
      return
    }
    if (!window.confirm(`Delete document type "${type.title}"?`)) return

    try {
      await api.delete(`/document-types/${type.id}`)
      addToast('Document type deleted', 'success')
      fetchTypes()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete document type', 'error')
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Document Types"
        subtitle="Manage document categories used when distributing documents"
        actions={
          <Button variant="gold" onClick={openCreate}>
            <Plus className="h-4 w-4" /> Add Document Type
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
            <LoadingSpinner label="Loading document types..." />
          </div>
        ) : types.length === 0 ? (
          <EmptyState
            title="No document types found"
            description="Create a document type to use in the distribution form."
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Documents</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-28">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((type) => {
                  const inUse = (type.documents_count ?? 0) > 0
                  return (
                    <TableRow key={type.id}>
                      <TableCell><span className="font-mono text-gold-600">{type.code}</span></TableCell>
                      <TableCell className="font-medium text-[var(--text-primary)]">{type.title}</TableCell>
                      <TableCell>{type.documents_count ?? 0}</TableCell>
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
                          {!inUse && (
                            <button
                              onClick={() => handleDelete(type)}
                              className="p-2 rounded-lg text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
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
        title={editing ? 'Edit Document Type' : 'Add Document Type'}
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
            placeholder="e.g. REPORT"
            required
          />
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. Report"
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
