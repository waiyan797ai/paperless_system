import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'

const Select = forwardRef(function Select(
  { className, label, error, options = [], placeholder = 'Select...', ...props },
  ref
) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            'w-full appearance-none rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]',
            'px-4 py-2.5 pr-10 text-sm text-[var(--text-primary)]',
            'backdrop-blur-sm transition-all duration-200 cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-600/50',
            error && 'border-red-500/50'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) =>
            typeof opt === 'string' ? (
              <option key={opt} value={opt}>{opt}</option>
            ) : (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            )
          )}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)] pointer-events-none" />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})

export default Select
