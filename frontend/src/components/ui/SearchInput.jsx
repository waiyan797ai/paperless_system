import { Search, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export default function SearchInput({ value, onChange, placeholder = 'Search...', className, onClear }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-600/50 transition-all"
      />
      {value && (
        <button
          onClick={() => (onClear ? onClear() : onChange(''))}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
