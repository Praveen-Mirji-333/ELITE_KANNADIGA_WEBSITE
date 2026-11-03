import Link from 'next/link'

const logoUrl = '/logo.png'

const platformLinks = [
  { label: 'Tournaments', href: '/tournaments' },
  { label: 'Live standings', href: '/live' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Elite Army Guild', href: '/guilds' },
  { label: 'Achievements', href: '/achievements' },
]

const infoLinks = [
  { label: 'Privacy policy', href: '/privacy' },
  { label: 'Terms of service', href: '/terms' },
  { label: 'Community guidelines', href: '/guidelines' },
]

export function Footer() {
  return (
    <footer className="border-t border-line bg-canvas-soft">
      <div className="site-container py-12 sm:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="max-w-sm">
            <Link href="/" className="flex items-center gap-3">
              <span className="neu-circle grid h-10 w-10 place-items-center overflow-hidden rounded-full p-0.5">
                <img src={logoUrl} alt="" className="h-full w-full object-cover" />
              </span>
              <span className="flex items-baseline gap-1.5 leading-none">
                <span className="text-base font-bold tracking-[0.12em] text-ink">
                  ELITE
                </span>
                <span className="font-kannada text-sm font-semibold text-brand-bright">
                  ಕನ್ನಡಿಗ
                </span>
              </span>
            </Link>
            <p className="mt-4 text-sm leading-6 text-ink-muted">
              The official Kannada esports community. Compete in verified
              tournaments, climb the leaderboards, and build your legacy.
            </p>
            <div className="mt-5 flex items-center gap-2">
              <span className="live-dot" aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Community online
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">
              Platform
            </p>
            <ul className="mt-4 space-y-2.5">
              {platformLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand-bright"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">
              Information
            </p>
            <ul className="mt-4 space-y-2.5">
              {infoLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-ink-muted transition-colors hover:text-brand-bright"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink">
              Support
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <Link
                  href="/contact"
                  className="text-sm text-ink-muted transition-colors hover:text-brand-bright"
                >
                  Contact support
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-ink-muted transition-colors hover:text-brand-bright"
                >
                  Player dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/admin"
                  className="text-sm text-ink-muted transition-colors hover:text-brand-bright"
                >
                  Admin console
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 sm:mt-12 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-subtle">
            © 2026 ELITE ಕನ್ನಡಿಗ. All rights reserved.
          </p>
          <p className="text-xs text-ink-subtle">
            Built for the Karnataka Free Fire community.
          </p>
        </div>
      </div>
    </footer>
  )
}
