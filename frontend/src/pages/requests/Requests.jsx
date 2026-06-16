import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Inbox, Send, UserCheck, CheckCircle, XCircle, Layers, ClipboardCheck, Users, FileEdit, Trash2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import api from '../../lib/api'
import { formatDate, getStatusColor } from '../../lib/utils'
import { hasPermission, isAdminLevel } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { useFormRequestCounts, useFormRequestsList, useInvalidateFormRequests } from '../../hooks/useFormRequests'
import { useToast } from '../../components/ui/Toast'

const allFolders = {
  drafts: { label: 'Drafts', icon: FileEdit, permission: 'form_requests.create' },
  outbox: { label: 'Outbox', icon: Send, permission: 'form_requests.create' },
  inbox: { label: 'Inbox', icon: Inbox, permission: 'form_requests.dept_inbox' },
  to_assign: { label: 'To Assign', icon: ClipboardCheck, permission: 'form_requests.assign' },
  section_inbox: { label: 'Section Inbox', icon: Layers, permission: 'form_requests.section_inbox' },
  assign: { label: 'Assigned to Me', icon: UserCheck, permission: 'form_requests.process' },
  cc: { label: 'CC', icon: Users, permission: 'form_requests.create' },
  approved: { label: 'Approved', icon: CheckCircle, permission: 'form_requests.create' },
  rejected: { label: 'Rejected', icon: XCircle, permission: 'form_requests.create' },
}

