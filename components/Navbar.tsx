'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import dynamic from 'next/dynamic'
import { ChevronRight, Menu, Search, User, X } from 'lucide-react'
import type { Profile } from '../lib/types'
import { getUserProfile, supabase } from '../lib/supabase'

const AuthModal = dynamic(
  () => import('./auth/AuthModal').then((mod) => mod.AuthModal),
  { ssr: false }
)
const PlayerDashboard = dynamic(
  () => import('./dashboard/PlayerDashboard').then((mod) => mod.PlayerDashboard),
  { ssr: false }
)
const AdminDashboard = dynamic(
  () => import('./admin/AdminDashboard').then((mod) => mod.AdminDashboard),
  { ssr: false }
)

const logoUrl = '/logo.png'

const navItems = [
  { name: 'HOME', path: '/' },
  { name: 'TOURNAMENTS', path: '/tournaments' },
  { name: 'LIVE', path: '/live', isLive: true },
  { name: 'LEADERBOARD', path: '/leaderboard' },
  { name: 'GUILDS', path: '/guilds' },
  { name: 'ACHIEVEMENTS', path: '/achievements' },
]

const searchLinks = [
  { label: 'Tournaments', description: 'Browse and register for events', href: '/tournaments' },
  { label: 'Live standings', description: 'Points table and broadcasts', href: '/live' },
  { label: 'Leaderboard', description: 'Top players and login streaks', href: '/leaderboard' },
  { label: 'Elite Army Guild', description: 'Roster and guild stats', href: '/guilds' },
  { label: 'Achievements', description: 'Unlocked badges and XP', href: '/achievements' },
]

