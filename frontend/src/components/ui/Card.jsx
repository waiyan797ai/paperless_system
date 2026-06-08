import { cn } from '../../lib/utils'

export default function Card({ className, children, hover, gold, ...props }) {
  return (
    <div
      className={cn(
        'glass rounded-2xl p-6 transition-all duration-300',
        hover && 'hover:shadow-lg hover:border-gold-600/20 hover:-translate-y-0.5',
        gold && 'glass-gold',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children }) {
  return <div className={cn('mb-4', className)}>{children}</div>
}

export function CardTitle({ className, children }) {
  return (
    <h3 className={cn('text-lg font-semibold text-[var(--text-primary)] tracking-tight', className)}>
      {children}
    </h3>
  )
}

export function CardDescription({ className, children }) {
  return <p className={cn('text-sm text-[var(--text-muted)] mt-1', className)}>{children}</p>
}

export function CardContent({ className, children }) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({ className, children }) {
  return <div className={cn('mt-4 pt-4 border-t border-[var(--border-color)] flex items-center gap-2', className)}>{children}</div>
}
