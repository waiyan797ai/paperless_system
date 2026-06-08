import { cn, getInitials } from '../../lib/utils'

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-lg',
}

export default function Avatar({ name, src, size = 'md', className }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={cn('rounded-full object-cover ring-2 ring-gold-600/30', sizes[size], className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center font-semibold',
        'bg-gradient-to-br from-primary-800 to-primary-700 text-gold-400 ring-2 ring-gold-600/30',
        sizes[size],
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}
