import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const Input = forwardRef(function Input(
  { className, label, error, hint, icon: Icon, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        )}
        <input
          ref={ref}
          className={cn(
            'w-full rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)]',
            'px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'backdrop-blur-sm transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-gold-500/30 focus:border-gold-600/50',
            Icon && 'pl-10',
            error && 'border-red-500/50 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
    </div>
  )
})

export default Input
