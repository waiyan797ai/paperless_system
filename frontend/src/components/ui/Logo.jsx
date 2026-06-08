import { cn } from '../../lib/utils'

const frameSizes = {
  xs: 'h-7 w-7 rounded-md',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-10 w-10 rounded-lg',
  lg: 'h-12 w-12 rounded-xl',
  xl: 'h-14 w-14 rounded-xl',
}

export default function Logo({ size = 'sm', className }) {
  return (
    <div
      className={cn(
        'relative shrink-0 overflow-hidden bg-white p-[2px]',
        'ring-1 ring-white/15',
        frameSizes[size],
        className
      )}
    >
      <img
        src="/logo.png"
        alt="29 Jewellery"
        className="h-full w-full object-contain select-none pointer-events-none"
        draggable={false}
      />
    </div>
  )
}
