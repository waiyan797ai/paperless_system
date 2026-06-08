import { useCallback, useState } from 'react'
import { Upload, File, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function FileUpload({ onFilesSelected, accept, multiple = false, maxSize = 10 }) {
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)

  const handleFiles = useCallback((fileList) => {
    const arr = Array.from(fileList)
    setFiles(arr)
    onFilesSelected?.(arr)
  }, [onFilesSelected])

  const removeFile = (index) => {
    const next = files.filter((_, i) => i !== index)
    setFiles(next)
    onFilesSelected?.(next)
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        className={cn(
          'relative border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer',
          dragging
            ? 'border-gold-600 bg-gold-600/5'
            : 'border-[var(--border-color)] hover:border-gold-600/40 hover:bg-[var(--bg-surface)]'
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <Upload className="h-10 w-10 text-gold-600/60 mx-auto mb-3" />
        <p className="text-sm font-medium text-[var(--text-primary)]">
          Drop files here or click to browse
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Max file size: {maxSize}MB
        </p>
      </div>
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, i) => (
            <li key={i} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)]">
              <File className="h-4 w-4 text-gold-600 shrink-0" />
              <span className="text-sm text-[var(--text-secondary)] truncate flex-1">{file.name}</span>
              <span className="text-xs text-[var(--text-muted)]">{(file.size / 1024).toFixed(1)} KB</span>
              <button onClick={() => removeFile(i)} className="text-[var(--text-muted)] hover:text-red-500">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
