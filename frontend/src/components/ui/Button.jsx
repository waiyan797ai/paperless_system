import { forwardRef } from 'react'
import { cn } from '../../lib/utils'

const variants = {
  primary: 'bg-primary-800 text-white hover:bg-primary-700 border border-gold-600/30 shadow-lg shadow-primary-950/20',
  gold: 'bg-gradient-to-r from-gold-600 to-gold-500 text-primary-950 hover:from-gold-500 hover:to-gold-400 font-semibold shadow-lg shadow-gold-600/20',
  secondary: 'glass text-[var(--text-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)]',
  ghost: 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]',
  danger: 'bg-red-600/90 text-white hover:bg-red-600 border border-red-500/30',
  outline: 'border border-gold-600/50 text-gold-600 hover:bg-gold-600/10',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded-lg',
  md: 'px-4 py-2 text-sm rounded-xl',
  lg: 'px-6 py-3 text-base rounded-xl',
  icon: 'p-2 rounded-xl',
}

const Button = forwardRef(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-gold-500/40 focus:ring-offset-2 focus:ring-offset-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  )
})

export default Button
