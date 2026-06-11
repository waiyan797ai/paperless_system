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
import { avatarUrl } from '../../lib/auth'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../hooks/useAuth'
import { getStatusColor } from '../../lib/utils'

export default function Users() {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [departments, setDepartments] = useState([])
  const [sections, setSections] = useState([])
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user: currentUser } = useAuth()
  const pageSize = 10

  const hasFilters = Boolean(roleFilter || departmentFilter || sectionFilter || statusFilter)

  useEffect(() => {
    Promise.all([
      api.get('/roles-permissions'),
      api.get('/departments', { params: { per_page: 100 } }),
    ]).then(([rolesRes, deptRes]) => {
      setRoles(rolesRes.data.data?.roles || [])
      setDepartments(deptRes.data.data?.data || deptRes.data.data || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!departmentFilter) {
      setSections([])
      return
    }
    api.get('/sections', { params: { department_id: departmentFilter, per_page: 100 } })
      .then(({ data }) => setSections(data.data?.data || data.data || []))
      .catch(() => setSections([]))
  }, [departmentFilter])

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const { data } = await api.get('/users', {
          params: {
            page,
            per_page: pageSize,
            search: search || undefined,
            role_id: roleFilter || undefined,
            department_id: departmentFilter || undefined,
            section_id: sectionFilter || undefined,
            status: statusFilter || undefined,
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
    const timer = setTimeout(fetchUsers, search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [page, search, roleFilter, departmentFilter, sectionFilter, statusFilter, addToast])

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
      addToast('You cannot delete your own account', 'error')
      return
    }

    if (!window.confirm(`Delete user "${user.name}"? This cannot be undone.`)) return

    try {
      await api.delete(`/users/${user.id}`)
      addToast('User deleted', 'success')
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setTotalItems((prev) => Math.max(0, prev - 1))
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete user', 'error')
    }
  }

  const clearFilters = () => {
    setRoleFilter('')
    setDepartmentFilter('')
    setSectionFilter('')
    setStatusFilter('')
    setPage(1)
  }

  const handleDepartmentChange = (deptId) => {
    setDepartmentFilter(deptId)
    setSectionFilter('')
    setPage(1)
  }

  const roleOptions = roles.map((r) => ({ value: String(r.id), label: r.display_name }))
  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }))
  const sectionOptions = sections.map((s) => ({ value: String(s.id), label: s.name }))

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
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search users..."
            className="min-w-[160px] w-[200px] shrink-0"
          />
          <Select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
            options={roleOptions}
            placeholder="All Roles"
            className="w-[130px] shrink-0"
          />
          <Select
            value={departmentFilter}
            onChange={(e) => handleDepartmentChange(e.target.value)}
            options={deptOptions}
            placeholder="All Departments"
            className="w-[160px] shrink-0"
          />
          <Select
            value={sectionFilter}
            onChange={(e) => { setSectionFilter(e.target.value); setPage(1) }}
            options={sectionOptions}
            placeholder={departmentFilter ? 'All Sections' : 'Dept first'}
            disabled={!departmentFilter}
            className="w-[140px] shrink-0"
          />
          <Select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
            ]}
            placeholder="All Status"
            className="w-[130px] shrink-0"
          />
          {hasFilters && (
            <Button type="button" variant="secondary" size="sm" onClick={clearFilters} className="shrink-0">
              Clear
            </Button>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading users..." /></div>
        ) : users.length === 0 ? (
          <EmptyState
            title={hasFilters || search ? 'No matching users' : 'No users found'}
            description={hasFilters || search ? 'Try adjusting your search or filters.' : 'Add a user to get started.'}
          />
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
                        <Avatar name={user.name} src={avatarUrl(user.avatar)} size="sm" />
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
                    <TableCell><Badge variant={getStatusColor(user.status)} dot>{user.status}</Badge></TableCell>
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
