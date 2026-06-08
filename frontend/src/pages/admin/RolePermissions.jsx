import { useEffect, useState } from 'react'
import { Shield } from 'lucide-react'
import PageTransition, { PageHeader } from '../../components/layout/PageTransition'
import Card, { CardTitle } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function RolePermissions() {
  const { addToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissions, setPermissions] = useState([])
  const [roles, setRoles] = useState([])
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([])

  const load = () => {
    setLoading(true)
    api.get('/roles-permissions')
      .then(({ data }) => {
        const perms = data.data?.permissions || []
        const roleList = data.data?.roles || []
        setPermissions(perms)
        setRoles(roleList)
        if (roleList.length && !selectedRoleId) {
          const first = roleList.find((r) => !['super_admin', 'admin'].includes(r.name)) || roleList[0]
          setSelectedRoleId(first.id)
          setSelectedIds(first.permissions?.map((p) => p.id) || [])
        }
      })
      .catch(() => addToast('Failed to load roles & permissions', 'error'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const selectedRole = roles.find((r) => r.id === selectedRoleId)
  const isLocked = selectedRole && ['super_admin', 'admin'].includes(selectedRole.name)

  const grouped = permissions.reduce((acc, p) => {
    const g = p.group || 'other'
    if (!acc[g]) acc[g] = []
    acc[g].push(p)
    return acc
  }, {})

  const handleRoleChange = (roleId) => {
    const role = roles.find((r) => r.id === Number(roleId))
    setSelectedRoleId(role?.id || null)
    setSelectedIds(role?.permissions?.map((p) => p.id) || [])
  }

  const togglePermission = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  const handleSave = async () => {
    if (!selectedRole || isLocked) return
    setSaving(true)
    try {
      await api.put(`/roles/${selectedRole.id}/permissions`, { permission_ids: selectedIds })
      addToast('Permissions updated', 'success')
      load()
    } catch (err) {
      addToast(err.response?.data?.message || 'Save failed', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="py-12 flex justify-center"><LoadingSpinner label="Loading..." /></div>
  }

  return (
    <PageTransition>
      <PageHeader
        title="Role Permissions"
        subtitle="Configure what each role can do in the system"
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardTitle className="mb-4 flex items-center gap-2"><Shield className="h-4 w-4" /> Roles</CardTitle>
          <div className="space-y-1">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleChange(role.id)}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  selectedRoleId === role.id
                    ? 'bg-gold-600/15 text-gold-600 border border-gold-600/25'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)]'
                }`}
              >
                <p className="font-medium">{role.display_name}</p>
                <p className="text-xs text-[var(--text-muted)]">{role.name}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <CardTitle>
              {selectedRole?.display_name || 'Select a role'}
              {isLocked && <span className="text-xs font-normal text-[var(--text-muted)] ml-2">(locked)</span>}
            </CardTitle>
            {!isLocked && selectedRole && (
              <Button variant="gold" onClick={handleSave} loading={saving}>Save Changes</Button>
            )}
          </div>

          {isLocked ? (
            <p className="text-sm text-[var(--text-muted)]">Admin roles have full access and cannot be modified.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(grouped).map(([group, perms]) => (
                <div key={group}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-3">{group}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {perms.map((p) => (
                      <label
                        key={p.id}
                        className="flex items-start gap-3 p-3 rounded-xl border border-[var(--border-color)] cursor-pointer hover:bg-[var(--bg-surface)]"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={() => togglePermission(p.id)}
                          className="mt-0.5"
                        />
                        <div>
                          <p className="text-sm font-medium text-[var(--text-primary)]">{p.name}</p>
                          <p className="text-xs text-[var(--text-muted)] font-mono">{p.slug}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </PageTransition>
  )
}
