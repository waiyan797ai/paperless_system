import { TrendingDown, TrendingUp } from 'lucide-react'
import { cn } from '../../lib/utils'
import Card from './Card'

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, className }) {
  const isPositive = trend >= 0

  return (
    <Card hover gold className={cn('relative overflow-hidden', className)}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-gold-600/5 rounded-full -translate-y-8 translate-x-8" />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-sm font-medium text-[var(--text-muted)]">{title}</p>
          <p className="text-3xl font-bold text-[var(--text-primary)] mt-2 tracking-tight">{value}</p>
          {trendLabel && (
            <div className={cn(
              'flex items-center gap-1 mt-2 text-xs font-medium',
              isPositive ? 'text-emerald-500' : 'text-red-500'
            )}>
              {isPositive ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              {Math.abs(trend)}% {trendLabel}
            </div>
          )}
        </div>
        {Icon && (
          <div className="p-3 rounded-xl bg-gold-600/10 border border-gold-600/20">
            <Icon className="h-6 w-6 text-gold-600" />
          </div>
        )}
      </div>
    </Card>
  )
}
