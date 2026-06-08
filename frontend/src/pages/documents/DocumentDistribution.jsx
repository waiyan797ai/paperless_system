import { useState } from 'react'
import { Send, Users, Building2 } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Select from '../../components/ui/Select'
import Badge from '../../components/ui/Badge'
import Avatar from '../../components/ui/Avatar'
import { mockDocuments, mockDepartments, mockUsers } from '../../lib/mockData'
import { useToast } from '../../components/ui/Toast'

export default function DocumentDistribution() {
  const [selectedDoc, setSelectedDoc] = useState('')
  const [targetType, setTargetType] = useState('department')
  const [target, setTarget] = useState('')
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const recentDistributions = [
    { doc: 'Q2 Financial Report', target: 'Finance Department', recipients: 45, date: '2026-06-02', status: 'completed' },
    { doc: 'Safety Protocol Manual', target: 'All Departments', recipients: 153, date: '2026-05-20', status: 'completed' },
    { doc: 'Employee Handbook 2026', target: 'HR Section', recipients: 18, date: '2026-06-06', status: 'pending' },
  ]

  const handleDistribute = async () => {
    if (!selectedDoc || !target) {
      addToast('Please select document and target', 'warning')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 1000))
    addToast('Document distributed successfully', 'success')
    setLoading(false)
  }

  return (
    <PageTransition>
      <PageHeader title="Document Distribution" subtitle="Distribute documents to departments and users" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardTitle className="mb-6">New Distribution</CardTitle>
          <div className="space-y-5">
            <Select label="Select Document" value={selectedDoc} onChange={(e) => setSelectedDoc(e.target.value)} options={mockDocuments.map((d) => ({ value: d.id, label: d.title }))} placeholder="Choose a document" />
            <Select label="Distribution Target" value={targetType} onChange={(e) => { setTargetType(e.target.value); setTarget('') }} options={[
              { value: 'department', label: 'Department' },
              { value: 'section', label: 'Section' },
              { value: 'users', label: 'Specific Users' },
            ]} />
            {targetType === 'department' && (
              <Select label="Department" value={target} onChange={(e) => setTarget(e.target.value)} options={mockDepartments.map((d) => d.name)} />
            )}
            {targetType === 'users' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-[var(--text-secondary)]">Select Users</label>
                {mockUsers.map((u) => (
                  <label key={u.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-[var(--bg-surface)] cursor-pointer">
                    <input type="checkbox" className="rounded text-gold-600 focus:ring-gold-500/30" />
                    <Avatar name={u.name} size="sm" />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))}
              </div>
            )}
            <Button variant="gold" onClick={handleDistribute} loading={loading} className="w-full">
              <Send className="h-4 w-4" /> Distribute Document
            </Button>
          </div>
        </Card>
        <Card>
          <CardTitle className="mb-4">Recent Distributions</CardTitle>
          <div className="space-y-3">
            {recentDistributions.map((d, i) => (
              <div key={i} className="p-4 rounded-xl border border-[var(--border-color)] hover:border-gold-600/20 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{d.doc}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-[var(--text-muted)]">
                      {d.target.includes('Department') ? <Building2 className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                      {d.target}
                    </div>
                  </div>
                  <Badge variant={d.status === 'completed' ? 'success' : 'warning'} dot>{d.status}</Badge>
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-2">{d.recipients} recipients · {d.date}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageTransition>
  )
}
