import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import api from '../../lib/api'
import LoadingSpinner from './LoadingSpinner'
import Button from './Button'

export default function PdfViewer({ src, fileName, className = '', height = 'min-h-[70vh]' }) {
  const [blobUrl, setBlobUrl] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const blobUrlRef = useRef(null)

  const revokeUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current)
      blobUrlRef.current = null
    }
    setBlobUrl(null)
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    revokeUrl()

    try {
      const { data } = await api.get(src, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
      blobUrlRef.current = url
      setBlobUrl(url)
    } catch {
      setError('Unable to load PDF. The file may not be available.')
    } finally {
      setLoading(false)
    }
  }, [src, revokeUrl])

  useEffect(() => {
    load()
    return revokeUrl
  }, [load, revokeUrl])

  if (loading) {
    return (
      <div className={`flex items-center justify-center rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] ${height} ${className}`}>
        <LoadingSpinner label="Loading PDF..." />
      </div>
    )
  }

  if (error) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] ${height} ${className}`}>
        <p className="text-sm text-[var(--text-muted)]">{error}</p>
        <Button variant="secondary" size="sm" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  return (
    <iframe
      src={blobUrl}
      title={fileName || 'PDF document'}
      className={`w-full rounded-xl border border-[var(--border-color)] bg-white ${height} ${className}`}
    />
  )
}
