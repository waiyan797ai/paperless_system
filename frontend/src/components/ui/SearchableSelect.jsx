import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { cn } from '../../lib/utils'

function normalizeOptions(options) {
  return options.map((opt) =>
    typeof opt === 'string'
      ? { value: opt, label: opt, keywords: opt }
      : { value: opt.value, label: opt.label, keywords: opt.keywords || opt.label }
  )
}

export default function SearchableSelect({
  className,
  label,
  error,
  options = [],
  value = '',
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  required = false,
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)
  const searchRef = useRef(null)

  const normalized = useMemo(() => normalizeOptions(options), [options])

  const selected = normalized.find((opt) => String(opt.value) === String(value))

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return normalized
    return normalized.filter((opt) => {
      const labelMatch = opt.label.toLowerCase().includes(query)
      const keywordMatch = String(opt.keywords || '').toLowerCase().includes(query)
      return labelMatch || keywordMatch
    })
  }, [normalized, search])

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
        setSearch('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  useEffect(() => {
    if (open) {
      searchRef.current?.focus()
    }
  }, [open])

  const handleSelect = (opt) => {
    onChange?.({ target: { value: String(opt.value) } })
    setOpen(false)
    setSearch('')
  }

  return (
    <div className={cn('w-full', className)} ref={containerRef}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen((prev) => !prev)}
          className={cn(
            'w-full flex items-center justify-between rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]',
            'px-4 py-2.5 text-sm text-left transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-600/50',
            disabled && 'opacity-60 cursor-not-allowed',
            error && 'border-red-500/50',
            !selected && 'text-[var(--text-muted)]'
          )}
        >
          <span className="truncate">{selected?.label || placeholder}</span>
          <ChevronDown className={cn('h-4 w-4 text-[var(--text-muted)] shrink-0 ml-2 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-elevated)] shadow-xl overflow-hidden">
            <div className="p-2 border-b border-[var(--border-color)]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <input
                  ref={searchRef}
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full rounded-lg border border-[var(--border-color)] bg-[var(--bg-surface)] pl-9 pr-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-gold-500/30"
                />
              </div>
            </div>

            <ul className="max-h-48 overflow-y-auto py-1">
              {filtered.length === 0 ? (
                <li className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">No results found</li>
              ) : (
                filtered.map((opt) => (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onClick={() => handleSelect(opt)}
                      className={cn(
                        'w-full px-4 py-2.5 text-left text-sm transition-colors',
                        String(opt.value) === String(value)
                          ? 'bg-gold-600/15 text-gold-600 font-medium'
                          : 'text-[var(--text-primary)] hover:bg-[var(--bg-surface)]'
                      )}
                    >
                      <span className="block truncate">{opt.label}</span>
                      {opt.keywords && opt.keywords !== opt.label && (
                        <span className="block text-xs text-[var(--text-muted)] mt-0.5 font-mono truncate">
                          {opt.keywords}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
}
