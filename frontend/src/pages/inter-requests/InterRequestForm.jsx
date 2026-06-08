import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import { mockDepartments } from '../../lib/mockData'
import { useToast } from '../../components/ui/Toast'

export default function InterRequestForm() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', fromDept: '', toDept: '', description: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    addToast('Inter-request submitted', 'success')
    navigate('/inter-requests')
  }

  return (
    <PageTransition>
      <button onClick={() => navigate('/inter-requests')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title="New Inter-Department Request" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Request Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select label="From Department" value={form.fromDept} onChange={(e) => setForm({ ...form, fromDept: e.target.value })} options={mockDepartments.map((d) => d.name)} required />
            <Select label="To Department" value={form.toDept} onChange={(e) => setForm({ ...form, toDept: e.target.value })} options={mockDepartments.map((d) => d.name)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={5} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y" required />
          </div>
          <div className="flex gap-3">
            <Button type="submit" variant="gold" loading={loading}>Submit</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/inter-requests')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageTransition>
  )
}