export default function Requests() {
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [formTemplateFilter, setFormTemplateFilter] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('')
  const [sectionFilter, setSectionFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formTemplates, setFormTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [sections, setSections] = useState([])
  const [activeTab, setActiveTab] = useState('drafts')
  const [page, setPage] = useState(1)
  const [deletingId, setDeletingId] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const invalidateFormRequests = useInvalidateFormRequests()
  const pageSize = 10

  const visibleFolders = useMemo(
    () => Object.entries(allFolders).filter(([, meta]) => hasPermission(user, meta.permission)),
    [user]
  )

  useEffect(() => {
    if (visibleFolders.length && !visibleFolders.find(([id]) => id === activeTab)) {
      setActiveTab(visibleFolders[0][0])
    }
  }, [visibleFolders, activeTab])

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), search ? 300 : 0)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    Promise.all([
      api.get('/form-templates', { params: { for_select: 1 } }),
      api.get('/departments', { params: { per_page: 100 } }),
    ]).then(([templatesRes, deptRes]) => {
      setFormTemplates(templatesRes.data.data || [])
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

  const hasFilters = Boolean(formTemplateFilter || departmentFilter || sectionFilter || dateFrom || dateTo)

  const { data: counts = {} } = useFormRequestCounts()
  const { data, isLoading, isFetching } = useFormRequestsList({
    folder: activeTab,
    page,
    search: debouncedSearch,
    formTemplateId: formTemplateFilter,
    departmentId: departmentFilter,
    sectionId: sectionFilter,
    dateFrom,
    dateTo,
    pageSize,
    enabled: Boolean(activeTab),
  })

  const clearFilters = () => {
    setFormTemplateFilter('')
    setDepartmentFilter('')
    setSectionFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  const handleDepartmentChange = (deptId) => {
    setDepartmentFilter(deptId)
    setSectionFilter('')
    setPage(1)
  }

  const requests = data?.items || []
  const totalPages = data?.totalPages || 1
  const totalItems = data?.totalItems || 0

  const tabs = visibleFolders.map(([id, meta]) => ({
    id,
    label: meta.label,
    icon: meta.icon,
    count: counts[id] ?? 0,
  }))

  const folderMeta = allFolders[activeTab]
  const canCreate = hasPermission(user, 'form_requests.create')

  const canDeleteRequest = (req) => {
    // Admins and Super Admins can delete at any time
    if (isAdminLevel(user)) return true
    // Creator can delete only if not approved yet
    return req.user_id === user?.id && req.status !== 'approved'
  }

  const handleDelete = async (e, req) => {
    e.stopPropagation()
    if (!window.confirm(`Delete request "${req.form_template?.title || req.title}"?`)) return

    setDeletingId(req.id)
    try {
      await api.delete(`/form-requests/${req.id}`)
      addToast('Request deleted', 'success')
      await invalidateFormRequests()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete request', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <PageTransition>
      <PageHeader
        title="Requests"
        subtitle="Submit and process workflow requests"
        actions={
          <div className="flex gap-2">
            {hasPermission(user, 'form_templates.manage') && (
              <Button variant="secondary" onClick={() => navigate('/form-templates')}>Form Templates</Button>
            )}
            {canCreate && (
              <Button variant="gold" onClick={() => navigate('/requests/new')}><Plus className="h-4 w-4" /> New Request</Button>
            )}
          </div>
        }
      />
      <Card>
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center gap-3 min-w-0">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1) }} className="min-w-0 flex-1" />
            {isFetching && !isLoading && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap shrink-0">Updating...</span>
            )}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <SearchInput
              value={search}
              onChange={(v) => { setSearch(v); setPage(1) }}
              placeholder="Search requests..."
              className="min-w-[140px] w-[180px] shrink-0"
            />
            <Select
              value={formTemplateFilter}
              onChange={(e) => { setFormTemplateFilter(e.target.value); setPage(1) }}
              options={formTemplates.map((t) => ({ value: String(t.id), label: `${t.code} — ${t.title}` }))}
              placeholder="All Forms"
              className="min-w-[140px] w-[160px] shrink-0"
            />
            <Select
              value={departmentFilter}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              options={departments.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder="All Departments"
              className="min-w-[130px] w-[150px] shrink-0"
            />
            <Select
              value={sectionFilter}
              onChange={(e) => { setSectionFilter(e.target.value); setPage(1) }}
              options={sections.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder={departmentFilter ? 'All Sections' : 'Department first'}
              disabled={!departmentFilter}
              className="min-w-[120px] w-[140px] shrink-0"
            />
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
              title="From Date"
              aria-label="From Date"
              className="min-w-[120px] w-[132px] shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
              title="To Date"
              aria-label="To Date"
              className="min-w-[120px] w-[132px] shrink-0 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            />
            {hasFilters && (
              <Button type="button" variant="secondary" size="sm" onClick={clearFilters} className="shrink-0">
                Clear
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading requests..." /></div>
        ) : requests.length === 0 ? (
          <EmptyState
            title={hasFilters || debouncedSearch ? 'No matching requests' : `No requests in ${folderMeta?.label || 'folder'}`}
            description={
              hasFilters || debouncedSearch
                ? 'Try adjusting your search or filters.'
                : canCreate
                  ? 'Create a new request to get started.'
                  : 'Try another folder.'
            }
            action={canCreate ? () => navigate('/requests/new') : undefined}
            actionLabel={canCreate ? 'New Request' : undefined}
          />
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reference</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Requester</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => {
                  const canDelete = canDeleteRequest(req)
                  return (
                    <TableRow key={req.id} onClick={() => navigate(canDelete && req.status === 'draft' ? `/requests/${req.id}/edit` : `/requests/${req.id}`)} className="cursor-pointer">
                      <TableCell><span className="font-mono text-gold-600 text-xs">{req.reference_no}</span></TableCell>
                      <TableCell className="font-medium">{req.form_template?.title || req.title}</TableCell>
                      <TableCell>{req.user?.name || '—'}</TableCell>
                      <TableCell>{req.target_department?.name || '—'}</TableCell>
                      <TableCell>{req.target_section?.name || '—'}</TableCell>
                      <TableCell>{req.assigned_to?.name || '—'}</TableCell>
                      <TableCell><Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge></TableCell>
                      <TableCell>{formatDate(req.submitted_at || req.created_at)}</TableCell>
                      <TableCell>
                        {canDelete && (
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, req)}
                            disabled={deletingId === req.id}
                            className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-500 disabled:opacity-50"
                            title="Delete request"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
          </>
        )}
      </Card>
    </PageTransition>
  )
}
