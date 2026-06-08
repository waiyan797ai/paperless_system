import { cn } from '../../lib/utils'

export default function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div className={cn('flex gap-1 p-1 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)]', className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            activeTab === tab.id
              ? 'bg-gold-600/15 text-gold-600 border border-gold-600/25 shadow-sm'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-elevated)]'
          )}
        >
          {tab.icon && <tab.icon className="h-4 w-4" />}
          {tab.label}
          {tab.count != null && (
            <span className={cn(
              'ml-1 px-1.5 py-0.5 rounded-full text-xs',
              activeTab === tab.id ? 'bg-gold-600/20' : 'bg-[var(--bg-elevated)]'
            )}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}
