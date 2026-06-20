import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Calendar, Users, Clock, ChevronRight, Filter } from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { hasPermission } from '../../lib/auth'

export default function MeetingsList() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('upcoming')

  useEffect(() => {
    fetchMeetings()
  }, [filter])

  const fetchMeetings = async () => {
    try {
      setLoading(true)
      const params = filter === 'my' ? { my_meetings: true } : { status: filter }
      const { data } = await api.get('/meetings', { params })
      setMeetings(data.data?.data || [])
    } catch (err) {
      addToast('Failed to fetch meetings', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      draft: 'bg-gray-500/15 text-gray-600',
      scheduled: 'bg-blue-500/15 text-blue-600',
      ongoing: 'bg-green-500/15 text-green-600',
      completed: 'bg-gray-500/15 text-gray-500',
      cancelled: 'bg-red-500/15 text-red-600'
    }
    return colors[status] || 'bg-gray-500/15'
  }

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Meetings</h1>
        {hasPermission(user, 'meetings.create') && (
          <button
            onClick={() => navigate('/meetings/new')}
            className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500"
          >
            <Plus className="h-4 w-4" />
            Schedule Meeting
          </button>
        )}
      </div>

      <div className="flex gap-2">
        {['upcoming', 'ongoing', 'completed', 'my'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              filter === f
                ? 'bg-gold-600/15 text-gold-600 border border-gold-600/30'
                : 'glass text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]'
            }`}
          >
            {f === 'my' ? 'My Meetings' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-600 border-t-transparent" />
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center text-[var(--text-muted)]">
          <Calendar className="h-12 w-12 mb-4 opacity-50" />
          <p>No meetings found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => (
            <div
              key={meeting.id}
              onClick={() => navigate(`/meetings/${meeting.id}`)}
              className="cursor-pointer glass rounded-lg p-6 transition-shadow hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-[var(--text-primary)]">{meeting.title}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)] line-clamp-2">{meeting.description}</p>
                  <div className="flex items-center gap-4 text-sm text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(meeting.scheduled_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {meeting.location || 'Online'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {meeting.meeting_type}
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-[var(--text-muted)]" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
