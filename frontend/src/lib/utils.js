import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date, options = {}) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  }).format(new Date(date))
}

export function formatRelativeTime(date) {
  if (!date) return '—'
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function getInitials(name = '') {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function getStatusColor(status) {
  const map = {
    submitted: 'info',
    dept_approved: 'gold',
    at_section: 'info',
    returned: 'warning',
    approved: 'success',
    rejected: 'danger',
    draft: 'default',
    active: 'success',
    inactive: 'default',
    processing: 'info',
    completed: 'success',
    cancelled: 'danger',
    published: 'success',
    archived: 'default',
  }
  return map[status?.toLowerCase()] || 'default'
}

/** PDF text pasted into description breaks Myanmar encoding — show PDF preview instead. */
export function shouldShowPolicyDescription(description) {
  if (!description?.trim()) return false
  if (description.length > 800) return false
  if (/Page\s+\d+\s+of\s+\d+/i.test(description)) return false
  return true
}
