import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Search, X } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function MeetingTemplateForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { addToast } = useToast()
  const isEdit = Boolean(id)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [users, setUsers] = useState([])
  const [groupSearches, setGroupSearches] = useState({})
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    meeting_link: '',
    meeting_type: 'regular',
    mode: 'physical',
    agenda_items: [{ title: '', duration_minutes: 15 }],
    groups: [{ name: '', group_type: 'custom', participants: [] }]
  })

  useEffect(() => {
    api.get('/users').then(res => {
      const data = res.data.data?.data || res.data.data || []
      setUsers(data)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!isEdit || users.length === 0) return
    setLoading(true)
    api.get(`/meeting-templates/${id}`)
      .then(res => {
        const t = res.data.data
        setForm({
          name: t.name || '',
          description: t.description || '',
          location: t.location || '',
          meeting_link: t.meeting_link || '',
          meeting_type: t.meeting_type || 'regular',
          mode: t.mode || 'physical',
          agenda_items: t.agenda_items?.length ? t.agenda_items.map(item => ({ ...item, title: item.title || '', presenter_id: item.presenter_id ? String(item.presenter_id) : '', duration_minutes: item.duration_minutes || 15 })) : [{ title: '', presenter_id: '', duration_minutes: 15 }],
          groups: t.groups?.length ? t.groups.map(g => ({
            ...g,
            participants: (g.participants || []).map(p => ({
              user_id: typeof p === 'object' ? p.user_id : p,
              role: typeof p === 'object' ? (p.role || 'participant') : 'participant',
              name: users.find(u => u.id === (typeof p === 'object' ? p.user_id : p))?.name || ''
            }))
          })) : [{ name: '', group_type: 'custom', participants: [] }]
        })
      })
      .catch(() => addToast('Failed to load template', 'error'))
      .finally(() => setLoading(false))
  }, [id, users])

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }))

  const addAgendaItem = () => setForm(prev => ({ ...prev, agenda_items: [...prev.agenda_items, { title: '', presenter_id: '', duration_minutes: 15 }] }))
  const removeAgendaItem = (index) => setForm(prev => ({ ...prev, agenda_items: prev.agenda_items.filter((_, i) => i !== index) }))
  const updateAgendaItem = (index, field, value) => setForm(prev => ({ ...prev, agenda_items: prev.agenda_items.map((item, i) => i === index ? { ...item, [field]: value } : item) }))
  const updateAgendaPresenter = (index, userId) => {
    const selectedId = userId ? String(userId) : ''
    const user = users.find(u => String(u.id) === selectedId)
    setForm(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map((item, i) => i !== index ? item : { ...item, title: user?.name || '', presenter_id: selectedId })
    }))
  }

  const addGroup = () => setForm(prev => ({ ...prev, groups: [...prev.groups, { name: '', group_type: 'custom', participants: [] }] }))
  const removeGroup = (index) => setForm(prev => ({ ...prev, groups: prev.groups.filter((_, i) => i !== index) }))
  const updateGroup = (index, field, value) => setForm(prev => ({ ...prev, groups: prev.groups.map((group, i) => i === index ? { ...group, [field]: value } : group) }))

  const addGroupParticipant = (groupIndex, user) => {
    setForm(prev => ({
      ...prev,
      groups: prev.groups.map((group, i) => {
        if (i !== groupIndex) return group
        const existing = group.participants || []
        if (existing.find(p => p.user_id === user.id)) return group
        return { ...group, participants: [...existing, { user_id: user.id, name: user.name, role: 'participant' }] }
      })
    }))
    setGroupSearches(prev => ({ ...prev, [groupIndex]: '' }))
  }

  const removeGroupParticipant = (groupIndex, userId) => {
    setForm(prev => ({
      ...prev,
      groups: prev.groups.map((group, i) => i !== groupIndex ? group : { ...group, participants: (group.participants || []).filter(p => p.user_id !== userId) })
    }))
  }

  const updateGroupParticipantRole = (groupIndex, userId, role) => {
    setForm(prev => ({
      ...prev,
      groups: prev.groups.map((group, i) => i !== groupIndex ? group : { ...group, participants: (group.participants || []).map(p => p.user_id === userId ? { ...p, role } : p) })
    }))
  }

  const setGroupSearch = (groupIndex, value) => setGroupSearches(prev => ({ ...prev, [groupIndex]: value }))

  const filteredGroupUsers = (groupIndex) => {
    const group = form.groups[groupIndex]
    const existingIds = (group?.participants || []).map(p => p.user_id)
    const query = groupSearches[groupIndex] || ''
    return users.filter(u =>
      !existingIds.includes(u.id) &&
      (u.name?.toLowerCase().includes(query.toLowerCase()) ||
       u.email?.toLowerCase().includes(query.toLowerCase()))
    )
  }

  const allGroupParticipants = () => {
    const map = {}
    form.groups.forEach(group => {
      (group.participants || []).forEach(p => {
        if (!map[p.user_id]) map[p.user_id] = p
      })
    })
    return Object.values(map)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const payload = {
        ...form,
        agenda_items: form.agenda_items.filter(item => item.title.trim()).map(item => ({
          title: item.title.trim(),
          presenter_id: item.presenter_id || null,
          duration_minutes: parseInt(item.duration_minutes) || 15
        })),
        groups: form.groups.filter(group => group.name.trim()).map(group => ({ ...group, group_type: group.group_type || 'custom' }))
      }
      if (isEdit) {
        await api.put(`/meeting-templates/${id}`, payload)
        addToast('Template updated', 'success')
      } else {
        await api.post('/meeting-templates', payload)
        addToast('Template created', 'success')
      }
      navigate('/meeting-templates')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save template', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-600 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/meeting-templates')} className="rounded-lg p-2 hover:bg-[var(--bg-elevated)]">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{isEdit ? 'Edit Template' : 'New Meeting Template'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-lg p-6 space-y-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Template Details</h2>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Name</label>
            <input type="text" required value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Description</label>
            <textarea rows={3} value={form.description} onChange={(e) => handleChange('description', e.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Type</label>
              <select value={form.meeting_type} onChange={(e) => handleChange('meeting_type', e.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30">
                <option value="regular">Regular</option>
                <option value="emergency">Emergency</option>
                <option value="review">Review</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Mode</label>
              <select value={form.mode} onChange={(e) => handleChange('mode', e.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30">
                <option value="physical">Physical</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">{form.mode === 'online' ? 'Default Meeting Link' : 'Default Location'}</label>
            <input type="text" value={form.mode === 'online' ? form.meeting_link : form.location} onChange={(e) => handleChange(form.mode === 'online' ? 'meeting_link' : 'location', e.target.value)} className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30" />
          </div>
        </div>

        <div className="glass rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Groups</h2>
            <button type="button" onClick={addGroup} className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"><Plus className="h-4 w-4" /> Add Group</button>
          </div>
          {form.groups.map((group, index) => (
            <div key={index} className="space-y-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
              <div className="flex gap-3 items-start">
                <div className="flex-1">
                  <input type="text" placeholder="Group name" value={group.name} onChange={(e) => updateGroup(index, 'name', e.target.value)} className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30" />
                </div>
                <select value={group.group_type} onChange={(e) => updateGroup(index, 'group_type', e.target.value)} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30">
                  <option value="custom">Custom</option>
                  <option value="department">Department</option>
                  <option value="role_based">Role Based</option>
                </select>
                {form.groups.length > 1 && <button type="button" onClick={() => removeGroup(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>}
              </div>
              <div className="space-y-3">
                <p className="text-xs text-[var(--text-muted)]">Group members</p>
                <div className="relative">
                  <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">
                    <Search className="h-4 w-4 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={groupSearches[index] || ''}
                      onChange={(e) => setGroupSearch(index, e.target.value)}
                      className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                    />
                  </div>
                  {groupSearches[index] && filteredGroupUsers(index).length > 0 && (
                    <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-lg">
                      {filteredGroupUsers(index).slice(0, 10).map(user => (
                        <button key={user.id} type="button" onClick={() => addGroupParticipant(index, user)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--bg-elevated)]">
                          <div className="h-8 w-8 rounded-full bg-gold-600/10 flex items-center justify-center"><span className="text-sm font-medium text-gold-600">{user.name?.charAt(0)?.toUpperCase()}</span></div>
                          <div><p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p><p className="text-xs text-[var(--text-muted)]">{user.email}</p></div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {(group.participants || []).length > 0 && (
                  <div className="space-y-2">
                    {(group.participants || []).map(p => (
                      <div key={p.user_id} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">
                        <span className="text-sm font-medium text-[var(--text-primary)]">{p.name}</span>
                        <div className="flex items-center gap-2">
                          <select
                            value={p.role || 'participant'}
                            onChange={(e) => updateGroupParticipantRole(index, p.user_id, e.target.value)}
                            className="rounded border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                          >
                            <option value="participant">Participant</option>
                            <option value="chairperson">Chairperson</option>
                            <option value="secretary">Secretary</option>
                            <option value="observer">Observer</option>
                            <option value="approver">Approver</option>
                          </select>
                          <button type="button" onClick={() => removeGroupParticipant(index, p.user_id)} className="rounded p-1 text-red-500 hover:bg-red-500/10"><X className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="glass rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agenda</h2>
            <button type="button" onClick={addAgendaItem} className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"><Plus className="h-4 w-4" /> Add Item</button>
          </div>
          {form.agenda_items.map((item, index) => {
            const currentId = item.presenter_id ? String(item.presenter_id) : ''
            const availableUsers = allGroupParticipants().filter(p => !form.agenda_items.find((it, i) => i !== index && String(it.presenter_id) === String(p.user_id)))
            return (
              <div key={index} className="flex gap-3 items-start">
                <span className="mt-2 text-sm font-medium text-[var(--text-muted)]">{index + 1}.</span>
                <div className="flex-1">
                  <select value={currentId} onChange={(e) => updateAgendaPresenter(index, e.target.value)} className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30">
                    <option value="">Select a speaker</option>
                    {availableUsers.map(p => (
                      <option key={String(p.user_id)} value={String(p.user_id)}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="w-28"><input type="number" placeholder="Mins" value={item.duration_minutes} onChange={(e) => updateAgendaItem(index, 'duration_minutes', parseInt(e.target.value) || 15)} className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30" /></div>
                {form.agenda_items.length > 1 && <button type="button" onClick={() => removeAgendaItem(index)} className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>}
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/meeting-templates')} className="glass rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]">Cancel</button>
          <button type="submit" disabled={saving} className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50">{saving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}</button>
        </div>
      </form>
    </div>
  )
}