export function Navbar() {
  const pathname = usePathname()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [authLoading, setAuthLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<Profile | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [dashboardOpen, setDashboardOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function init() {
      try {
        const prof = await getUserProfile()
        if (isMounted) {
          setUserProfile(prof)
          setAuthLoading(false)
        }
      } catch {
        if (isMounted) setAuthLoading(false)
      }
    }

    init()

    const handleOpenDashboard = (event: Event) => {
      const role = (event as CustomEvent<{ role?: string }>).detail?.role
      loadUser()
      if (role === 'admin') {
        setAdminOpen(true)
        setDashboardOpen(false)
      } else {
        setDashboardOpen(true)
        setAdminOpen(false)
      }
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('open_player_dashboard', handleOpenDashboard)
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      const prof = await getUserProfile()
      if (isMounted) {
        setUserProfile(prof)
        setAuthLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
      if (typeof window !== 'undefined') {
        window.removeEventListener('open_player_dashboard', handleOpenDashboard)
      }
    }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const isOverlayOpen = menuOpen || searchOpen
    document.body.style.overflow = isOverlayOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen, searchOpen])

  async function loadUser() {
    const prof = await getUserProfile()
    setUserProfile(prof)
    return prof
  }

  const handleAuthSuccess = async (role: 'admin' | 'user') => {
    await loadUser()
    setAuthLoading(false)
    setAuthModalOpen(false)
    if (role === 'admin') {
      setAdminOpen(true)
      setDashboardOpen(false)
    } else {
      setDashboardOpen(true)
      setAdminOpen(false)
    }
  }

  const handleProfileClick = () => {
    setMenuOpen(false)
    if (!userProfile) {
      setAuthModalOpen(true)
      return
    }
    if (userProfile.role === 'admin') {
      setAdminOpen(true)
      setDashboardOpen(false)
    } else {
      setDashboardOpen(true)
      setAdminOpen(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUserProfile(null)
    setAdminOpen(false)
    setDashboardOpen(false)
    setAuthLoading(false)
    setMenuOpen(false)
  }

  const filteredLinks = searchLinks.filter((item) => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return true
    return (
      item.label.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q)
    )
  })

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-line-subtle bg-canvas/90 backdrop-blur-xl sm:h-[68px] lg:h-[72px]">
        <div className="site-container flex h-full items-center justify-between gap-4">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2.5"
            aria-label="ELITE ಕನ್ನಡಿಗ home"
          >
            <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-line bg-surface sm:h-10 sm:w-10">
              <img
                src={logoUrl}
                alt=""
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </span>
            <span className="flex items-baseline gap-1.5 leading-none">
              <span className="text-sm font-bold tracking-[0.12em] text-ink sm:text-base">
                ELITE
              </span>
              <span className="font-kannada text-xs font-semibold text-brand-bright sm:text-sm">
                ಕನ್ನಡಿಗ
              </span>
            </span>
          </Link>

          <nav className="hidden h-full items-center gap-1 xl:flex" aria-label="Primary">
            {navItems.map((item) => {
              const isActive =
                item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
              return (
                <Link
                  key={item.name}
                  href={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative flex h-full items-center gap-2 px-3 text-xs font-semibold tracking-[0.14em] transition-colors ${
                    isActive
                      ? 'text-ink'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  {item.isLive && (
                    <span className="live-dot h-1.5 w-1.5" aria-hidden="true" />
                  )}
                  {item.name}
                  {isActive && (
                    <span
                      className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand"
                      aria-hidden="true"
                    />
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <div className="hidden xl:block">
              <button
                type="button"
                onClick={() => setSearchOpen(true)}
                className="neu-circle h-9 w-9 text-ink"
                aria-label="Search"
                title="Search"
              >
                <Search size={16} />
              </button>
            </div>

            {userProfile ? (
              <button
                type="button"
                onClick={handleProfileClick}
                className="neu-raised-sm flex min-h-10 items-center gap-2 !rounded-full px-2.5 py-1 transition-all"
                title={`${userProfile.ign || userProfile.username} profile`}
              >
                <span className="relative grid h-7 w-7 shrink-0 place-items-center overflow-hidden rounded-full border border-black/[0.08] bg-surface-2">
                  {userProfile.avatar_url &&
                  !userProfile.avatar_url.includes('hebbkx1anhila5yf') &&
                  !userProfile.avatar_url.includes('/logo.png') ? (
                    <img
                      src={userProfile.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xs font-bold text-brand-bright">
                      {(userProfile.ign || userProfile.username || 'U')
                        .slice(0, 2)
                        .toUpperCase()}
                    </span>
                  )}
                  <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border border-surface bg-brand-bright" />
                </span>
                <span className="hidden text-left xl:block pr-1">
                  <span className="block max-w-[110px] truncate text-xs font-semibold text-ink">
                    {userProfile.ign || userProfile.username}
                  </span>
                  <span className="block text-[10px] font-bold uppercase tracking-[0.1em] text-brand-bright">
                    {userProfile.role === 'admin' ? 'Admin' : 'Player'}
                  </span>
                </span>
              </button>
            ) : authLoading ? (
              <span className="h-9 w-9 animate-pulse rounded-full border border-line bg-surface-2" />
            ) : (
              <div className="hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="btn-primary !min-h-9 !py-0 !px-3.5 text-xs"
                >
                  <User size={14} />
                  Sign in
                </button>
              </div>
            )}

            <div className="xl:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="neu-circle h-9 w-9 text-ink"
                aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
                aria-expanded={menuOpen}
                aria-controls="mobile-navigation"
              >
                {menuOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>
      </header>

      {menuOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-canvas/60 backdrop-blur-sm xl:hidden"
            aria-label="Close navigation menu"
            onClick={() => setMenuOpen(false)}
          />
          <div
            id="mobile-navigation"
            className="fixed inset-x-0 top-16 z-40 max-h-[calc(100dvh-4rem)] overflow-y-auto border-b border-line bg-canvas px-4 pb-6 pt-3 sm:top-[68px] sm:max-h-[calc(100dvh-4.25rem)] lg:top-[72px] lg:max-h-[calc(100dvh-4.5rem)] xl:hidden"
          >
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false)
                setSearchOpen(true)
              }}
              className="mb-2 flex min-h-11 w-full items-center gap-3 rounded-lg border border-line bg-surface px-3 text-sm text-ink-muted"
            >
              <Search size={17} />
              Search the arena
            </button>

            <nav aria-label="Mobile">
              {navItems.map((item) => {
                const isActive =
                  item.path === '/' ? pathname === '/' : pathname.startsWith(item.path)
                return (
                  <Link
                    key={item.name}
                    href={item.path}
                    onClick={() => setMenuOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex min-h-12 items-center justify-between border-b border-line-subtle px-1 text-sm font-semibold tracking-[0.12em] ${
                      isActive ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      {item.isLive && <span className="live-dot h-1.5 w-1.5" />}
                      {item.name}
                    </span>
                    <ChevronRight
                      size={16}
                      className={isActive ? 'text-brand-bright' : 'text-ink-subtle'}
                    />
                  </Link>
                )
              })}
            </nav>

            {userProfile ? (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-3">
                <span className="min-w-0 text-xs text-ink-subtle">
                  Signed in as{' '}
                  <strong className="block truncate text-sm font-semibold text-ink">
                    {userProfile.ign || userProfile.username}
                  </strong>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-danger btn-sm"
                >
                  Log out
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  setAuthModalOpen(true)
                }}
                className="btn-primary mt-4 w-full"
              >
                <User size={16} />
                Sign in / Register
              </button>
            )}
          </div>
        </>
      )}

      {searchOpen && (
        <div
          className="modal-overlay items-start pt-24"
          role="dialog"
          aria-modal="true"
          aria-label="Search ELITE Kannada"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setSearchOpen(false)
          }}
        >
          <div className="modal-panel max-w-xl p-0">
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <Search size={18} className="shrink-0 text-ink-subtle" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search pages, tournaments, players..."
                className="h-10 w-full border-0 bg-transparent px-0 text-sm text-ink shadow-none focus:shadow-none"
                autoFocus
                aria-label="Search"
              />
              <button
                type="button"
                onClick={() => setSearchOpen(false)}
                className="btn-ghost h-9 w-9 shrink-0 px-0"
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-2">
              {filteredLinks.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink-subtle">
                  No pages match “{searchQuery}”.
                </p>
              ) : (
                filteredLinks.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSearchOpen(false)}
                    className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-ink">
                        {item.label}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-subtle">
                        {item.description}
                      </span>
                    </span>
                    <ChevronRight size={16} className="shrink-0 text-ink-subtle" />
                  </Link>
                ))
              )}
            </div>
            <div className="border-t border-line px-4 py-2.5">
              <p className="text-xs text-ink-subtle">
                Tip: use the page search on Tournaments to filter live events.
              </p>
            </div>
          </div>
        </div>
      )}

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <PlayerDashboard
        isOpen={dashboardOpen}
        onClose={() => setDashboardOpen(false)}
        profile={userProfile}
        onProfileUpdated={() => loadUser()}
      />
      <AdminDashboard isOpen={adminOpen} onClose={() => setAdminOpen(false)} />
    </>
  )
}
