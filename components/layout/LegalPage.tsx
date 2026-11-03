import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { SitePage } from './SitePage'
import { PageHeader } from './PageHeader'

interface LegalPageProps {
  title: string
  description: string
  kicker?: string
  children: ReactNode
}

export function LegalPage({
  title,
  description,
  kicker = 'Information',
  children,
}: LegalPageProps) {
  return (
    <SitePage>
      <div className="site-container pb-20 pt-24 sm:pt-28">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted transition-colors hover:text-brand-bright"
          >
            <ArrowLeft size={15} />
            Back to arena
          </Link>

          <PageHeader
            kicker={kicker}
            title={title}
            description={description}
            className="mt-4"
          />

          <div className="legal-copy border-t border-line-subtle pt-8">{children}</div>
        </div>
      </div>
    </SitePage>
  )
}
