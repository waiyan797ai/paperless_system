import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Users, FileText, ArrowLeft, Trash2, Edit, Copy } from 'lucide-react'
import api from '../../lib/api'
import { useToast } from '../../components/ui/Toast'
import { useAuth } from '../../hooks/useAuth'
import { hasPermission } from '../../lib/auth'

export default function MeetingTemplatesList() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const { user } = useAuth()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/meeting-templates')
      setTemplates(data.data || [])
    } catch (err) {
      addToast('Failed to fetch meeting templates', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    try {
      await api.delete(`/meeting-templates/${id}`)
      addToast('Template deleted', 'success')
      fetchTemplates()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete template', 'error')
    }
  }

  const handleUseTemplate = (template) => {
    navigate('/meetings/new', { state: { template } })
  }

  const canManage = hasPermission(user, 'meetings.create')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/meetings')}
            className="rounded-lg p-2 hover:bg-[var(--bg-elevated)]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Meeting Templates</h1>
        </div>
        {canManage && (
          <button
            onClick={() => navigate('/meeting-templates/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-600 border-t-transparent" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-[var(--text-muted)]">
          <FileText className="h-12 w-12 mb-4 opacity-50" />
          <p>No meeting templates found</p>
          {canManage && (
            <button
              onClick={() => navigate('/meeting-templates/new')}
              className="mt-4 text-sm text-gold-600 hover:text-gold-500"
            >
              Create your first template
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className="glass rounded-lg p-5 transition-shadow hover:shadow-lg"
            >
              <div className="mb-3 flex items-start justify-between">
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">{template.name}</h3>
                <div className="flex gap-1">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    className="rounded p-1.5 text-gold-600 hover:bg-gold-600/10"
                    title="Use template"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  {canManage && (
                    <>
                      <button
                        onClick={() => navigate(`/meeting-templates/${template.id}/edit`)}
                        className="rounded p-1.5 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="rounded p-1.5 text-red-500 hover:bg-red-500/10"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="mb-4 text-sm text-[var(--text-secondary)] line-clamp-2">
                {template.description || 'No description'}
              </p>
              <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {new Set((template.groups || []).flatMap(g => (g.participants || []).map(p => typeof p === 'object' ? p.user_id : p))).size} participants
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {(template.agenda_items || []).length} agenda items
                </span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {(template.groups || []).length} groups
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
