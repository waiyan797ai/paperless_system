import { useState } from 'react'
import { User, Mail, Building2, Shield } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: '+1 (555) 000-0000' })
  const [loading, setLoading] = useState(false)

  const handleSave = async (e) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 600))
    updateUser({ name: form.name, email: form.email })
    addToast('Profile updated', 'success')
    setLoading(false)
  }

  return (
    <PageTransition>
      <PageHeader title="Profile" subtitle="Manage your account information" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 text-center">
          <Avatar name={user?.name} size="xl" className="mx-auto" />
          <h3 className="font-display text-xl font-semibold mt-4 text-[var(--text-primary)]">{user?.name}</h3>
          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          <Badge variant="gold" className="mt-3 capitalize">{user?.role}</Badge>
          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <Building2 className="h-4 w-4 text-gold-600" /> {user?.department}
            </div>
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <Shield className="h-4 w-4 text-gold-600" /> Active Account
            </div>
          </div>
        </Card>
        <Card className="lg:col-span-2">
          <CardTitle className="mb-6">Personal Information</CardTitle>
          <form onSubmit={handleSave} className="space-y-5">
            <Input label="Full Name" icon={User} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input label="Email" icon={Mail} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Button type="submit" variant="gold" loading={loading}>Save Changes</Button>
          </form>
        </Card>
      </div>
    </PageTransition>
  )
}
