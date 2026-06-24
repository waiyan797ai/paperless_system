import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import {
  ArrowLeft, Calendar, Clock, MapPin, Users, CheckCircle,
  XCircle, HelpCircle, Play, Square, UserCheck, FileText,
  MessageSquare, ClipboardList, Search, X, Plus, Trash2, Pencil,
  Mic, Download
} from 'lucide-react'
import api from '../../lib/api'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../components/ui/Toast'
import { hasPermission } from '../../lib/auth'

export default function MeetingDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToast } = useToast()
  const [meeting, setMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('details')
  const [rsvpLoading, setRsvpLoading] = useState(false)
  const [showAddParticipants, setShowAddParticipants] = useState(false)
  const [users, setUsers] = useState([])
  const [participantSearch, setParticipantSearch] = useState('')
  const [selectedParticipants, setSelectedParticipants] = useState([])
  const [addingParticipants, setAddingParticipants] = useState(false)
  const [queueLoading, setQueueLoading] = useState(false)
  const [newAgendaItems, setNewAgendaItems] = useState([{ title: '', duration_minutes: 15, presenter_id: '', topic: '', sub_topics: [{ title: '', description: '', files: [] }], files: [] }])
  const [newGroups, setNewGroups] = useState([{ name: '', group_type: 'custom' }])
  const [addingAgenda, setAddingAgenda] = useState(false)
  const [addingGroups, setAddingGroups] = useState(false)
  const [showAddAgenda, setShowAddAgenda] = useState(false)
  const [showAddGroup, setShowAddGroup] = useState(false)
  const [editingSpeaker, setEditingSpeaker] = useState(null)
  const [speakerTopic, setSpeakerTopic] = useState('')
  const [speakerSubTopics, setSpeakerSubTopics] = useState([{ title: '', description: '', notes: '', files: [] }])
  const [speakerMainFiles, setSpeakerMainFiles] = useState([])
  const [uploadingSpeakerMainFile, setUploadingSpeakerMainFile] = useState(false)
  const [savingSpeakerInfo, setSavingSpeakerInfo] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(null)
  const [uploadingMainFile, setUploadingMainFile] = useState(null)
  const [viewingFile, setViewingFile] = useState(null)
  const [filePreviewData, setFilePreviewData] = useState(null)
  const [filePreviewLoading, setFilePreviewLoading] = useState(false)
  const [filePreviewZoom, setFilePreviewZoom] = useState(1)
  const [filePreviewFullscreen, setFilePreviewFullscreen] = useState(false)
  const [editingAgendaTitle, setEditingAgendaTitle] = useState(null)
  const [agendaTitleInput, setAgendaTitleInput] = useState('')
  const [savingAgendaTitle, setSavingAgendaTitle] = useState(false)
  const [minutesMap, setMinutesMap] = useState({})
  const [savingMinutesId, setSavingMinutesId] = useState(null)
  const [actionItems, setActionItems] = useState([])
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteForm, setNoteForm] = useState({ title: '', description: '', assignee_id: '', start_date: '', due_date: '', priority: 'medium' })
  const [savingNote, setSavingNote] = useState(false)

  useEffect(() => {
    fetchMeeting()
    fetchActionItems()
  }, [id])

  const fetchActionItems = async () => {
    try {
      const { data } = await api.get(`/meetings/${id}/action-items`)
      setActionItems(data.data || [])
    } catch (err) {
      // silent
    }
  }

  const fetchMeeting = async () => {
    try {
      setLoading(true)
      const { data } = await api.get(`/meetings/${id}`)
      setMeeting(data.data)
      // initialize minutesMap from agenda item minutes
      const map = {}
      data.data.agenda_items?.forEach(item => {
        const m = item.minutes?.[0]
        if (m) {
          map[item.id] = { content: m.content || '', decisions: m.decisions || '' }
        }
      })
      setMinutesMap(prev => ({ ...prev, ...map }))
    } catch (err) {
      addToast('Failed to fetch meeting', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleRSVP = async (status) => {
    setRsvpLoading(true)
    try {
      await api.post(`/meetings/${id}/rsvp`, { rsvp_status: status })
      addToast(`RSVP updated: ${status}`, 'success')
      fetchMeeting()
    } catch (err) {
      addToast('Failed to update RSVP', 'error')
    } finally {
      setRsvpLoading(false)
    }
  }

  const handleCheckin = async () => {
    try {
      await api.post(`/meetings/${id}/checkin`, { method: 'manual' })
      addToast('Checked in successfully', 'success')
      fetchMeeting()
    } catch (err) {
      addToast('Failed to check in', 'error')
    }
  }

  const startMeeting = async () => {
    try {
      await api.post(`/meetings/${id}/start`)
      addToast('Meeting started', 'success')
      fetchMeeting()
    } catch (err) {
      addToast('Failed to start meeting', 'error')
    }
  }

  const endMeeting = async () => {
    try {
      await api.post(`/meetings/${id}/end`)
      addToast('Meeting ended', 'success')
      fetchMeeting()
    } catch (err) {
      addToast('Failed to end meeting', 'error')
    }
  }

  const handleDeleteMeeting = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) return
    try {
      await api.delete(`/meetings/${id}`)
      addToast('Meeting deleted', 'success')
      navigate('/meetings')
    } catch (err) {
      addToast('Failed to delete meeting', 'error')
    }
  }

  const openAddParticipants = async () => {
    setShowAddParticipants(true)
    setSelectedParticipants([])
    setParticipantSearch('')
    try {
      const { data } = await api.get('/users')
      const userList = data.data?.data || data.data || []
      setUsers(userList)
    } catch (err) {
      addToast('Failed to load users', 'error')
    }
  }

  const addParticipant = (user) => {
    if (selectedParticipants.find(p => p.user_id === user.id)) return
    if (meeting.participants?.find(p => p.user_id === user.id)) return
    setSelectedParticipants(prev => [...prev, { user_id: user.id, name: user.name, role: 'participant', group_id: '' }])
    setParticipantSearch('')
  }

  const removeParticipant = (userId) => {
    setSelectedParticipants(prev => prev.filter(p => p.user_id !== userId))
  }

  const updateParticipantRole = (userId, role) => {
    setSelectedParticipants(prev => prev.map(p => p.user_id === userId ? { ...p, role } : p))
  }

  const updateParticipantGroup = (userId, groupId) => {
    setSelectedParticipants(prev => prev.map(p => p.user_id === userId ? { ...p, group_id: groupId } : p))
  }

  const removeParticipantFromMeeting = async (participantId) => {
    try {
      await api.delete(`/meetings/${id}/participants/${participantId}`)
      addToast('Participant removed', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove participant', 'error')
    }
  }

  const handleAddParticipants = async () => {
    if (selectedParticipants.length === 0) return
    setAddingParticipants(true)
    try {
      await api.post(`/meetings/${id}/participants`, {
        participants: selectedParticipants.map(p => ({ user_id: p.user_id, role: p.role, group_id: p.group_id || null }))
      })
      addToast('Participants added successfully', 'success')
      setShowAddParticipants(false)
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add participants', 'error')
    } finally {
      setAddingParticipants(false)
    }
  }

  const addToQueue = (agendaItemId, participant) => {
    setMeeting(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map(item => {
        if (item.id !== agendaItemId) return item
        const queue = item.speaking_queue || []
        const nextOrder = queue.length > 0 ? Math.max(...queue.map(s => s.order)) + 1 : 1
        return {
          ...item,
          speaking_queue: [...queue, {
            user_id: participant.user_id,
            name: participant.user?.name || participant.name,
            order: nextOrder,
            status: 'queued',
            notes: ''
          }]
        }
      })
    }))
  }

  const removeFromQueue = (agendaItemId, index) => {
    setMeeting(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map(item => {
        if (item.id !== agendaItemId) return item
        const queue = item.speaking_queue || []
        return {
          ...item,
          speaking_queue: queue.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }))
        }
      })
    }))
  }

  const moveQueueItem = (agendaItemId, index, direction) => {
    setMeeting(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map(item => {
        if (item.id !== agendaItemId) return item
        const queue = [...(item.speaking_queue || [])]
        if (direction === 'up' && index === 0) return item
        if (direction === 'down' && index === queue.length - 1) return item
        const newIndex = direction === 'up' ? index - 1 : index + 1
        const temp = queue[index]
        queue[index] = queue[newIndex]
        queue[newIndex] = temp
        return { ...item, speaking_queue: queue.map((s, i) => ({ ...s, order: i + 1 })) }
      })
    }))
  }

  const handleSpeakerStatusChange = async (agendaItemId, index, status) => {
    const now = new Date().toISOString()
    const item = meeting.agenda_items.find(i => i.id === agendaItemId)
    const queue = [...(item?.speaking_queue || [])]
    const updatedQueue = queue.map((s, i) => {
      if (i !== index) return s
      return {
        ...s,
        status,
        started_at: status === 'speaking' ? now : s.started_at,
        ended_at: status === 'completed' ? now : s.ended_at
      }
    })

    setMeeting(prev => ({
      ...prev,
      agenda_items: prev.agenda_items.map(item => {
        if (item.id !== agendaItemId) return item
        return { ...item, speaking_queue: updatedQueue }
      })
    }))

    setQueueLoading(true)
    try {
      await api.put(`/meetings/${id}/speaking-queue`, {
        agenda_item_id: agendaItemId,
        speaking_queue: updatedQueue
      })
      addToast('Status updated', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update status', 'error')
    } finally {
      setQueueLoading(false)
    }
  }

  const saveAgendaSpeakingQueue = async (agendaItemId) => {
    const item = meeting.agenda_items.find(i => i.id === agendaItemId)
    if (!item) return
    setQueueLoading(true)
    try {
      await api.put(`/meetings/${id}/speaking-queue`, {
        agenda_item_id: agendaItemId,
        speaking_queue: item.speaking_queue || []
      })
      addToast('Speaking queue saved', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save speaking queue', 'error')
    } finally {
      setQueueLoading(false)
    }
  }

  const addNewAgendaItem = () => {
    setNewAgendaItems(prev => [...prev, { title: '', duration_minutes: 15, presenter_id: '', topic: '', sub_topics: [{ title: '', description: '', files: [] }], files: [], main_files: [] }])
  }

  const removeNewAgendaItem = (index) => {
    setNewAgendaItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateNewAgendaItem = (index, field, value) => {
    setNewAgendaItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item))
  }

  const updateNewAgendaSubTopic = (itemIndex, subIndex, field, value) => {
    setNewAgendaItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      const newSubs = [...item.sub_topics]
      newSubs[subIndex] = { ...newSubs[subIndex], [field]: value }
      return { ...item, sub_topics: newSubs }
    }))
  }

  const addNewAgendaSubTopic = (itemIndex) => {
    setNewAgendaItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, sub_topics: [...item.sub_topics, { title: '', description: '', files: [] }] } : item))
  }

  const removeNewAgendaSubTopic = (itemIndex, subIndex) => {
    setNewAgendaItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      return { ...item, sub_topics: item.sub_topics.filter((_, si) => si !== subIndex) }
    }))
  }

  const addNewAgendaFile = (itemIndex) => {
    setNewAgendaItems(prev => prev.map((item, i) => i === itemIndex ? { ...item, files: [...item.files, { name: '', url: '' }] } : item))
  }

  const updateNewAgendaFile = (itemIndex, fileIndex, field, value) => {
    setNewAgendaItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      const newFiles = [...item.files]
      newFiles[fileIndex] = { ...newFiles[fileIndex], [field]: value }
      return { ...item, files: newFiles }
    }))
  }

  const removeNewAgendaFile = (itemIndex, fileIndex) => {
    setNewAgendaItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      return { ...item, files: item.files.filter((_, fi) => fi !== fileIndex) }
    }))
  }

  const handleAddAgendaItems = async () => {
    const validItems = newAgendaItems.filter(item => item.title.trim())
    if (validItems.length === 0) return
    setAddingAgenda(true)
    try {
      await api.post(`/meetings/${id}/agenda-items`, { agenda_items: validItems })
      addToast('Agenda items added', 'success')
      setShowAddAgenda(false)
      setNewAgendaItems([{ title: '', duration_minutes: 15, presenter_id: '', topic: '', sub_topics: [{ title: '', description: '', files: [] }], files: [], main_files: [] }])
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add agenda items', 'error')
    } finally {
      setAddingAgenda(false)
    }
  }

  const addNewGroup = () => {
    setNewGroups(prev => [...prev, { name: '', group_type: 'custom' }])
  }

  const removeNewGroup = (index) => {
    setNewGroups(prev => prev.filter((_, i) => i !== index))
  }

  const updateNewGroup = (index, field, value) => {
    setNewGroups(prev => prev.map((group, i) => i === index ? { ...group, [field]: value } : group))
  }

  const normalizeSubTopic = (st) => {
    if (st && typeof st === 'object') {
      return { title: st.title || '', description: st.description || '', files: Array.isArray(st.files) ? st.files : [] }
    }
    return { title: typeof st === 'string' ? st : '', description: '', files: [] }
  }

  const getSubTopicTitle = (st) => normalizeSubTopic(st).title

  const getUserNameById = (userId) => {
    const p = meeting?.participants?.find(p => String(p.user_id) === String(userId))
    if (p?.user?.name) return p.user.name
    const u = users.find(u => String(u.id) === String(userId))
    return u?.name || 'Unknown'
  }

  const getFileType = (url) => {
    const ext = ((url?.split('.').pop() || '').split('?')[0] || '').toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image'
    if (ext === 'pdf') return 'pdf'
    if (['mp4', 'mov', 'avi', 'mp3'].includes(ext)) return 'media'
    if (['xls', 'xlsx'].includes(ext)) return 'excel'
    if (['doc', 'docx', 'ppt', 'pptx'].includes(ext)) return 'office'
    return 'other'
  }

  const getGoogleDocsViewerUrl = (fileUrl) => {
    const absolute = fileUrl.startsWith('http') ? fileUrl : `${window.location.origin}${fileUrl}`
    return `https://docs.google.com/gview?url=${encodeURIComponent(absolute)}&embedded=true`
  }

  const openFileViewer = async (file) => {
    setViewingFile(file)
    setFilePreviewData(null)
    const ext = (file.url?.split('.').pop()?.split('?')[0] || '').toLowerCase()
    if (['xls', 'xlsx'].includes(ext) || getFileType(file.url) === 'excel') {
      setFilePreviewLoading(true)
      try {
        const previewUrl = file.url.startsWith('http') ? new URL(file.url).pathname : file.url
        const res = await fetch(previewUrl)
        if (!res.ok) throw new Error('Failed to fetch file')
        const arrayBuffer = await res.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        setFilePreviewData({ type: 'excel', sheetName, sheets: workbook.SheetNames, workbook, data: json })
      } catch (err) {
        addToast('Failed to preview Excel file', 'error')
      } finally {
        setFilePreviewLoading(false)
      }
    }
  }

  const closeFileViewer = () => {
    setViewingFile(null)
    setFilePreviewData(null)
    setFilePreviewZoom(1)
    setFilePreviewFullscreen(false)
  }

  const openEditSpeaker = async (agendaItemId, speakerIdx) => {
    const item = meeting.agenda_items.find(i => i.id === agendaItemId)
    const speaker = item?.speaking_queue?.[speakerIdx]
    if (!speaker) return
    setEditingSpeaker({ agendaItemId, speakerIdx, userId: speaker.user_id, name: speaker.name })
    setSpeakerTopic(speaker.topic || '')
    const hasSubs = Array.isArray(speaker.sub_topics) && speaker.sub_topics.length
    const subs = hasSubs
      ? speaker.sub_topics.map(st => ({
          title: st.title || '',
          description: st.description || '',
          notes: st.notes || '',
          files: Array.isArray(st.files) ? st.files : [],
          actions: Array.isArray(st.actions) ? st.actions : []
        }))
      : [{
          title: speaker.sub_topic || '',
          description: speaker.description || '',
          notes: '',
          files: [],
          actions: []
        }]
    setSpeakerSubTopics(subs)
    // Speaker-level main files (only meaningful when sub_topics exist)
    setSpeakerMainFiles(Array.isArray(speaker.files) ? speaker.files : [])
    if (users.length === 0) {
      try {
        const { data } = await api.get('/users')
        const userList = data.data?.data || data.data || []
        setUsers(userList)
      } catch (err) {
        addToast('Failed to load users', 'error')
      }
    }
  }

  const handleUploadSpeakerMainFile = async (file) => {
    if (!file) return
    setUploadingSpeakerMainFile(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/meetings/${id}/sub-topic-files`, formData)
      setSpeakerMainFiles(prev => [...prev, { name: data.data.name, url: data.data.url }])
      addToast('File uploaded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload file', 'error')
    } finally {
      setUploadingSpeakerMainFile(false)
    }
  }

  const removeSpeakerMainFile = (index) => {
    setSpeakerMainFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadAgendaMainFile = async (itemIndex, file) => {
    if (!file) return
    setUploadingMainFile(itemIndex)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/meetings/${id}/sub-topic-files`, formData)
      setNewAgendaItems(prev => prev.map((item, i) => {
        if (i !== itemIndex) return item
        return { ...item, main_files: [...(item.main_files || []), { name: data.data.name, url: data.data.url }] }
      }))
      addToast('File uploaded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload file', 'error')
    } finally {
      setUploadingMainFile(null)
    }
  }

  const removeAgendaMainFile = (itemIndex, fileIndex) => {
    setNewAgendaItems(prev => prev.map((item, i) => {
      if (i !== itemIndex) return item
      return { ...item, main_files: (item.main_files || []).filter((_, fi) => fi !== fileIndex) }
    }))
  }

  const handleUploadSpeakerFile = async (subIndex, fileIndex, file) => {
    if (!file) return
    setUploadingFile(`${subIndex}-${fileIndex}`)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const { data } = await api.post(`/meetings/${id}/sub-topic-files`, formData)
      updateSpeakerSubTopicFile(subIndex, fileIndex, 'name', data.data.name)
      updateSpeakerSubTopicFile(subIndex, fileIndex, 'url', data.data.url)
      addToast('File uploaded', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to upload file', 'error')
    } finally {
      setUploadingFile(null)
    }
  }

  const updateSpeakerSubTopic = (index, field, value) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => i === index ? { ...st, [field]: value } : st))
  }

  const updateSpeakerSubTopicFile = (subIndex, fileIndex, field, value) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => {
      if (i !== subIndex) return st
      const files = st.files.map((f, fi) => fi === fileIndex ? { ...f, [field]: value } : f)
      return { ...st, files }
    }))
  }

  const addSpeakerSubTopicFile = (subIndex) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => i === subIndex ? { ...st, files: [...st.files, { name: '', url: '' }] } : st))
  }

  const removeSpeakerSubTopicFile = (subIndex, fileIndex) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => i === subIndex ? { ...st, files: st.files.filter((_, fi) => fi !== fileIndex) } : st))
  }

  const addSpeakerSubTopic = () => setSpeakerSubTopics(prev => [...prev, { title: '', description: '', notes: '', files: [], actions: [] }])

  const removeSpeakerSubTopic = (index) => setSpeakerSubTopics(prev => prev.filter((_, i) => i !== index))

  const addSpeakerSubTopicAction = (subIndex) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => i === subIndex ? { ...st, actions: [...st.actions, { user_id: '', start_date: '', due_date: '', task: '' }] } : st))
  }

  const updateSpeakerSubTopicAction = (subIndex, actionIndex, field, value) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => {
      if (i !== subIndex) return st
      const actions = st.actions.map((a, ai) => ai === actionIndex ? { ...a, [field]: value } : a)
      return { ...st, actions }
    }))
  }

  const removeSpeakerSubTopicAction = (subIndex, actionIndex) => {
    setSpeakerSubTopics(prev => prev.map((st, i) => i === subIndex ? { ...st, actions: st.actions.filter((_, ai) => ai !== actionIndex) } : st))
  }

  const handleSaveSpeakerInfo = async () => {
    if (!editingSpeaker) return
    setSavingSpeakerInfo(true)
    try {
      const validSubTopics = speakerSubTopics
        .map(st => ({
          title: st.title?.trim() || null,
          description: st.description?.trim() || null,
          notes: st.notes?.trim() || null,
          files: st.files.filter(f => f.name.trim() && f.url.trim()),
          actions: st.actions.filter(a => a.user_id).map(a => ({
            user_id: a.user_id,
            start_date: a.start_date || null,
            due_date: a.due_date || null,
            task: a.task?.trim() || null
          }))
        }))
        .filter(st => st.title || st.description || st.notes || st.files.length > 0 || st.actions.length > 0)
      await api.put(`/meetings/${id}/speaker-info`, {
        agenda_item_id: editingSpeaker.agendaItemId,
        speaker_index: editingSpeaker.speakerIdx,
        topic: speakerTopic || null,
        sub_topics: validSubTopics,
        files: speakerMainFiles.filter(f => f.name && f.url),
      })
      addToast('Speaker info saved', 'success')
      setEditingSpeaker(null)
      setSpeakerTopic('')
      setSpeakerSubTopics([{ title: '', description: '', notes: '', files: [], actions: [] }])
      setSpeakerMainFiles([])
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save speaker info', 'error')
    } finally {
      setSavingSpeakerInfo(false)
    }
  }

  const handleSubTopicClick = async (agendaItemId, speakerIdx, subTopicIdx) => {
    const item = meeting.agenda_items.find(i => i.id === agendaItemId)
    const speaker = item?.speaking_queue?.[speakerIdx]
    if (!speaker) return

    setQueueLoading(true)
    try {
      await api.put(`/meetings/${id}/current-sub-topic`, {
        agenda_item_id: agendaItemId,
        speaker_index: speakerIdx,
        current_sub_topic_index: subTopicIdx
      })

      // Update local state immediately for better UX
      setMeeting(prev => ({
        ...prev,
        agenda_items: prev.agenda_items.map(ai => {
          if (ai.id !== agendaItemId) return ai
          const queue = [...(ai.speaking_queue || [])]
          queue[speakerIdx] = {
            ...queue[speakerIdx],
            current_sub_topic_index: subTopicIdx
          }
          return {
            ...ai,
            speaking_queue: queue
          }
        })
      }))
    } catch (err) {
      console.error('Sub-topic update error:', err.response?.data || err.message)
      addToast(err.response?.data?.message || 'Failed to update sub-topic', 'error')
    } finally {
      setQueueLoading(false)
    }
  }

  const handleUpdateSubTopicNotes = async (agendaItemId, speakerIdx, subTopicIdx, notes) => {
    try {
      await api.put(`/meetings/${id}/sub-topic-notes`, {
        agenda_item_id: agendaItemId,
        speaker_index: speakerIdx,
        sub_topic_index: subTopicIdx,
        notes: notes || null,
      })
      setMeeting(prev => ({
        ...prev,
        agenda_items: prev.agenda_items.map(ai => {
          if (ai.id !== agendaItemId) return ai
          const queue = [...(ai.speaking_queue || [])]
          const subTopics = [...(queue[speakerIdx]?.sub_topics || [])]
          if (subTopics[subTopicIdx]) {
            subTopics[subTopicIdx] = { ...subTopics[subTopicIdx], notes }
            queue[speakerIdx] = { ...queue[speakerIdx], sub_topics: subTopics }
          }
          return { ...ai, speaking_queue: queue }
        })
      }))
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update notes', 'error')
    }
  }

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.assignee_id) {
      addToast('Title and assignee are required', 'error')
      return
    }
    setSavingNote(true)
    try {
      await api.post(`/meetings/${id}/action-items`, noteForm)
      addToast('Note saved', 'success')
      setShowNoteModal(false)
      setNoteForm({ title: '', description: '', assignee_id: '', start_date: '', due_date: '', priority: 'medium' })
      fetchActionItems()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save note', 'error')
    } finally {
      setSavingNote(false)
    }
  }

  const handleDeleteActionItem = async (itemId) => {
    if (!confirm('Delete this note?')) return
    try {
      await api.delete(`/meetings/${id}/action-items/${itemId}`)
      setActionItems(prev => prev.filter(a => a.id !== itemId))
      addToast('Note deleted', 'success')
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to delete', 'error')
    }
  }

  const downloadNotesPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    const maxWidth = pageWidth - margin * 2
    let y = 20

    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('Meeting Notes & Action Items', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Meeting: ${meeting?.title || ''}`, margin, y); y += 5
    doc.text(`Date: ${meeting?.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : ''}`, margin, y); y += 5
    doc.text(`Total Items: ${actionItems.length}`, margin, y); y += 8

    doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 6

    if (actionItems.length === 0) {
      doc.setFontSize(12)
      doc.text('No notes recorded.', margin, y)
    } else {
      actionItems.forEach((item, idx) => {
        if (y > 270) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        const titleLines = doc.splitTextToSize(`${idx + 1}. ${item.title}`, maxWidth)
        doc.text(titleLines, margin, y); y += titleLines.length * 6

        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        if (item.description) {
          const descLines = doc.splitTextToSize(`Description: ${item.description}`, maxWidth)
          if (y + descLines.length * 5 > 270) { doc.addPage(); y = 20 }
          doc.text(descLines, margin, y); y += descLines.length * 5
        }
        doc.text(`Assignee: ${item.assignee?.name || 'N/A'}`, margin, y); y += 5
        doc.text(`Assigned By: ${item.assigner?.name || 'N/A'}`, margin, y); y += 5
        if (item.start_date) { doc.text(`Start Date: ${item.start_date}`, margin, y); y += 5 }
        if (item.due_date) { doc.text(`Due Date: ${item.due_date}`, margin, y); y += 5 }
        doc.text(`Status: ${item.status}  |  Priority: ${item.priority}`, margin, y); y += 7
        doc.setDrawColor(230); doc.line(margin, y, pageWidth - margin, y); y += 6
      })
    }

    doc.save(`meeting-${id}-notes.pdf`)
  }

  const downloadMinutesPDF = () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 14
    const maxWidth = pageWidth - margin * 2
    let y = 20

    doc.setFontSize(18)
    doc.setFont(undefined, 'bold')
    doc.text('Meeting Minutes', margin, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont(undefined, 'normal')
    doc.text(`Meeting: ${meeting?.title || ''}`, margin, y); y += 5
    doc.text(`Date: ${meeting?.scheduled_at ? new Date(meeting.scheduled_at).toLocaleString() : ''}`, margin, y); y += 5
    doc.text(`Location: ${meeting?.location || 'N/A'}`, margin, y); y += 8

    doc.setDrawColor(200); doc.line(margin, y, pageWidth - margin, y); y += 6

    const items = meeting?.agenda_items || []
    if (items.length === 0) {
      doc.setFontSize(12)
      doc.text('No agenda items recorded.', margin, y)
    } else {
      items.forEach((item, idx) => {
        if (y > 260) { doc.addPage(); y = 20 }
        doc.setFontSize(13)
        doc.setFont(undefined, 'bold')
        const titleLines = doc.splitTextToSize(`${idx + 1}. ${item.title}`, maxWidth)
        doc.text(titleLines, margin, y); y += titleLines.length * 6

        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        if (item.topic) {
          doc.text(`Topic: ${item.topic}`, margin, y); y += 5
        }
        const minute = item.minutes?.[0]
        if (minute?.content) {
          const contentLines = doc.splitTextToSize(`Discussion: ${minute.content}`, maxWidth)
          if (y + contentLines.length * 5 > 270) { doc.addPage(); y = 20 }
          doc.text(contentLines, margin, y); y += contentLines.length * 5
        }
        if (minute?.decisions) {
          const decisionLines = doc.splitTextToSize(`Decisions: ${minute.decisions}`, maxWidth)
          if (y + decisionLines.length * 5 > 270) { doc.addPage(); y = 20 }
          doc.text(decisionLines, margin, y); y += decisionLines.length * 5
        }

        const queue = item.speaking_queue || []
        const completed = queue.filter(s => s.status === 'completed')
        if (completed.length > 0) {
          doc.setFont(undefined, 'italic')
          doc.text('Speakers:', margin, y); y += 5
          doc.setFont(undefined, 'normal')
          completed.forEach(s => {
            const speakerLines = doc.splitTextToSize(`  - ${s.name}${s.topic ? ` (${s.topic})` : ''}`, maxWidth)
            if (y + speakerLines.length * 5 > 270) { doc.addPage(); y = 20 }
            doc.text(speakerLines, margin, y); y += speakerLines.length * 5
            ;(s.sub_topics || []).forEach(st => {
              if (st.notes) {
                const noteLines = doc.splitTextToSize(`    Notes: ${st.notes}`, maxWidth - 10)
                if (y + noteLines.length * 5 > 270) { doc.addPage(); y = 20 }
                doc.text(noteLines, margin + 10, y); y += noteLines.length * 5
              }
            })
          })
        }

        y += 4
        doc.setDrawColor(230); doc.line(margin, y, pageWidth - margin, y); y += 6
      })
    }

    doc.save(`meeting-${id}-minutes.pdf`)
  }

  const handleRemoveAgendaItem = async (agendaItemId) => {
    if (!confirm('Are you sure you want to remove this agenda item?')) return
    try {
      await api.delete(`/meetings/${id}/agenda-items/${agendaItemId}`)
      addToast('Agenda item removed', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove agenda item', 'error')
    }
  }

  const handleSaveAgendaTitle = async (agendaItemId) => {
    if (!agendaTitleInput.trim()) return
    setSavingAgendaTitle(true)
    try {
      await api.put(`/meetings/${id}/agenda-items/${agendaItemId}`, { title: agendaTitleInput.trim() })
      addToast('Title updated', 'success')
      setEditingAgendaTitle(null)
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to update title', 'error')
    } finally {
      setSavingAgendaTitle(false)
    }
  }

  const handleSaveMinutes = async (agendaItemId) => {
    const entry = minutesMap[agendaItemId]
    if (!entry?.content?.trim()) return
    setSavingMinutesId(agendaItemId)
    try {
      await api.post(`/meetings/${id}/minutes`, {
        agenda_item_id: agendaItemId,
        content: entry.content.trim(),
        decisions: entry.decisions?.trim() || null,
      })
      addToast('Minutes saved', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to save minutes', 'error')
    } finally {
      setSavingMinutesId(null)
    }
  }

  const handleRemoveGroup = async (groupId) => {
    if (!confirm('Are you sure you want to remove this group?')) return
    try {
      await api.delete(`/meetings/${id}/groups/${groupId}`)
      addToast('Group removed', 'success')
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to remove group', 'error')
    }
  }

  const handleAddGroups = async () => {
    const validGroups = newGroups.filter(g => g.name.trim())
    if (validGroups.length === 0) return
    setAddingGroups(true)
    try {
      await api.post(`/meetings/${id}/groups`, { groups: validGroups })
      addToast('Groups added', 'success')
      setShowAddGroup(false)
      setNewGroups([{ name: '', group_type: 'custom' }])
      fetchMeeting()
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to add groups', 'error')
    } finally {
      setAddingGroups(false)
    }
  }

  const existingParticipantIds = new Set(meeting?.participants?.map(p => p.user_id) || [])
  const filteredUsers = users.filter(u =>
    !selectedParticipants.find(p => p.user_id === u.id) &&
    !existingParticipantIds.has(u.id) &&
    (u.name?.toLowerCase().includes(participantSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(participantSearch.toLowerCase()))
  )

  const getStatusIcon = (status) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'declined': return <XCircle className="h-5 w-5 text-red-500" />
      case 'tentative': return <HelpCircle className="h-5 w-5 text-yellow-500" />
      default: return <HelpCircle className="h-5 w-5 text-[var(--text-muted)]" />
    }
  }

  const getRsvpColor = (status) => {
    switch (status) {
      case 'accepted': return 'bg-green-500/15 text-green-600 border-green-500/30'
      case 'declined': return 'bg-red-500/15 text-red-600 border-red-500/30'
      case 'tentative': return 'bg-yellow-500/15 text-yellow-600 border-yellow-500/30'
      default: return 'bg-gray-500/15 text-gray-600 border-gray-500/30'
    }
  }

  const myParticipant = meeting?.participants?.find(p => String(p.user_id) === String(user?.id))
  const isOrganizer = String(meeting?.created_by) === String(user?.id)
  const isChairperson = String(meeting?.chairperson_id) === String(user?.id)
  const isSecretary = String(meeting?.secretary_id) === String(user?.id)
  const isCompleted = meeting?.status === 'completed' || meeting?.status === 'cancelled'
  const canManage = !isCompleted && (hasPermission(user, 'meetings.edit') || isOrganizer || isChairperson)
  const canDelete = hasPermission(user, 'meetings.delete') || isOrganizer
  const canTakeMinutes = !isCompleted && (hasPermission(user, 'meetings.take_minutes') || isSecretary || isOrganizer)
  const canViewAllAgenda = hasPermission(user, 'meetings.edit') || isOrganizer || isChairperson || isSecretary
  const visibleAgendaItems = canViewAllAgenda
    ? (meeting?.agenda_items || [])
    : (meeting?.agenda_items || []).filter(item => {
        const isPresenter = String(item.presenter_id) === String(user?.id)
        const inQueue = (item.speaking_queue || []).some(q => String(q.user_id) === String(user?.id))
        return isPresenter || inQueue
      })

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gold-600 border-t-transparent" />
      </div>
    )
  }

  if (!meeting) {
    return (
      <div className="flex h-64 flex-col items-center justify-center text-[var(--text-muted)]">
        <p>Meeting not found</p>
        <button
          onClick={() => navigate('/meetings')}
          className="mt-4 text-gold-600 hover:underline"
        >
          Back to meetings
        </button>
      </div>
    )
  }

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
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">{meeting.title}</h1>
            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
              meeting.status === 'ongoing' ? 'bg-green-500/15 text-green-600' :
              meeting.status === 'completed' ? 'bg-gray-500/15 text-[var(--text-secondary)]' :
              meeting.status === 'cancelled' ? 'bg-red-500/15 text-red-600' :
              'bg-blue-500/15 text-blue-600'
            }`}>
              {meeting.status}
            </span>
          </div>
        </div>
        {canManage && meeting.status === 'scheduled' && (
          <button
            onClick={startMeeting}
            className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
          >
            <Play className="h-4 w-4" /> Start Meeting
          </button>
        )}
        {canManage && meeting.status === 'ongoing' && (
          <button
            onClick={endMeeting}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            <Square className="h-4 w-4" /> End Meeting
          </button>
        )}
        {canDelete && (
          <button
            onClick={handleDeleteMeeting}
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b border-[var(--border-color)]">
        {['details', 'participants', 'agenda', 'minutes', 'live', 'notes'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === tab
                ? 'border-b-2 border-gold-600 text-gold-600'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'details' && (
        <div className="space-y-6">
          <div className="glass rounded-lg p-6 space-y-4">
            <p className="text-[var(--text-secondary)]">{meeting.description}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Calendar className="h-4 w-4" />
                {new Date(meeting.scheduled_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Clock className="h-4 w-4" />
                {meeting.meeting_type}
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <MapPin className="h-4 w-4" />
                {meeting.location || meeting.meeting_link || 'TBD'}
              </div>
              <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                <Users className="h-4 w-4" />
                {meeting.mode}
              </div>
            </div>
          </div>

          {myParticipant && meeting.status === 'scheduled' && (
            <div className="glass rounded-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Your Response</h3>
              <div className="flex gap-3">
                {['accepted', 'declined', 'tentative'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleRSVP(status)}
                    disabled={rsvpLoading || myParticipant.rsvp_status === status}
                    className={`flex-1 rounded-lg border-2 py-3 text-sm font-medium transition-colors ${
                      myParticipant.rsvp_status === status
                        ? getRsvpColor(status)
                        : 'border-[var(--border-color)] hover:border-gold-500/40'
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {meeting.status === 'ongoing' && myParticipant?.rsvp_status === 'accepted' && !myParticipant?.checkin_at && (
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <UserCheck className="h-6 w-6 text-green-500" />
                  <div>
                    <h3 className="font-semibold text-green-400">Meeting is in progress</h3>
                    <p className="text-sm text-green-300">Please check in to confirm your attendance</p>
                  </div>
                </div>
                <button
                  onClick={handleCheckin}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Check In
                </button>
              </div>
            </div>
          )}

          <div className="glass rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Groups</h3>
              {canManage && (
                <button
                  onClick={() => setShowAddGroup(true)}
                  className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"
                >
                  <Plus className="h-4 w-4" /> Add Group
                </button>
              )}
            </div>
            {meeting.groups?.length > 0 ? meeting.groups.map((group) => (
                <div key={group.id} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="font-medium text-[var(--text-primary)]">{group.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-gold-600/10 px-2 py-0.5 text-xs text-gold-600 capitalize">{group.group_type}</span>
                      {canManage && (
                        <button
                          onClick={() => handleRemoveGroup(group.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  {group.participants?.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {group.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1">
                          <div className="h-6 w-6 rounded-full bg-gold-600/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-gold-600">{p.user?.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-[var(--text-primary)]">{p.user?.name}</span>
                          <span className="text-xs text-[var(--text-muted)] capitalize">{p.role}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-[var(--text-muted)]">No members assigned</p>
                  )}
                </div>
              )) : (
                <p className="text-sm text-[var(--text-muted)]">No groups created yet.</p>
              )}
          </div>
        </div>
      )}

      {activeTab === 'participants' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={openAddParticipants}
                className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500"
              >
                <Plus className="h-4 w-4" /> Add Participants
              </button>
            </div>
          )}

          {/* Attendance Summary */}
          {(() => {
            const total = meeting.participants?.length || 0
            const checkedIn = meeting.participants?.filter(p => p.checkin_at).length || 0
            const accepted = meeting.participants?.filter(p => p.rsvp_status === 'accepted').length || 0
            return (
              <div className="grid grid-cols-3 gap-4">
                <div className="glass rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--text-primary)]">{total}</p>
                  <p className="text-xs text-[var(--text-muted)]">Total Invited</p>
                </div>
                <div className="glass rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gold-600">{accepted}</p>
                  <p className="text-xs text-[var(--text-muted)]">Accepted</p>
                </div>
                <div className="glass rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{checkedIn}</p>
                  <p className="text-xs text-[var(--text-muted)]">Checked In</p>
                </div>
              </div>
            )
          })()}

          {/* Checked-in list */}
          {meeting.participants?.some(p => p.checkin_at) && (
            <div className="glass rounded-lg p-4">
              <h4 className="mb-3 text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-green-600" />
                Checked In Participants
              </h4>
              <div className="flex flex-wrap gap-2">
                {meeting.participants?.filter(p => p.checkin_at).map((participant) => (
                  <div key={participant.id} className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1">
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <span className="text-xs font-medium text-green-700">{participant.user?.name?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <span className="text-sm text-green-700">{participant.user?.name}</span>
                    <span className="text-xs text-green-600/70">{new Date(participant.checkin_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="glass rounded-lg">
            <div className="divide-y divide-[var(--border-color)]">
              {meeting.participants?.map((participant) => (
              <div key={participant.id} className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full bg-gold-600/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-gold-600">
                        {participant.user?.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    {participant.checkin_at && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--bg-surface)] bg-green-500" title="Checked in" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{participant.user?.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">{participant.role}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {participant.group && (
                    <span className="rounded-full bg-gold-600/10 px-2 py-0.5 text-xs text-gold-600">{participant.group.name}</span>
                  )}
                  {participant.checkin_at ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" /> Checked in
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--text-muted)]">Not checked in</span>
                  )}
                  {getStatusIcon(participant.rsvp_status)}
                  {canManage && (
                    <button
                      onClick={() => removeParticipantFromMeeting(participant.id)}
                      className="rounded p-1 text-red-500 hover:bg-red-500/10"
                      title="Remove participant"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'agenda' && (
        <div className="space-y-4">
          {canManage && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowAddAgenda(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500"
              >
                <Plus className="h-4 w-4" /> Add Agenda Item
              </button>
            </div>
          )}
          {!visibleAgendaItems.length && (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-[var(--text-muted)]">No agenda items for this meeting.</p>
            </div>
          )}
          {visibleAgendaItems.map((item) => {
            const queue = item.speaking_queue || []
            const queuedParticipants = meeting.participants?.filter(p => !queue.find(q => String(q.user_id) === String(p.user_id))) || []
            const isPresenter = String(item.presenter_id) === String(user?.id)
            const canEditTitle = !isCompleted && (isPresenter || canManage)
            const hasVisibleSpeakers = queue.length > 0 && (canViewAllAgenda || queue.some(q => String(q.user_id) === String(user?.id)))
            const originalIndex = (meeting.agenda_items || []).findIndex(i => i.id === item.id)
            return (
              <div key={item.id} className="glass rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-4">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-600/10 text-sm font-medium text-gold-600">
                    {originalIndex + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      {editingAgendaTitle === item.id ? (
                        <div className="flex flex-1 items-center gap-2">
                          <input
                            type="text"
                            value={agendaTitleInput}
                            onChange={(e) => setAgendaTitleInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveAgendaTitle(item.id)}
                            className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveAgendaTitle(item.id)}
                            disabled={savingAgendaTitle}
                            className="rounded bg-gold-600 px-2 py-1 text-xs text-white hover:bg-gold-500 disabled:opacity-50"
                          >
                            {savingAgendaTitle ? '...' : 'Save'}
                          </button>
                          <button
                            onClick={() => setEditingAgendaTitle(null)}
                            className="rounded border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-1 items-center gap-2">
                          <h4 className="text-sm font-medium text-[var(--text-primary)]">{item.title}</h4>
                          {canEditTitle && (
                            <button
                              onClick={() => { setEditingAgendaTitle(item.id); setAgendaTitleInput(item.title) }}
                              className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                            >
                              <Pencil className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                      {canManage && (
                        <button
                          onClick={() => handleRemoveAgendaItem(item.id)}
                          className="rounded p-1 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    {item.description && (
                      <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.description}</p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {item.duration_minutes} mins
                      </span>
                      {item.presenter && (
                        <span>Presenter: {item.presenter.name}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-sm font-semibold text-[var(--text-primary)]">Speaking Queue</h5>
                    {canTakeMinutes && queue.length > 0 && (
                      <button
                        onClick={() => saveAgendaSpeakingQueue(item.id)}
                        disabled={queueLoading}
                        className="rounded bg-gold-600 px-3 py-1 text-xs text-white hover:bg-gold-500 disabled:opacity-50"
                      >
                        {queueLoading ? 'Saving...' : 'Save'}
                      </button>
                    )}
                  </div>

                  {meeting.status === 'ongoing' && canTakeMinutes && queuedParticipants.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {queuedParticipants.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => addToQueue(item.id, p)}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-1 text-xs text-[var(--text-primary)] hover:border-gold-500"
                        >
                          <Plus className="h-3 w-3" />
                          {p.user?.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {hasVisibleSpeakers ? (
                    <div className="space-y-2">
                      {queue.map((speaker, idx) => {
                        const isVisible = canViewAllAgenda || String(speaker.user_id) === String(user?.id)
                        if (!isVisible) return null
                        const isCurrentUser = String(speaker.user_id) === String(user?.id)
                        const canEditSpeaker = !isCompleted && (isCurrentUser || canTakeMinutes)
                        return (
                        <div key={idx} className={`rounded-lg border px-3 py-2 space-y-2 ${
                          speaker.status === 'speaking'
                            ? 'border-green-500/30 bg-green-500/10'
                            : speaker.status === 'completed'
                            ? 'border-[var(--border-color)] bg-[var(--bg-surface)] opacity-60'
                            : 'border-[var(--border-color)] bg-[var(--bg-surface)]'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gold-600/10 text-xs font-medium text-gold-600">
                                {speaker.order}
                              </span>
                              <div>
                                <span className="text-sm font-medium text-[var(--text-primary)]">{speaker.name}</span>
                                <span className={`ml-2 rounded-full px-2 py-0.5 text-xs capitalize ${
                                  speaker.status === 'speaking'
                                    ? 'bg-green-500/15 text-green-600'
                                    : speaker.status === 'completed'
                                    ? 'bg-gray-500/15 text-gray-500'
                                    : 'bg-blue-500/15 text-blue-600'
                                }`}>
                                  {speaker.status}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              {canEditSpeaker && (
                                <button
                                  onClick={() => openEditSpeaker(item.id, idx)}
                                  className="rounded px-2 py-1 text-xs text-gold-600 hover:bg-gold-600/10"
                                >
                                  Edit Info
                                </button>
                              )}
                              {canTakeMinutes && meeting.status === 'ongoing' && (
                                <>
                                  {speaker.status === 'queued' && (
                                    <button
                                      onClick={() => handleSpeakerStatusChange(item.id, idx, 'speaking')}
                                      className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700"
                                    >
                                      Start
                                    </button>
                                  )}
                                  {speaker.status === 'speaking' && (
                                    <button
                                      onClick={() => handleSpeakerStatusChange(item.id, idx, 'completed')}
                                      className="rounded bg-gray-600 px-2 py-1 text-xs text-white hover:bg-gray-700"
                                    >
                                      Done
                                    </button>
                                  )}
                                  <button
                                    onClick={() => moveQueueItem(item.id, idx, 'up')}
                                    disabled={idx === 0}
                                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-30"
                                  >
                                    ▲
                                  </button>
                                  <button
                                    onClick={() => moveQueueItem(item.id, idx, 'down')}
                                    disabled={idx === queue.length - 1}
                                    className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)] disabled:opacity-30"
                                  >
                                    ▼
                                  </button>
                                  <button
                                    onClick={() => removeFromQueue(item.id, idx)}
                                    className="rounded p-1 text-red-500 hover:bg-red-500/10"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {speaker.topic && (
                            <div className="ml-9">
                              <p className="text-xs font-medium text-[var(--text-primary)]">{speaker.topic}</p>
                            </div>
                          )}
                          {speaker.sub_topics?.length > 0 && (
                            <div className="ml-9 space-y-2">
                              {speaker.sub_topics.map((st, sti) => (
                                <div key={sti} className="space-y-1">
                                  {st.title && <p className="text-xs text-[var(--text-muted)]">Sub topic: <span className="text-[var(--text-secondary)]">{st.title}</span></p>}
                                  {st.description && <p className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{st.description}</p>}
                                  {st.files?.length > 0 && (
                                    <div className="flex flex-wrap gap-2">
                                      {st.files.map((f, fi) => (
                                        <button
                                          key={fi}
                                          onClick={() => openFileViewer(f)}
                                          className="inline-flex items-center gap-1 rounded border border-[var(--border-color)] bg-[var(--bg-elevated)] px-2 py-1 text-xs text-[var(--text-primary)] hover:border-gold-500"
                                        >
                                          <FileText className="h-3 w-3" />
                                          {f.name}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {st.actions?.length > 0 && (
                                    <div className="rounded border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 space-y-1">
                                      <p className="text-xs font-medium text-[var(--text-primary)]">Action Items</p>
                                      {st.actions.map((action, ai) => (
                                        <div key={ai} className="text-xs text-[var(--text-muted)]">
                                          <span className="font-medium text-[var(--text-secondary)]">{getUserNameById(action.user_id)}</span>
                                          {action.start_date && <span className="ml-2">Start: {action.start_date}</span>}
                                          {action.due_date && <span className="ml-2">Due: {action.due_date}</span>}
                                          {action.task && <p className="mt-0.5 whitespace-pre-wrap">{action.task}</p>}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--text-muted)]">No speakers assigned yet.</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'minutes' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={downloadMinutesPDF}
              className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
            >
              <Download className="h-4 w-4" /> Download PDF
            </button>
          </div>
          {meeting.agenda_items?.length === 0 && (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-[var(--text-muted)]">No agenda items to record minutes for.</p>
            </div>
          )}
          {meeting.agenda_items?.map((item, index) => {
            const entry = minutesMap[item.id] || { content: '', decisions: '' }
            const existing = item.minutes?.[0]
            const isLocked = existing?.locked_at
            const canEdit = canTakeMinutes && !isLocked
            return (
              <div key={item.id} className="glass rounded-lg p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-gold-600/10 text-xs font-medium text-gold-600">
                    {index + 1}
                  </span>
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-[var(--text-primary)]">{item.title}</h4>
                    {item.presenter && (
                      <span className="text-xs text-[var(--text-muted)]">Presenter: {item.presenter.name}</span>
                    )}
                  </div>
                  {isLocked && (
                    <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-xs text-green-600">Locked</span>
                  )}
                </div>

                {canEdit ? (
                  <div className="space-y-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Minutes / Discussion Notes</label>
                      <textarea
                        value={entry.content}
                        onChange={(e) => setMinutesMap(prev => ({ ...prev, [item.id]: { ...prev[item.id], content: e.target.value } }))}
                        placeholder="Write discussion notes, key points, and outcomes..."
                        rows={4}
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Decisions / Action Items</label>
                      <textarea
                        value={entry.decisions}
                        onChange={(e) => setMinutesMap(prev => ({ ...prev, [item.id]: { ...prev[item.id], decisions: e.target.value } }))}
                        placeholder="Record decisions made and action items assigned..."
                        rows={2}
                        className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      {existing?.recorder && (
                        <span className="text-xs text-[var(--text-muted)]">
                          Last recorded by {existing.recorder.name}
                        </span>
                      )}
                      <button
                        onClick={() => handleSaveMinutes(item.id)}
                        disabled={savingMinutesId === item.id || !entry.content.trim()}
                        className="ml-auto rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-500 disabled:opacity-50"
                      >
                        {savingMinutesId === item.id ? 'Saving...' : 'Save Minutes'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {existing?.content ? (
                      <>
                        <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
                          <h5 className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Discussion Notes</h5>
                          <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{existing.content}</p>
                        </div>
                        {existing.decisions && (
                          <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
                            <h5 className="mb-1 text-xs font-medium text-[var(--text-secondary)]">Decisions</h5>
                            <p className="whitespace-pre-wrap text-sm text-[var(--text-primary)]">{existing.decisions}</p>
                          </div>
                        )}
                        {existing.recorder && (
                          <p className="text-xs text-[var(--text-muted)]">
                            Recorded by {existing.recorder.name} {existing.created_at && new Date(existing.created_at).toLocaleDateString()}
                          </p>
                        )}
                      </>
                    ) : (
                      <p className="text-sm text-[var(--text-muted)]">No minutes recorded yet.</p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'live' && (
        <div className="space-y-6">
          {!meeting.agenda_items?.some(item => {
            const queue = item.speaking_queue || []
            return queue.some(s => s.status === 'speaking' || s.status === 'completed')
          }) && (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-[var(--text-muted)]">No one is speaking right now.</p>
            </div>
          )}
          {meeting.agenda_items?.filter(item => {
            const queue = item.speaking_queue || []
            return queue.some(s => s.status === 'speaking' || s.status === 'completed')
          }).map((item) => {
            const queue = item.speaking_queue || []
            const current = queue.find(s => s.status === 'speaking')
            const upcoming = queue.filter(s => s.status === 'queued').sort((a, b) => a.order - b.order)
            const completed = queue.filter(s => s.status === 'completed').sort((a, b) => a.order - b.order)
            const currentIdx = queue.findIndex(s => s.status === 'speaking')
            const isCurrentSpeaker = current && String(current.user_id) === String(user?.id)
            const originalIndex = (meeting.agenda_items || []).findIndex(i => i.id === item.id)

            return (
              <div key={item.id} className="glass rounded-xl p-6 space-y-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-gold-600 to-gold-700 text-sm font-semibold text-white shadow-lg shadow-gold-600/20">
                    {originalIndex + 1}
                  </span>
                  <h4 className="text-base font-semibold text-[var(--text-primary)]">{item.title}</h4>
                </div>

                {current ? (
                  <div className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-green-500/10 p-5 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-green-600">
                        <div className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <Mic className="h-3.5 w-3.5" /> Currently Speaking
                      </div>
                      <div className="flex items-center gap-2">
                        {isCurrentSpeaker && (
                          <button
                            onClick={() => openEditSpeaker(item.id, currentIdx)}
                            className="rounded-lg px-3 py-1.5 text-xs font-medium text-gold-600 hover:bg-gold-600/10 transition-colors"
                          >
                            Edit Topic
                          </button>
                        )}
                        <button
                          onClick={() => handleSpeakerStatusChange(item.id, currentIdx, 'completed')}
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-green-600 bg-green-500/10 hover:bg-green-500/20 transition-colors"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30">
                        <span className="text-base font-semibold text-white">{current.name?.charAt(0)}</span>
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-[var(--text-primary)]">{current.name}</p>
                        {(() => {
                          const subIdx = current.current_sub_topic_index ?? 0
                          const sub = current.sub_topics?.[subIdx]
                          if (sub?.title) return <p className="text-sm text-green-600 mt-1">{sub.title}</p>
                          return null
                        })()}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-5 text-center">
                    <p className="text-sm text-[var(--text-muted)]">No one is speaking right now.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">Topics</p>
                  <div className="space-y-2">
                    {current && (current.topic || current.sub_topics?.length > 0) && (
                      <div className="space-y-2">
                        {current.topic && (
                          <div
                            onClick={isCurrentSpeaker ? () => openEditSpeaker(item.id, currentIdx) : undefined}
                            className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 transition-all ${isCurrentSpeaker ? 'cursor-pointer hover:border-gold-500/30 hover:shadow-sm' : ''}`}
                          >
                            <p className="text-sm font-semibold text-[var(--text-primary)]">{current.topic}</p>
                          </div>
                        )}
                        {current.sub_topics?.map((st, sti) => {
                          const isCurrent = (current.current_sub_topic_index ?? 0) === sti
                          return (
                            <div
                              key={sti}
                              onClick={isCurrentSpeaker ? () => handleSubTopicClick(item.id, currentIdx, sti) : undefined}
                              className={`rounded-xl border px-4 py-3 space-y-2 transition-all ${isCurrent ? 'border-gold-500 bg-gold-500/5' : 'border-[var(--border-color)] bg-[var(--bg-surface)]'} ${isCurrentSpeaker ? 'cursor-pointer hover:border-gold-500/30 hover:shadow-sm' : ''}`}
                            >
                              {st.title && <p className="text-sm font-semibold text-[var(--text-primary)]">{st.title}</p>}
                              {st.description && <p className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{st.description}</p>}
                              {st.files?.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {st.files.map((f, fi) => (
                                    <button
                                      key={fi}
                                      onClick={(e) => { e.stopPropagation(); openFileViewer(f) }}
                                      className="inline-flex items-center gap-1.5 text-xs text-gold-600 hover:text-gold-500"
                                    >
                                      <FileText className="h-3 w-3" /> {f.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              <div onClick={(e) => e.stopPropagation()}>
                                <textarea
                                  defaultValue={st.notes || ''}
                                  onBlur={(e) => handleUpdateSubTopicNotes(item.id, currentIdx, sti, e.target.value)}
                                  placeholder="Notes..."
                                  rows={2}
                                  className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                                />
                              </div>
                              {st.actions?.length > 0 && (
                                <div className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
                                  <p className="text-xs font-medium text-[var(--text-primary)]">Action Items</p>
                                  {st.actions.map((action, ai) => (
                                    <div key={ai} className="text-xs text-[var(--text-muted)]">
                                      <span className="font-medium text-[var(--text-secondary)]">{getUserNameById(action.user_id)}</span>
                                      {action.start_date && <span className="ml-2">Start: {action.start_date}</span>}
                                      {action.due_date && <span className="ml-2">Due: {action.due_date}</span>}
                                      {action.task && <p className="mt-0.5 whitespace-pre-wrap">{action.task}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {completed.map((speaker) => (
                      (speaker.topic || speaker.sub_topics?.length > 0) && (
                        <div key={speaker.order} className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] px-4 py-3 opacity-60 space-y-1">
                          {speaker.topic && <p className="text-sm font-medium text-[var(--text-secondary)]">{speaker.topic}</p>}
                          {speaker.sub_topics?.map((st, sti) => (
                            <div key={sti} className="space-y-1">
                              {st.title && <p className="text-xs text-[var(--text-muted)]">{st.title}</p>}
                              {st.description && <p className="text-xs text-[var(--text-muted)] whitespace-pre-wrap">{st.description}</p>}
                              {st.actions?.length > 0 && (
                                <div className="rounded border border-[var(--border-color)] bg-[var(--bg-elevated)] p-2 space-y-1">
                                  <p className="text-xs font-medium text-[var(--text-primary)]">Action Items</p>
                                  {st.actions.map((action, ai) => (
                                    <div key={ai} className="text-xs text-[var(--text-muted)]">
                                      <span className="font-medium text-[var(--text-secondary)]">{getUserNameById(action.user_id)}</span>
                                      {action.start_date && <span className="ml-2">Start: {action.start_date}</span>}
                                      {action.due_date && <span className="ml-2">Due: {action.due_date}</span>}
                                      {action.task && <p className="mt-0.5 whitespace-pre-wrap">{action.task}</p>}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {activeTab === 'live' && (
        <button
          onClick={() => setShowNoteModal(true)}
          className="fixed bottom-8 right-8 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gold-600 text-white shadow-lg hover:bg-gold-500 transition-all hover:scale-110"
          title="Add Note"
        >
          <MessageSquare className="h-6 w-6" />
          {actionItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {actionItems.length}
            </span>
          )}
        </button>
      )}

      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Notes & Action Items</h3>
            <div className="flex items-center gap-2">
              {actionItems.length > 0 && (
                <button
                  onClick={downloadNotesPDF}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
                >
                  <Download className="h-4 w-4" /> PDF
                </button>
              )}
              <button
                onClick={() => setShowNoteModal(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500"
              >
                <Plus className="h-4 w-4" /> Add Note
              </button>
            </div>
          </div>

          {actionItems.length === 0 && (
            <div className="glass rounded-lg p-8 text-center">
              <p className="text-[var(--text-muted)]">No notes yet. Click "Add Note" to create one.</p>
            </div>
          )}

          <div className="space-y-3">
            {actionItems.map((item) => (
              <div key={item.id} className="glass rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-[var(--text-primary)]">{item.title}</h4>
                    {item.description && (
                      <p className="mt-1 text-sm text-[var(--text-muted)] whitespace-pre-wrap">{item.description}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteActionItem(item.id)}
                    className="ml-2 rounded p-1 text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-1">
                    <UserCheck className="h-3 w-3" />
                    Assignee: <span className="font-medium text-[var(--text-secondary)]">{item.assignee?.name || 'Unknown'}</span>
                  </span>
                  <span>By: <span className="font-medium text-[var(--text-secondary)]">{item.assigner?.name || 'Unknown'}</span></span>
                  {item.start_date && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Start: {item.start_date}
                    </span>
                  )}
                  {item.due_date && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Due: {item.due_date}
                    </span>
                  )}
                  <span className={`rounded px-2 py-0.5 font-medium ${
                    item.status === 'completed' ? 'bg-green-500/10 text-green-600' :
                    item.status === 'in_progress' ? 'bg-blue-500/10 text-blue-600' :
                    item.status === 'overdue' ? 'bg-red-500/10 text-red-600' :
                    'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}>
                    {item.status}
                  </span>
                  {item.priority && (
                    <span className={`rounded px-2 py-0.5 font-medium ${
                      item.priority === 'urgent' ? 'bg-red-500/10 text-red-600' :
                      item.priority === 'high' ? 'bg-orange-500/10 text-orange-600' :
                      item.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-600' :
                      'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}>
                      {item.priority}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {showNoteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Note</h3>
              <button
                onClick={() => setShowNoteModal(false)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Title *</label>
                <input
                  type="text"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Note title..."
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Description</label>
                <textarea
                  value={noteForm.description}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the task..."
                  rows={3}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Assign To *</label>
                <select
                  value={noteForm.assignee_id}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, assignee_id: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                >
                  <option value="">Select user...</option>
                  {meeting?.participants?.map(p => (
                    <option key={p.user_id} value={p.user_id}>{p.user?.name || p.name}</option>
                  ))}
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Start Date</label>
                  <input
                    type="date"
                    value={noteForm.start_date}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, start_date: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Due Date</label>
                  <input
                    type="date"
                    value={noteForm.due_date}
                    onChange={(e) => setNoteForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--text-secondary)]">Priority</label>
                <select
                  value={noteForm.priority}
                  onChange={(e) => setNoteForm(prev => ({ ...prev, priority: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => setShowNoteModal(false)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={savingNote}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
              >
                {savingNote ? 'Saving...' : 'Submit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddParticipants && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Participants</h3>
              <button
                onClick={() => setShowAddParticipants(false)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="relative mb-4">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
                <Search className="h-4 w-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={participantSearch}
                  onChange={(e) => setParticipantSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
                />
              </div>

              {participantSearch && filteredUsers.length > 0 && (
                <div className="absolute z-10 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] shadow-lg">
                  {filteredUsers.slice(0, 10).map(user => (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => addParticipant(user)}
                      className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-[var(--bg-elevated)]"
                    >
                      <div className="h-8 w-8 rounded-full bg-gold-600/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-gold-600">{user.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--text-primary)]">{user.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">{user.email}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {participantSearch && filteredUsers.length === 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-muted)] shadow-lg">
                  No users found
                </div>
              )}
            </div>

            {selectedParticipants.length > 0 && (
              <div className="mb-4 max-h-48 space-y-2 overflow-auto">
                {selectedParticipants.map((participant) => (
                  <div key={participant.user_id} className="flex items-center justify-between rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-gold-600/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-gold-600">{participant.name?.charAt(0)?.toUpperCase()}</span>
                      </div>
                      <span className="text-sm font-medium text-[var(--text-primary)]">{participant.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <select
                        value={participant.group_id}
                        onChange={(e) => updateParticipantGroup(participant.user_id, e.target.value)}
                        className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                      >
                        <option value="">No Group</option>
                        {meeting.groups?.map(g => (
                          <option key={g.id} value={g.id}>{g.name}</option>
                        ))}
                      </select>
                      <select
                        value={participant.role}
                        onChange={(e) => updateParticipantRole(participant.user_id, e.target.value)}
                        className="rounded border border-[var(--border-color)] bg-[var(--bg-surface)] px-2 py-1 text-xs text-[var(--text-primary)] focus:border-gold-500 focus:outline-none"
                      >
                        <option value="participant">Participant</option>
                        <option value="chairperson">Chairperson</option>
                        <option value="secretary">Secretary</option>
                        <option value="observer">Observer</option>
                        <option value="approver">Approver</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeParticipant(participant.user_id)}
                        className="rounded p-1 text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddParticipants(false)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddParticipants}
                disabled={selectedParticipants.length === 0 || addingParticipants}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
              >
                {addingParticipants ? 'Adding...' : `Add ${selectedParticipants.length > 0 ? selectedParticipants.length : ''} Participants`}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddAgenda && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl max-h-[90vh] overflow-auto">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Agenda Items</h3>
              <button
                onClick={() => setShowAddAgenda(false)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 space-y-6">
              {newAgendaItems.map((item, index) => (
                <div key={index} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gold-600">Item {index + 1}</span>
                    {newAgendaItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeNewAgendaItem(index)}
                        className="rounded p-1 text-red-500 hover:bg-red-500/10"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <div className="flex-1">
                      <input
                        type="text"
                        placeholder="Agenda item title"
                        value={item.title}
                        onChange={(e) => updateNewAgendaItem(index, 'title', e.target.value)}
                        className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                    <div className="w-24">
                      <input
                        type="number"
                        placeholder="Mins"
                        value={item.duration_minutes}
                        onChange={(e) => updateNewAgendaItem(index, 'duration_minutes', parseInt(e.target.value) || 15)}
                        className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Speaker / Presenter</label>
                    <select
                      value={item.presenter_id}
                      onChange={(e) => updateNewAgendaItem(index, 'presenter_id', e.target.value)}
                      className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                    >
                      <option value="">Select a participant...</option>
                      {meeting.participants?.map((p) => (
                        <option key={p.user_id} value={p.user_id}>{p.user?.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Speaking Topic</label>
                    <input
                      type="text"
                      placeholder="What will they speak about?"
                      value={item.topic}
                      onChange={(e) => updateNewAgendaItem(index, 'topic', e.target.value)}
                      className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--text-muted)] mb-1">Sub-topics</label>
                    <div className="space-y-2">
                      {item.sub_topics.map((st, sti) => (
                        <div key={sti} className="space-y-2">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder={`Sub-topic ${sti + 1} title`}
                              value={st.title}
                              onChange={(e) => updateNewAgendaSubTopic(index, sti, 'title', e.target.value)}
                              className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                            />
                            {item.sub_topics.length > 1 && (
                              <button onClick={() => removeNewAgendaSubTopic(index, sti)} className="rounded p-1 text-red-500 hover:bg-red-500/10">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <textarea
                            placeholder="Description (optional)"
                            value={st.description}
                            onChange={(e) => updateNewAgendaSubTopic(index, sti, 'description', e.target.value)}
                            rows={2}
                            className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                          />
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => addNewAgendaSubTopic(index)}
                      className="mt-2 inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1 text-xs text-gold-600 hover:bg-gold-600/10"
                    >
                      <Plus className="h-3 w-3" /> Add Sub-topic
                    </button>
                  </div>

                  <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-sm font-medium text-[var(--text-primary)]">Main Files</label>
                      <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-gold-600 px-3 py-1.5 text-xs text-white hover:bg-gold-500">
                        <Plus className="h-3 w-3" />
                        {uploadingMainFile === index ? 'Uploading...' : 'Upload File'}
                        <input
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt"
                          disabled={uploadingMainFile === index}
                          onChange={(e) => handleUploadAgendaMainFile(index, e.target.files[0])}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">Upload PDF, Word, PowerPoint, Excel, or image files to attach to this agenda item</p>
                    {(item.main_files || []).length > 0 && (
                      <ul className="space-y-2">
                        {(item.main_files || []).map((f, fi) => (
                          <li key={fi} className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2">
                            <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                            <span className="flex-1 text-sm text-[var(--text-primary)] truncate">{f.name}</span>
                            <button onClick={() => removeAgendaMainFile(index, fi)} className="text-red-500 hover:text-red-400">
                              <X className="h-4 w-4" />
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addNewAgendaItem}
              className="mb-4 inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"
            >
              <Plus className="h-4 w-4" /> Add Another Item
            </button>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddAgenda(false)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddAgendaItems}
                disabled={addingAgenda || !newAgendaItems.some(i => i.title.trim() && i.presenter_id)}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
              >
                {addingAgenda ? 'Adding...' : 'Add Agenda Items'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Add Groups</h3>
              <button
                onClick={() => setShowAddGroup(false)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mb-4 space-y-3 max-h-64 overflow-auto">
              {newGroups.map((group, index) => (
                <div key={index} className="flex gap-3 items-start">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Group name (e.g. BSO, HOD, MD)"
                      value={group.name}
                      onChange={(e) => updateNewGroup(index, 'name', e.target.value)}
                      className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                    />
                  </div>
                  <select
                    value={group.group_type}
                    onChange={(e) => updateNewGroup(index, 'group_type', e.target.value)}
                    className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                  >
                    <option value="custom">Custom</option>
                    <option value="department">Department</option>
                    <option value="role_based">Role Based</option>
                  </select>
                  {newGroups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeNewGroup(index)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addNewGroup}
              className="mb-4 inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/10"
            >
              <Plus className="h-4 w-4" /> Add Group
            </button>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddGroup(false)}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddGroups}
                disabled={addingGroups || !newGroups.some(g => g.name.trim())}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
              >
                {addingGroups ? 'Adding...' : 'Add Groups'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingSpeaker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                Edit Info - {editingSpeaker.name}
              </h3>
              <button
                onClick={() => setEditingSpeaker(null)}
                className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[70vh] overflow-auto">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">Title</label>
                <input
                  type="text"
                  placeholder="Speaking title"
                  value={speakerTopic}
                  onChange={(e) => setSpeakerTopic(e.target.value)}
                  className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-[var(--text-primary)]">Sub Topics</label>
                  <button
                    type="button"
                    onClick={addSpeakerSubTopic}
                    className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-3 py-1.5 text-sm text-gold-600 hover:bg-gold-600/20"
                  >
                    <Plus className="h-4 w-4" /> Add Sub Topic
                  </button>
                </div>
                {speakerSubTopics.map((st, subIndex) => (
                  <div key={subIndex} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--text-primary)]">Sub Topic {subIndex + 1}</span>
                      {speakerSubTopics.length > 1 && (
                        <button
                          onClick={() => removeSpeakerSubTopic(subIndex)}
                          className="rounded p-1 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Sub topic title"
                        value={st.title}
                        onChange={(e) => updateSpeakerSubTopic(subIndex, 'title', e.target.value)}
                        className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                    <div>
                      <textarea
                        placeholder="Description (optional)"
                        value={st.description}
                        onChange={(e) => updateSpeakerSubTopic(subIndex, 'description', e.target.value)}
                        rows={3}
                        className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-[var(--text-primary)]">Files</label>
                        <button
                          type="button"
                          onClick={() => addSpeakerSubTopicFile(subIndex)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-2 py-1 text-xs text-gold-600 hover:bg-gold-600/20"
                        >
                          <Plus className="h-3 w-3" /> Add File
                        </button>
                      </div>
                      {st.files.map((f, fileIndex) => (
                        <div key={fileIndex} className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3 space-y-3">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="File name"
                              value={f.name}
                              onChange={(e) => updateSpeakerSubTopicFile(subIndex, fileIndex, 'name', e.target.value)}
                              className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                            />
                            <button
                              onClick={() => removeSpeakerSubTopicFile(subIndex, fileIndex)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="File URL"
                              value={f.url}
                              onChange={(e) => updateSpeakerSubTopicFile(subIndex, fileIndex, 'url', e.target.value)}
                              className="flex-1 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                            />
                            <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-gold-600/10 px-4 py-2 text-sm text-gold-600 hover:bg-gold-600/20">
                              <Plus className="h-4 w-4" />
                              Upload
                              <input
                                type="file"
                                className="hidden"
                                onChange={(e) => handleUploadSpeakerFile(subIndex, fileIndex, e.target.files[0])}
                                disabled={uploadingFile === `${subIndex}-${fileIndex}`}
                              />
                            </label>
                          </div>
                          {uploadingFile === `${subIndex}-${fileIndex}` && (
                            <p className="text-xs text-[var(--text-muted)]">Uploading...</p>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] p-3">
                      <div className="flex items-center justify-between">
                        <label className="block text-sm font-medium text-[var(--text-primary)]">Action Items</label>
                        <button
                          type="button"
                          onClick={() => addSpeakerSubTopicAction(subIndex)}
                          className="inline-flex items-center gap-1 rounded-lg bg-gold-600/10 px-2 py-1 text-xs text-gold-600 hover:bg-gold-600/20"
                        >
                          <Plus className="h-3 w-3" /> Add Action
                        </button>
                      </div>
                      {st.actions.map((action, actionIndex) => (
                        <div key={actionIndex} className="space-y-2 rounded border border-[var(--border-color)] bg-[var(--bg-elevated)] p-3">
                          <div className="flex items-end gap-2">
                            <div className="flex-1">
                              <label className="block text-xs text-[var(--text-muted)] mb-1">Assignee</label>
                              <select
                                value={action.user_id}
                                onChange={(e) => updateSpeakerSubTopicAction(subIndex, actionIndex, 'user_id', e.target.value)}
                                className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                              >
                                <option value="">Select user</option>
                                {users.map(u => (
                                  <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                              </select>
                            </div>
                            <button
                              onClick={() => removeSpeakerSubTopicAction(subIndex, actionIndex)}
                              className="rounded-lg p-2 text-red-500 hover:bg-red-500/10"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">Start Date</label>
                              <input
                                type="date"
                                value={action.start_date}
                                onChange={(e) => updateSpeakerSubTopicAction(subIndex, actionIndex, 'start_date', e.target.value)}
                                className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-[var(--text-muted)] mb-1">Due Date</label>
                              <input
                                type="date"
                                value={action.due_date}
                                onChange={(e) => updateSpeakerSubTopicAction(subIndex, actionIndex, 'due_date', e.target.value)}
                                className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-[var(--text-muted)] mb-1">Task / Description</label>
                            <textarea
                              value={action.task}
                              onChange={(e) => updateSpeakerSubTopicAction(subIndex, actionIndex, 'task', e.target.value)}
                              placeholder="What needs to be done"
                              rows={2}
                              className="block w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-gold-500 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-[var(--text-primary)]">Main Files</label>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-gold-600 px-3 py-1.5 text-xs text-white hover:bg-gold-500">
                  <Plus className="h-3 w-3" />
                  {uploadingSpeakerMainFile ? 'Uploading...' : 'Upload File'}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.webp,.zip,.txt"
                    disabled={uploadingSpeakerMainFile}
                    onChange={(e) => handleUploadSpeakerMainFile(e.target.files[0])}
                  />
                </label>
              </div>
              <p className="text-xs text-[var(--text-muted)]">Attach PDF, Word, PowerPoint, Excel, or image files</p>
              {speakerMainFiles.length > 0 && (
                <ul className="space-y-2">
                  {speakerMainFiles.map((f, fi) => (
                    <li key={fi} className="flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] px-3 py-2">
                      <FileText className="h-4 w-4 text-gold-600 shrink-0" />
                      <button
                        type="button"
                        onClick={() => openFileViewer(f)}
                        className="flex-1 text-left text-sm text-[var(--text-primary)] truncate hover:text-gold-600"
                      >
                        {f.name}
                      </button>
                      <button onClick={() => removeSpeakerMainFile(fi)} className="text-red-500 hover:text-red-400 shrink-0">
                        <X className="h-4 w-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4 flex justify-end gap-3">
              <button
                onClick={() => { setEditingSpeaker(null); setSpeakerMainFiles([]) }}
                className="rounded-lg border border-[var(--border-color)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-elevated)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSpeakerInfo}
                disabled={savingSpeakerInfo}
                className="rounded-lg bg-gold-600 px-4 py-2 text-sm font-medium text-white hover:bg-gold-500 disabled:opacity-50"
              >
                {savingSpeakerInfo ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewingFile && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 ${filePreviewFullscreen ? 'p-2' : 'p-4'}`}>
          <div className={`w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] p-4 shadow-xl flex flex-col transition-all duration-200 ${filePreviewFullscreen ? 'max-w-[98vw] h-[98vh]' : 'max-w-5xl h-[90vh]'}`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] truncate pr-4">{viewingFile.name}</h3>
              <div className="flex items-center gap-2">
                {filePreviewData?.type === 'excel' && (
                  <>
                    <button
                      onClick={() => setFilePreviewZoom(z => Math.max(0.5, z - 0.1))}
                      className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                    >
                      Zoom -
                    </button>
                    <span className="min-w-[3rem] text-center text-xs text-[var(--text-muted)]">{Math.round(filePreviewZoom * 100)}%</span>
                    <button
                      onClick={() => setFilePreviewZoom(z => Math.min(2, z + 0.1))}
                      className="rounded-lg border border-[var(--border-color)] px-2 py-1 text-xs text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                    >
                      Zoom +
                    </button>
                  </>
                )}
                <button
                  onClick={() => setFilePreviewFullscreen(v => !v)}
                  title={filePreviewFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  className="rounded-lg border border-[var(--border-color)] p-1.5 text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]"
                >
                  {filePreviewFullscreen
                    ? <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0h5m-5 0v5M15 9l5-5m0 0h-5m5 0v5M9 15l-5 5m0 0h5m-5 0v-5M15 15l5 5m0 0h-5m5 0v-5" /></svg>
                    : <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5M20 8V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5M20 16v4m0 0h-4m4 0l-5-5" /></svg>
                  }
                </button>
                <a
                  href={viewingFile.url}
                  download={viewingFile.name}
                  className="rounded-lg bg-gold-600 px-3 py-1.5 text-xs text-white hover:bg-gold-500"
                >
                  Download
                </a>
                <button
                  onClick={closeFileViewer}
                  className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--bg-elevated)]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-auto rounded-lg border border-[var(--border-color)] bg-[var(--bg-elevated)] flex items-start justify-center p-2">
              {getFileType(viewingFile.url) === 'image' && (
                <img src={viewingFile.url} alt={viewingFile.name} className="max-h-full max-w-full rounded object-contain" style={{ transform: `scale(${filePreviewZoom})`, transformOrigin: 'top center', transition: 'transform 0.2s' }} />
              )}
              {getFileType(viewingFile.url) === 'pdf' && (
                <iframe src={viewingFile.url} title={viewingFile.name} className="w-full h-full min-h-[80vh] rounded" />
              )}
              {getFileType(viewingFile.url) === 'media' && (
                <video src={viewingFile.url} controls className="max-h-full max-w-full rounded">
                  Your browser does not support the video tag.
                </video>
              )}
              {getFileType(viewingFile.url) === 'excel' && (
                <div className="w-full space-y-3 h-full flex flex-col">
                  {filePreviewLoading && (
                    <div className="flex h-[30vh] items-center justify-center">
                      <p className="text-sm text-[var(--text-muted)]">Loading preview...</p>
                    </div>
                  )}
                  {!filePreviewLoading && filePreviewData?.type === 'excel' && (
                    <div className="w-full space-y-2 h-full flex flex-col">
                      {filePreviewData.sheets.length > 1 && (
                        <div className="flex flex-wrap gap-2">
                          {filePreviewData.sheets.map((sheet) => (
                            <button
                              key={sheet}
                              onClick={() => {
                                const ws = filePreviewData.workbook.Sheets[sheet]
                                const json = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
                                setFilePreviewData(prev => ({ ...prev, sheetName: sheet, data: json }))
                              }}
                              className={`rounded px-3 py-1 text-xs ${filePreviewData.sheetName === sheet ? 'bg-gold-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-color)]'}`}
                            >
                              {sheet}
                            </button>
                          ))}
                        </div>
                      )}
                      <div className="flex-1 overflow-auto rounded border border-[var(--border-color)] min-h-0">
                        <div style={{ transform: `scale(${filePreviewZoom})`, transformOrigin: 'top left', transition: 'transform 0.2s' }}>
                          <table className="min-w-full text-xs">
                            <tbody>
                              {filePreviewData.data.map((row, ri) => (
                                <tr key={ri} className={ri === 0 ? 'bg-[var(--bg-elevated)] font-semibold' : 'border-t border-[var(--border-color)]'}>
                                  {row.map((cell, ci) => (
                                    <td key={ci} className="px-3 py-2 text-[var(--text-primary)] whitespace-nowrap border-r border-[var(--border-color)] last:border-r-0">
                                      {String(cell)}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              {getFileType(viewingFile.url) === 'office' && (
                <iframe
                  src={getGoogleDocsViewerUrl(viewingFile.url)}
                  title={viewingFile.name}
                  className="w-full h-full rounded"
                  style={{ minHeight: '80vh' }}
                  allowFullScreen
                />
              )}
              {getFileType(viewingFile.url) === 'other' && (
                <div className="p-8 text-center">
                  <p className="text-sm text-[var(--text-muted)]">This file type cannot be previewed in the browser.</p>
                  <a href={viewingFile.url} download={viewingFile.name} className="mt-3 inline-block rounded-lg bg-gold-600 px-4 py-2 text-sm text-white hover:bg-gold-500">
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
