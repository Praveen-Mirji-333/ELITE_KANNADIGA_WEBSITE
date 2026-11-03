import type { ReactNode } from 'react'
import { Navbar } from '../Navbar'
import { Footer } from '../Footer'

interface SitePageProps {
  children: ReactNode
  className?: string
}

/**
 * The single public-page shell. Every public route should use this so the
 * background, navigation, footer, skip link and landmarks stay identical.
 */
export function SitePage({ children, className = '' }: SitePageProps) {
  return (
    <div className={`min-h-screen bg-canvas text-ink neu-theme ${className}`}>
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <Navbar />
      <main id="main-content">{children}</main>
      <Footer />
    </div>
  )
}
