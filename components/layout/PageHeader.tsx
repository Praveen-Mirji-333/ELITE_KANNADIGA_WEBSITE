import type { ReactNode } from 'react'

interface PageHeaderProps {
  kicker?: string
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  meta?: ReactNode
  className?: string
}

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  meta,
  className = '',
}: PageHeaderProps) {
  return (
    <header
      className={`border-b border-line-subtle pb-8 pt-8 sm:pb-10 sm:pt-10 lg:pb-12 lg:pt-12 ${className}`}
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 max-w-3xl">
          {kicker && (
            <p className="kicker">
              <span className="kicker-line" aria-hidden="true" />
              {kicker}
            </p>
          )}
          <h1 className="display-page mt-4 text-ink">{title}</h1>
          {description && <p className="text-lead mt-4 max-w-2xl">{description}</p>}
          {meta && <div className="mt-5 flex flex-wrap items-center gap-3">{meta}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  )
}
