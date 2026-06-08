import { cn } from '../../lib/utils'

export default function Table({ className, children }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
      <table className={cn('w-full text-sm', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children }) {
  return (
    <thead className="bg-[var(--bg-elevated)] border-b border-[var(--border-color)]">
      {children}
    </thead>
  )
}

export function TableBody({ children }) {
  return <tbody className="divide-y divide-[var(--border-color)]">{children}</tbody>
}

export function TableRow({ children, className, onClick }) {
  return (
    <tr
      className={cn(
        'transition-colors hover:bg-[var(--bg-surface)]',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {children}
    </tr>
  )
}

export function TableHead({ children, className }) {
  return (
    <th className={cn(
      'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]',
      className
    )}>
      {children}
    </th>
  )
}

export function TableCell({ children, className }) {
  return (
    <td className={cn('px-4 py-3.5 text-[var(--text-secondary)]', className)}>
      {children}
    </td>
  )
}

export function TablePagination({ page, totalPages, onPageChange, totalItems, pageSize }) {
  const start = (page - 1) * pageSize + 1
  const end = Math.min(page * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between px-2 py-4">
      <p className="text-sm text-[var(--text-muted)]">
        Showing {start}–{end} of {totalItems}
      </p>
      <div className="flex items-center gap-2">
        <button
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--bg-surface)] transition-colors"
        >
          Previous
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
          Math.max(0, page - 3),
          Math.min(totalPages, page + 2)
        ).map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'px-3 py-1.5 text-sm rounded-lg transition-colors',
              p === page
                ? 'bg-gold-600/20 text-gold-700 dark:text-gold-300 border border-gold-600/30 font-medium'
                : 'border border-[var(--border-color)] hover:bg-[var(--bg-surface)]'
            )}
          >
            {p}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border-color)] disabled:opacity-40 hover:bg-[var(--bg-surface)] transition-colors"
        >
          Next
        </button>
      </div>
    </div>
  )
}
