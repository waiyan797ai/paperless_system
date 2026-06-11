import { useEffect, useRef, useState } from 'react'
import { User, Mail, Building2, Shield, Camera } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Avatar from '../../components/ui/Avatar'
import Badge from '../../components/ui/Badge'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { avatarUrl, normalizeUser } from '../../lib/auth'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'

export default function Profile() {
  const { user, updateUser } = useAuth()
  const { addToast } = useToast()
  const fileInputRef = useRef(null)
  const [form, setForm] = useState({ name: '', phone: '' })
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [avatarFile, setAvatarFile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/auth/profile')
      .then(({ data }) => {
        const profile = normalizeUser(data.user)
        setForm({
          name: profile.name || '',
          phone: profile.phone || '',
        })
        setAvatarPreview(profile.avatarUrl)
        updateUser(profile)
      })
      .catch(() => addToast('Failed to load profile', 'error'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      addToast('Image must be under 2MB', 'error')
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('name', form.name.trim())
      if (form.phone) formData.append('phone', form.phone.trim())
      if (avatarFile) formData.append('avatar', avatarFile)

      const { data } = await api.post('/auth/profile', formData)
      const updated = normalizeUser(data.user)
      updateUser(updated)
      setAvatarPreview(updated.avatarUrl)
      setAvatarFile(null)
      addToast(data.message || 'Profile updated', 'success')
    } catch (err) {
      const errors = err.response?.data?.errors
      const firstError = errors ? Object.values(errors).flat()[0] : null
      addToast(firstError || err.response?.data?.message || 'Failed to update profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <LoadingSpinner label="Loading profile..." />
      </div>
    )
  }

  const displayAvatar = avatarPreview || user?.avatarUrl || avatarUrl(user?.avatar)

  return (
    <PageTransition>
      <PageHeader title="Profile" subtitle="Manage your account information" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 text-center">
          <div className="relative inline-block mx-auto">
            <Avatar name={user?.name} src={displayAvatar} size="xl" className="mx-auto" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-gold-600 text-primary-950 hover:bg-gold-500 transition-colors shadow-md"
              title="Change photo"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
          <h3 className="text-xl font-semibold mt-4 text-[var(--text-primary)] tracking-tight">{user?.name}</h3>
          <p className="text-sm text-[var(--text-muted)]">{user?.email}</p>
          <Badge variant="gold" className="mt-3 capitalize">
            {user?.role?.display_name || user?.roleName || user?.role}
          </Badge>
          <div className="mt-6 space-y-3 text-left">
            <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
              <Building2 className="h-4 w-4 text-gold-600 shrink-0" />
              {user?.departmentName || user?.department?.name || '—'}
            </div>
            {user?.sectionName && (
              <div className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
                <Shield className="h-4 w-4 text-gold-600 shrink-0" />
                {user.sectionName}
              </div>
            )}
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-4">JPG, PNG or WebP. Max 2MB.</p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle className="mb-6">Personal Information</CardTitle>
          <form onSubmit={handleSave} className="space-y-5">
            <Input
              label="Full Name"
              icon={User}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Email"
              icon={Mail}
              type="email"
              value={user?.email || ''}
              disabled
              hint="Email cannot be changed here"
            />
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Button type="submit" variant="gold" loading={saving}>Save Changes</Button>
          </form>
        </Card>
      </div>
    </PageTransition>
  )
}
