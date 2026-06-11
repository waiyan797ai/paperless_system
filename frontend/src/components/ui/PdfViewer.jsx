import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, RefreshCw, ZoomIn, ZoomOut } from 'lucide-react'
import * as pdfjs from 'pdfjs-dist'
import api from '../../lib/api'
import LoadingSpinner from './LoadingSpinner'
import Button from './Button'

pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 3
const ZOOM_STEP = 0.25

async function cancelRenderTask(task) {
  if (!task) return
  task.cancel()
  await task.promise.catch(() => {})
}

export default function PdfViewer({ src, fileName, className = '', height = 'min-h-[70vh]' }) {
  const [pdfDoc, setPdfDoc] = useState(null)
  const [pageNum, setPageNum] = useState(1)
  const [numPages, setNumPages] = useState(0)
  const [zoom, setZoom] = useState(1)
  const [baseScale, setBaseScale] = useState(1)
  const [loading, setLoading] = useState(true)
  const [pageRendering, setPageRendering] = useState(false)
  const [error, setError] = useState(null)
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const renderTaskRef = useRef(null)
  const renderGenerationRef = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    setPdfDoc(null)
    setPageNum(1)
    setZoom(1)

    try {
      const { data } = await api.get(src, { responseType: 'arraybuffer' })
      const bytes = new Uint8Array(data)

      if (bytes.length < 4 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46) {
        throw new Error('Response is not a valid PDF file.')
      }

      const doc = await pdfjs.getDocument({ data: bytes }).promise
      setPdfDoc(doc)
      setNumPages(doc.numPages)
    } catch {
      setError('Unable to load PDF. The file may not be available.')
    } finally {
      setLoading(false)
    }
  }, [src])

  useEffect(() => {
    load()
  }, [load])

  const updateBaseScale = useCallback(async () => {
    if (!pdfDoc || !containerRef.current) return

    const page = await pdfDoc.getPage(pageNum)
    const viewport = page.getViewport({ scale: 1 })
    const containerWidth = containerRef.current.clientWidth - 32
    if (containerWidth <= 0 || viewport.width <= 0) return

    setBaseScale(containerWidth / viewport.width)
  }, [pdfDoc, pageNum])

  useEffect(() => {
    updateBaseScale()
  }, [updateBaseScale])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !pdfDoc) return undefined

    const observer = new ResizeObserver(() => {
      updateBaseScale()
    })
    observer.observe(container)

    return () => observer.disconnect()
  }, [pdfDoc, updateBaseScale])

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || baseScale <= 0) return undefined

    const generation = ++renderGenerationRef.current
    const canvas = canvasRef.current
    const renderScale = baseScale * zoom

    const renderPage = async () => {
      setPageRendering(true)

      try {
        if (renderTaskRef.current) {
          await cancelRenderTask(renderTaskRef.current)
          renderTaskRef.current = null
        }

        if (generation !== renderGenerationRef.current) return

        const page = await pdfDoc.getPage(pageNum)
        if (generation !== renderGenerationRef.current) return

        const viewport = page.getViewport({ scale: renderScale })
        const context = canvas.getContext('2d')
        const outputScale = window.devicePixelRatio || 1

        canvas.width = Math.floor(viewport.width * outputScale)
        canvas.height = Math.floor(viewport.height * outputScale)
        canvas.style.width = `${viewport.width}px`
        canvas.style.height = `${viewport.height}px`

        context.setTransform(outputScale, 0, 0, outputScale, 0, 0)

        const task = page.render({ canvasContext: context, viewport })
        renderTaskRef.current = task
        await task.promise

        if (generation !== renderGenerationRef.current) return
      } catch (err) {
        if (generation === renderGenerationRef.current && err?.name !== 'RenderingCancelledException') {
          setError('Unable to render PDF page.')
        }
      } finally {
        if (generation === renderGenerationRef.current) {
          setPageRendering(false)
        }
      }
    }

    renderPage()

    return () => {
      renderGenerationRef.current += 1
      if (renderTaskRef.current) {
        const task = renderTaskRef.current
        renderTaskRef.current = null
        task.cancel()
        task.promise.catch(() => {})
      }
    }
  }, [pdfDoc, pageNum, zoom, baseScale])

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
        <Button variant="secondary" size="sm" type="button" onClick={load}>
          <RefreshCw className="h-4 w-4" /> Retry
        </Button>
      </div>
    )
  }

  const zoomPercent = Math.round(zoom * 100)

  return (
    <div className={`rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] overflow-hidden ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-[var(--border-color)] bg-[var(--bg-surface)]">
        <p className="text-xs text-[var(--text-muted)] truncate max-w-[50%]">
          {fileName || 'PDF document'}
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => Math.max(1, p - 1))}
            title="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--text-secondary)] min-w-[72px] text-center">
            {pageNum} / {numPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => Math.min(numPages, p + 1))}
            title="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2)))}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-[var(--text-secondary)] min-w-[40px] text-center">
            {zoomPercent}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2)))}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div
        ref={containerRef}
        className={`relative overflow-auto ${height} flex justify-center p-4 bg-[var(--bg-surface)]`}
      >
        {pageRendering && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--bg-surface)]/60 pointer-events-none">
            <LoadingSpinner label="Rendering page..." />
          </div>
        )}
        <canvas ref={canvasRef} className="shadow-lg" />
      </div>
    </div>
  )
}
