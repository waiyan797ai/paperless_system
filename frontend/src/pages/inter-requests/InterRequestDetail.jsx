import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { mockInterRequests } from '../../lib/mockData'
import { formatDate, getStatusColor } from '../../lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

export default function InterRequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const request = mockInterRequests.find((r) => r.id === id) || mockInterRequests[0]
  const canApprove = user?.role === 'approver' || user?.role === 'admin' || user?.role === 'department'

  return (
    <PageTransition>
      <button onClick={() => navigate('/inter-requests')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title={request.title} subtitle={request.id} actions={canApprove && request.status === 'pending' && (
        <div className="flex gap-2">
          <Button variant="gold" onClick={() => { addToast('Approved', 'success'); navigate('/inter-requests') }}><CheckCircle className="h-4 w-4" /> Approve</Button>
          <Button variant="danger" onClick={() => { addToast('Rejected', 'info'); navigate('/inter-requests') }}><XCircle className="h-4 w-4" /> Reject</Button>
        </div>
      )} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardTitle className="mb-4">Request Details</CardTitle>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] mb-6">
            <div className="text-center flex-1">
              <p className="text-xs text-[var(--text-muted)] uppercase">From</p>
              <p className="font-semibold text-[var(--text-primary)] mt-1">{request.fromDept}</p>
            </div>
            <ArrowLeftRight className="h-6 w-6 text-gold-600 shrink-0" />
            <div className="text-center flex-1">
              <p className="text-xs text-[var(--text-muted)] uppercase">To</p>
              <p className="font-semibold text-[var(--text-primary)] mt-1">{request.toDept}</p>
            </div>
          </div>
          <p className="text-[var(--text-secondary)] leading-relaxed">
            Cross-department request for resource sharing and personnel coordination between departments.
          </p>
        </Card>
        <Card>
          <Badge variant={getStatusColor(request.status)} dot className="mb-4">{request.status}</Badge>
          <div className="space-y-3 text-sm">
            <div><p className="text-[var(--text-muted)]">Requester</p><p className="font-medium">{request.requester}</p></div>
            <div><p className="text-[var(--text-muted)]">Created</p><p className="font-medium">{formatDate(request.createdAt)}</p></div>
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
