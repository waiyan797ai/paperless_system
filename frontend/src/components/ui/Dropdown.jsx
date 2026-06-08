import { useEffect, useRef, useState } from 'react'
import { cn } from '../../lib/utils'

export default function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div onClick={() => setOpen(!open)}>{trigger}</div>
      {open && (
        <div
          className={cn(
            'absolute z-50 mt-2 min-w-[200px] glass-elevated rounded-xl border border-[var(--border-color)] py-1 shadow-xl animate-fade-in',
            align === 'right' ? 'right-0' : 'left-0'
          )}
        >
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      )}
    </div>
  )
}

export function DropdownItem({ children, onClick, danger, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left',
        danger
          ? 'text-red-500 hover:bg-red-500/10'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]'
      )}
    >
      {Icon && <Icon className="h-4 w-4" />}
      {children}
    </button>
  )
}

export function DropdownDivider() {
  return <div className="my-1 border-t border-[var(--border-color)]" />
}
