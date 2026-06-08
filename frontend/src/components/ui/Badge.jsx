import { cn } from '../../lib/utils'

const variants = {
  default: 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] border-[var(--border-color)]',
  success: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30',
  info: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
  gold: 'bg-gold-600/15 text-gold-600 dark:text-gold-400 border-gold-600/30',
}

export default function Badge({ className, variant = 'default', children, dot }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        variants[variant],
        className
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full', {
          'bg-emerald-500': variant === 'success',
          'bg-amber-500': variant === 'warning',
          'bg-red-500': variant === 'danger',
          'bg-blue-500': variant === 'info',
          'bg-gold-500': variant === 'gold',
          'bg-[var(--text-muted)]': variant === 'default',
        })} />
      )}
      {children}
    </span>
  )
}
