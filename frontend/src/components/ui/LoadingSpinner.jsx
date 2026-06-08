import { cn } from '../../lib/utils'

export default function LoadingSpinner({ size = 'md', className, label }) {
  const sizes = { sm: 'h-5 w-5', md: 'h-8 w-8', lg: 'h-12 w-12' }

  return (
    <div className={cn('flex flex-col items-center justify-center gap-3', className)}>
      <div
        className={cn(
          'animate-spin rounded-full border-2 border-gold-600/20 border-t-gold-600',
          sizes[size]
        )}
      />
      {label && <p className="text-sm text-[var(--text-muted)]">{label}</p>}
    </div>
  )
}
