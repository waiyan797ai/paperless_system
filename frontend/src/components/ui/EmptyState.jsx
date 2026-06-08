import { Inbox } from 'lucide-react'
import Button from './Button'

export default function EmptyState({ icon: Icon = Inbox, title, description, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-2xl bg-gold-600/10 border border-gold-600/20 mb-4">
        <Icon className="h-10 w-10 text-gold-600/70" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] tracking-tight">{title}</h3>
      {description && (
        <p className="text-sm text-[var(--text-muted)] mt-2 max-w-sm">{description}</p>
      )}
      {action && actionLabel && (
        <Button variant="gold" className="mt-6" onClick={action}>
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
