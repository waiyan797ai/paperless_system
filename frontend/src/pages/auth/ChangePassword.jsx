import { useState } from 'react'
import { Lock } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function ChangePassword() {
  const [form, setForm] = useState({ current_password: '', password: '', password_confirmation: '' })
  const [loading, setLoading] = useState(false)
  const { addToast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.password_confirmation) {
      addToast('Passwords do not match', 'error')
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/auth/change-password', form)
      addToast(data.message || 'Password updated successfully', 'success')
      setForm({ current_password: '', password: '', password_confirmation: '' })
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors ? Object.values(errors).flat()[0] : null
      addToast(firstError || err.response?.data?.message || 'Failed to update password', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageTransition>
      <PageHeader title="Change Password" subtitle="Update your account password" />
      <Card className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Current Password"
            type="password"
            icon={Lock}
            value={form.current_password}
            onChange={(e) => setForm({ ...form, current_password: e.target.value })}
            required
          />
          <Input
            label="New Password"
            type="password"
            icon={Lock}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            hint="Minimum 8 characters"
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            icon={Lock}
            value={form.password_confirmation}
            onChange={(e) => setForm({ ...form, password_confirmation: e.target.value })}
            required
          />
          <Button type="submit" variant="gold" loading={loading}>Update Password</Button>
        </form>
      </Card>
    </PageTransition>
  )
}
