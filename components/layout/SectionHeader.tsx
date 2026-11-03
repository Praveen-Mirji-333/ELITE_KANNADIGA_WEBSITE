import type { ReactNode } from 'react'

interface SectionHeaderProps {
  kicker?: string
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  className?: string
}

export function SectionHeader({
  kicker,
  title,
  description,
  action,
  className = '',
}: SectionHeaderProps) {
  return (
    <div
      className={`mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0 max-w-2xl">
        {kicker && <p className="kicker">{kicker}</p>}
        <h2 className="display-section mt-2 text-ink">{title}</h2>
        {description && <p className="text-body mt-2 text-sm">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
