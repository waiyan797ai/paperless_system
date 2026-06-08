import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Button from '../../components/ui/Button'
import FileUpload from '../../components/ui/FileUpload'
import { mockDepartments } from '../../lib/mockData'
import { useToast } from '../../components/ui/Toast'

export default function DocumentForm() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ title: '', type: '', department: '', description: '' })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    addToast('Document uploaded', 'success')
    navigate('/documents')
  }

  return (
    <PageTransition>
      <button onClick={() => navigate('/documents')} className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-gold-600 mb-4">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>
      <PageHeader title="Upload Document" />
      <Card className="max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Document Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <Select label="Document Type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} options={['Report', 'Manual', 'Policy', 'Form', 'Memo']} required />
            <Select label="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} options={mockDepartments.map((d) => d.name)} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Description</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 resize-y" />
          </div>
          <FileUpload accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
          <div className="flex gap-3">
            <Button type="submit" variant="gold" loading={loading}>Upload</Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/documents')}>Cancel</Button>
          </div>
        </form>
      </Card>
    </PageTransition>
  )
}
