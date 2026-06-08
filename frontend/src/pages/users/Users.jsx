import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import Dropdown, { DropdownItem } from '../../components/ui/Dropdown'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../hooks/useAuth'

export default function Users() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()
  const pageSize = 10

  const fetchRoles = () => {
    api.get('/roles-permissions')
      .then(({ data }) => setRoles(data.data?.roles || []))
      .catch(() => {})
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/users', {
        params: {
          page,
          per_page: pageSize,
          search: search || undefined,
          role_id: roleFilter || undefined,
        },
      })
      setUsers(data.data?.data || [])
      setTotalPages(data.data?.last_page || 1)
      setTotalItems(data.data?.total || 0)
    } catch {
      setUsers([])
      addToast('Failed to load users', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoles() }, [])

  useEffect(() => {
    const timer = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search, roleFilter])

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      addToast('You cannot delete your own account', 'error')
      return
    }

    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return

    try {
      await api.delete(`/users/${user.id}`)
      addToast('User deleted', 'success')
      fetchUsers()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete user', 'error')
    }
  }

  const roleOptions = roles.map((r) => ({ value: String(r.id), label: r.display_name }))

  return (
    <PageTransition>
      <PageHeader
        title="Users"
        subtitle="Manage system users and roles"
        actions={
          <Button variant="gold" onClick={() => navigate('/users/new')}>
            <Plus className="h-4 w-4" /> Add User
          </Button>
        }
      />
      <Card>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search users..." className="max-w-sm" />
          <Select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            options={roleOptions}
            placeholder="All Roles"
            className="max-w-xs"
          />
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading users..." /></div>
        ) : users.length === 0 ? (
          <EmptyState title="No users found" description="Add a user to get started." />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} size="sm" />
                        <span className="font-medium text-[var(--text-primary)]">{user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.department?.name || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="gold" className="capitalize">
                        {user.role?.display_name || user.role?.name || '—'}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="success" dot>{user.status}</Badge></TableCell>
                    <TableCell>
                      <Dropdown trigger={<Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>}>
                        <DropdownItem icon={Pencil} onClick={() => navigate(`/users/${user.id}/edit`)}>Edit</DropdownItem>
                        <DropdownItem icon={Trash2} danger onClick={() => handleDelete(user)}>Delete</DropdownItem>
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
    </PageTransition>
  )
}
