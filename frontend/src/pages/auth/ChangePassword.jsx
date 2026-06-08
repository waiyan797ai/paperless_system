import { useState } from 'react'
import { Lock } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { useToast } from '../../components/ui/Toast'

export default function ChangePassword() {
  const [form, setForm] = useState({ current: '', newPassword: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.newPassword !== form.confirm) {
      addToast('Passwords do not match', 'error')
      return
    }
    setLoading(true)
    await new Promise((r) => setTimeout(r, 800))
    addToast('Password updated successfully', 'success')
    setForm({ current: '', newPassword: '', confirm: '' })
    setLoading(false)
  }

  return (
    <PageTransition>
      <PageHeader title="Change Password" subtitle="Update your account password" />
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input label="Current Password" type="password" icon={Lock} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
          <Input label="New Password" type="password" icon={Lock} value={form.newPassword} onChange={(e) => setForm({ ...form, newPassword: e.target.value })} hint="Minimum 8 characters" required />
          <Input label="Confirm New Password" type="password" icon={Lock} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
          <Button type="submit" variant="gold" loading={loading}>Update Password</Button>
        </form>
      </Card>
    </PageTransition>
  )
}
