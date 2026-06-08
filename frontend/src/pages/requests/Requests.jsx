import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Inbox, Send, UserCheck, CheckCircle, XCircle, Layers, ClipboardCheck, Users } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import SearchInput from '../../components/ui/SearchInput'
import Badge from '../../components/ui/Badge'
import Tabs from '../../components/ui/Tabs'
import Table, { TableHeader, TableBody, TableRow, TableHead, TableCell, TablePagination } from '../../components/ui/Table'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import EmptyState from '../../components/ui/EmptyState'
import { formatDate, getStatusColor } from '../../lib/utils'
import { hasPermission } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { useFormRequestCounts, useFormRequestsList } from '../../hooks/useFormRequests'

const allFolders = {
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
  const [activeTab, setActiveTab] = useState('outbox')
  const [page, setPage] = useState(1)
  const navigate = useNavigate()
  const { user } = useAuth()
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

  const { data: counts = {} } = useFormRequestCounts()
  const { data, isLoading, isFetching } = useFormRequestsList({
    folder: activeTab,
    page,
    search: debouncedSearch,
    pageSize,
    enabled: Boolean(activeTab),
  })

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
          <div className="flex items-center justify-between gap-3">
            <Tabs tabs={tabs} activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setPage(1) }} />
            {isFetching && !isLoading && (
              <span className="text-xs text-[var(--text-muted)] whitespace-nowrap">Updating...</span>
            )}
          </div>
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search requests..." className="max-w-sm" />
        </div>

        {isLoading ? (
          <div className="py-12 flex justify-center"><LoadingSpinner label="Loading requests..." /></div>
        ) : requests.length === 0 ? (
          <EmptyState
            title={`No requests in ${folderMeta?.label || 'folder'}`}
            description={canCreate ? 'Create a new request to get started.' : 'Try another folder.'}
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
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((req) => (
                  <TableRow key={req.id} onClick={() => navigate(`/requests/${req.id}`)} className="cursor-pointer">
                    <TableCell><span className="font-mono text-gold-600 text-xs">{req.reference_no}</span></TableCell>
                    <TableCell className="font-medium">{req.form_template?.title || req.title}</TableCell>
                    <TableCell>{req.user?.name || '—'}</TableCell>
                    <TableCell>{req.target_department?.name || '—'}</TableCell>
                    <TableCell>{req.target_section?.name || '—'}</TableCell>
                    <TableCell>{req.assigned_to?.name || '—'}</TableCell>
                    <TableCell><Badge variant={getStatusColor(req.status)} dot>{req.status}</Badge></TableCell>
                    <TableCell>{formatDate(req.submitted_at || req.created_at)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} totalItems={totalItems} pageSize={pageSize} />
          </>
        )}
      </Card>
    </PageTransition>
  )
}
