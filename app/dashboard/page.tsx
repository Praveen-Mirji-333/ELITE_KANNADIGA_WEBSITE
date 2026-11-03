'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  BarChart3,
  LogIn,
  Shield,
  Sparkles,
  Trophy,
  User,
} from 'lucide-react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import { PlayerDashboard } from '../../components/dashboard/PlayerDashboard'
import { getUserProfile } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

const quickLinks = [
  {
    label: 'Browse tournaments',
    description: 'Register your squad for the next event.',
    href: '/tournaments',
    icon: Trophy,
  },
  {
    label: 'Community leaderboard',
    description: 'See where you rank across the state.',
    href: '/leaderboard',
    icon: BarChart3,
  },
  {
    label: 'Achievements',
    description: 'Review unlocked badges and XP rewards.',
    href: '/achievements',
    icon: Shield,
  },
]

export default function DashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [dashboardOpen, setDashboardOpen] = useState(true)

  async function loadUser() {
    try {
      setProfile(await getUserProfile())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadUser()
  }, [])

  if (loading) {
    return (
      <SitePage>
        <div className="site-container flex min-h-[60vh] items-center justify-center py-24">
          <div className="w-full max-w-sm space-y-3">
            <div className="h-4 w-28 animate-pulse rounded bg-surface-2" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-surface-2" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-surface-2" />
          </div>
        </div>
      </SitePage>
    )
  }

  if (!profile) {
    return (
      <SitePage>
        <div className="site-container flex min-h-[65vh] flex-col items-center justify-center py-24 text-center">
          <div className="card max-w-md p-8">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
              <User size={22} />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
              Player login required
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Sign in with your Free Fire IGN or UID to open your player dashboard,
              manage registrations, and follow live standings.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link href="/login" className="btn-primary w-full">
                <LogIn size={15} />
                Sign in / Register
              </Link>
              <Link href="/" className="btn-secondary w-full">
                Return home
              </Link>
            </div>
          </div>
        </div>
      </SitePage>
    )
  }

  return (
    <SitePage>
      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Player HQ"
          title={
            <>
              {profile.ign || profile.username}
              <span className="text-brand-bright">’s dashboard</span>
            </>
          }
          description="Manage your tournament registrations, review your profile, and keep track of everything happening in the arena."
          meta={
            <>
              <span className="badge badge-brand">
                <Sparkles size={12} />
                {profile.role === 'admin' ? 'Administrator' : 'Elite player'}
              </span>
              {profile.level && <span className="badge">Level {profile.level}</span>}
            </>
          }
          actions={
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className="btn-primary"
            >
              Open dashboard
              <ArrowRight size={15} />
            </button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link
                key={link.href}
                href={link.href}
                className="card card-hover group flex flex-col p-5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-line bg-surface-2 text-brand-bright">
                  <Icon size={19} />
                </span>
                <h2 className="mt-4 text-sm font-semibold text-ink">
                  {link.label}
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-ink-muted">
                  {link.description}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ink-subtle transition-colors group-hover:text-brand-bright">
                  Open
                  <ArrowRight size={13} />
                </span>
              </Link>
            )
          })}
        </div>

        <div className="card mt-8 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-ink">
                Your full player dashboard is open
              </p>
              <p className="mt-1 text-xs text-ink-subtle">
                Edit your profile, review registrations, and manage your teams in
                the dashboard window.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setDashboardOpen(true)}
              className="btn-secondary btn-sm shrink-0"
            >
              <User size={14} />
              Open profile
            </button>
          </div>
        </div>

        <PlayerDashboard
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
          profile={profile}
          onProfileUpdated={loadUser}
        />
      </div>
    </SitePage>
  )
}
