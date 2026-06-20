import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, FileText } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'

export default function CreateMeeting() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addToast } = useToast()
  const [loading, setLoading] = useState(false)
  const [users, setUsers] = useState([])
  const [templates, setTemplates] = useState([])
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [form, setForm] = useState({
    title: '',
    description: '',
    scheduled_at: '',
    location: '',
    meeting_link: '',
    meeting_type: 'regular',
    mode: 'physical',
    agenda_items: [{ title: '', duration_minutes: 15 }],
    groups: []
  })

  useEffect(() => {
    api.get('/users').then(res => {
      const data = res.data.data?.data || res.data.data || []
      setUsers(data)
    }).catch(() => {})
    api.get('/meeting-templates').then(res => {
      setTemplates(res.data.data || [])
    }).catch(() => {})
  }, [])

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const addAgendaItem = () => {
    setForm(prev => ({
      ...prev,
      agenda_items: [...prev.agenda_items, { title: '', duration_minutes: 15 }]
    }))
  }

  const removeAgendaItem = (index) => {
    setForm(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.filter((_, i) => i !== index)
    }))
  }

  const updateAgendaItem = (index, field, value) => {
    setForm(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }))
  }

  const applyTemplate = (template) => {
    if (!template) return
    setSelectedTemplateId(template.id)
    setForm(prev => ({
      ...prev,
      title: template.name || prev.title,
      description: template.description || prev.description,
      location: template.location || prev.location,
      meeting_link: template.meeting_link || prev.meeting_link,
      meeting_type: template.meeting_type || prev.meeting_type,
      mode: template.mode || prev.mode,
      agenda_items: template.agenda_items?.length ? template.agenda_items.map((item, idx) => ({
        title: item.title || `Agenda Item ${idx + 1}`,
        description: item.description || '',
        duration_minutes: item.duration_minutes || 15,
        presenter_id: item.presenter_id || '',
        speaking_queue: item.presenter_id ? [{
          user_id: item.presenter_id,
          name: users.find(u => u.id === item.presenter_id)?.name || '',
          order: 1,
          status: 'queued',
          topic: null,
          sub_topic: null,
          description: null,
          files: []
        }] : []
      })) : prev.agenda_items,
      groups: template.groups?.length ? template.groups.map(g => ({
        name: g.name,
        group_type: g.group_type || 'custom',
        participants: (g.participants || []).map(p => typeof p === 'object' ? { user_id: p.user_id, role: p.role || 'participant' } : { user_id: p, role: 'participant' })
      })) : prev.groups
    }))
  }

  useEffect(() => {
    const template = location.state?.template
    if (template) {
      applyTemplate(template)
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.state, users])

  const handleTemplateChange = (e) => {
    const id = e.target.value
    setSelectedTemplateId(id)
    const template = templates.find(t => String(t.id) === id)
    applyTemplate(template)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await api.post('/meetings', {
        ...form,
        template_id: selectedTemplateId || undefined,
        agenda_items: form.agenda_items.filter(item => item.title.trim()),
        groups: form.groups.filter(group => group.name.trim())
      })

      addToast('Meeting scheduled successfully', 'success')
      navigate('/meetings')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to create meeting', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/meetings')}
          className="rounded-lg p-2 hover:bg-[var(--bg-elevated)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Schedule Meeting</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="glass rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Meeting Details</h2>
            <button
              type="button"
              onClick={() => navigate('/meeting-templates')}
              className="inline-flex items-center gap-1 text-sm text-gold-600 hover:text-gold-500"
            >
              <FileText className="h-4 w-4" /> Templates
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Use Template</label>
            <select
              value={selectedTemplateId}
              onChange={handleTemplateChange}
              className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
            >
              <option value="">None</option>
              {templates.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)]">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={form.scheduled_at}
                onChange={(e) => handleChange('scheduled_at', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Type</label>
              <select
                value={form.meeting_type}
                onChange={(e) => handleChange('meeting_type', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              >
                <option value="regular">Regular</option>
                <option value="emergency">Emergency</option>
                <option value="review">Review</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">Mode</label>
              <select
                value={form.mode}
                onChange={(e) => handleChange('mode', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              >
                <option value="physical">Physical</option>
                <option value="online">Online</option>
                <option value="hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)]">
                {form.mode === 'online' ? 'Meeting Link' : 'Location'}
              </label>
              <input
                type="text"
                value={form.mode === 'online' ? form.meeting_link : form.location}
                onChange={(e) => handleChange(form.mode === 'online' ? 'meeting_link' : 'location', e.target.value)}
                className="mt-1 block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
              />
            </div>
          </div>
        </div>

        <div className="glass rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Agenda</h2>
            <button
              type="button"
              onClick={addAgendaItem}
              className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"
            >
              <Plus className="h-4 w-4" /> Add Item
            </button>
          </div>
          {form.agenda_items.map((item, index) => (
            <div key={index} className="flex gap-3 items-start">
              <span className="mt-2 text-sm font-medium text-[var(--text-muted)]">{index + 1}.</span>
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Agenda item title"
                  value={item.title}
                  onChange={(e) => updateAgendaItem(index, 'title', e.target.value)}
                  className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
              </div>
              <div className="w-28">
                <input
                  type="number"
                  placeholder="Mins"
                  value={item.duration_minutes}
                  onChange={(e) => updateAgendaItem(index, 'duration_minutes', parseInt(e.target.value) || 15)}
                  className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
              </div>
              {form.agenda_items.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeAgendaItem(index)}
                  className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="glass rounded-lg px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
          >
            {loading ? 'Scheduling...' : 'Schedule Meeting'}
          </button>
        </div>
      </form>
    </div>
  )
}
