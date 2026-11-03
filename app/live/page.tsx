'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, Play, Radio, Sparkles, Trophy, Users, Video } from 'lucide-react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import { SectionHeader } from '../../components/layout/SectionHeader'
import { LiveTournamentSection } from '../../components/dashboard/LiveTournamentSection'
import { getUserProfile, supabase } from '../../lib/supabase'
import type { Profile } from '../../lib/types'

const clips = [
  {
    title: '1V4 clutch',
    player: 'ELITE_RAHUL',
    color: 'from-brand-muted via-surface-2 to-canvas',
    views: '14.2K',
  },
  {
    title: 'Last bullet',
    player: 'SHADOW_77',
    color: 'from-surface-2 via-brand-muted to-canvas',
    views: '9.8K',
  },
  {
    title: 'Booyah finish',
    player: 'KANNADA_KING',
    color: 'from-brand-muted via-canvas to-surface-2',
    views: '22.1K',
  },
]

export default function LivePage() {
  const [userProfile, setUserProfile] = useState<Profile | null>(null)

  const loadUser = async () => {
    try {
      setUserProfile(await getUserProfile())
    } catch {
      setUserProfile(null)
    }
  }

  useEffect(() => {
    loadUser()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => loadUser())
    return () => subscription.unsubscribe()
  }, [])

  return (
    <SitePage>
      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Live arena"
          title={
            <>
              Live intel &amp; <span className="text-brand-bright">standings</span>
            </>
          }
          description="Live broadcast, current points table, and registered squad list — updated each match."
          meta={
            <>
              <span className="badge badge-brand">
                <span className="live-dot" aria-hidden="true" />
                Live now
              </span>
              <span className="badge">Official broadcast</span>
            </>
          }
        />

        {/* Live points table */}
        <section id="live-points" className="section-sm">
          <SectionHeader
            kicker="Tournament league"
            title={
              <>
                Live <span className="text-brand-bright">points table</span>
              </>
            }
            description="Live points, rounds-lost tie-breakers, and squad rosters for the featured tournament selected by the admin."
            action={
              <span className="badge">
                <Trophy size={12} />
                Verified standings
              </span>
            }
          />

          <LiveTournamentSection
            currentUserProfile={userProfile}
            onProfileUpdated={loadUser}
          />
        </section>

        {/* Broadcast */}
        <section className="section-sm border-t border-line-subtle">
          <SectionHeader
            kicker="Community broadcast"
            title={
              <>
                Livestream <span className="text-brand-bright">arena</span>
              </>
            }
            description="The official ELITE ಕನ್ನಡಿಗ stream, live giveaways, and viewer rewards."
            action={
              <span className="badge">
                <Radio size={12} />
                1,248 watching
              </span>
            }
          />

          <div className="grid gap-5 lg:grid-cols-[1.55fr_1fr]">
            <div className="relative min-h-[340px] overflow-hidden rounded-xl border border-line bg-surface sm:min-h-[420px]">
              <img
                src="/images/stream-preview.jpg"
                alt="ELITE Kannada live broadcast preview"
                className="absolute inset-0 h-full w-full object-cover opacity-55"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

              <div className="relative flex min-h-[340px] flex-col justify-between p-5 sm:min-h-[420px] sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="badge badge-brand">
                    <span className="live-dot" aria-hidden="true" />
                    Live broadcast
                  </span>
                  <span className="badge border-white/15 bg-black/40 text-white/85">
                    <Users size={12} />
                    1,248 watching
                  </span>
                </div>

                <div>
                  <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-bright">
                    <Video size={14} />
                    Free Fire custom room #104
                  </p>
                  <h2 className="mt-2 max-w-xl text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    ELITE Guild War <span className="text-brand-bright">Finals</span>
                  </h2>
                  <p className="mt-2 text-xs text-white/65">
                    Bermuda · Squad · Best of 3 · Official casters
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2.5">
                    <button type="button" className="btn-primary">
                      <Play size={15} fill="currentColor" />
                      Watch livestream
                    </button>
                    <button type="button" className="btn-secondary border-white/15 bg-black/35 text-white hover:bg-black/50">
                      Chat room
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="card flex flex-col justify-between p-5 sm:p-6">
              <div>
                <div className="flex items-center justify-between border-b border-line-subtle pb-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                    Stream intel
                  </p>
                  <span className="badge badge-brand">
                    <span className="live-dot" aria-hidden="true" />
                    Active
                  </span>
                </div>

                <dl className="mt-4 space-y-3.5 text-sm">
                  {[
                    ['Top viewer', 'NAYAKA_07'],
                    ['Current giveaway', '₹500 redeem code'],
                    ['Stream XP pool', '8,420 XP'],
                    ['MV player', 'ELITE_RAHUL'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between gap-3">
                      <dt className="text-ink-subtle">{label}</dt>
                      <dd className="text-right font-medium text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-lg border border-brand-border bg-brand-muted p-3.5">
                <Sparkles size={17} className="mt-0.5 shrink-0 text-brand-bright" />
                <p className="text-xs leading-relaxed text-ink-muted">
                  Watch 15 minutes of the stream to unlock the Stream XP badge.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Clips */}
        <section className="section-sm border-t border-line-subtle">
          <SectionHeader
            kicker="Community clips"
            title="Recent highlights"
            description="The best plays, clutches, and finishes from the community."
          />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 3xl:grid-cols-4">
            {clips.map((clip) => (
              <article
                key={clip.title}
                className={`clip-card group relative flex min-h-[190px] flex-col justify-between overflow-hidden border border-line bg-gradient-to-br ${clip.color} p-5 transition-colors hover:border-line-strong sm:p-6`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="badge border-white/15 bg-black/30 text-white/85">
                    {clip.title}
                  </span>
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-white/15 bg-black/35 text-white transition-colors group-hover:border-brand group-hover:bg-brand">
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                  </span>
                </div>
                <div>
                  <p className="text-lg font-semibold text-ink">{clip.player}</p>
                  <p className="mt-1 text-xs font-medium uppercase tracking-[0.1em] text-ink-subtle">
                    {clip.views} views · 840 likes
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </SitePage>
  )
}
