'use client'

import { useEffect, useState } from 'react'
import { Shield, Sparkles, Trophy } from 'lucide-react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import { fetchAchievements } from '../../lib/supabase'
import type { Achievement } from '../../lib/types'
import { UserAvatar } from '../../components/ui/UserAvatar'

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        setAchievements(await fetchAchievements())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <SitePage>
      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Hall of fame"
          title={
            <>
              Legacy <span className="text-brand-bright">achievements</span>
            </>
          }
          description="Unlock achievement cards by competing in tournaments, maintaining login streaks, and taking part in live community activities."
          meta={
            <>
              <span className="badge">
                {achievements.length} {achievements.length === 1 ? 'badge' : 'badges'}
              </span>
              <span className="badge">Verified unlocks</span>
            </>
          }
        />

        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {[0, 1, 2, 3].map((item) => (
              <div key={item} className="card h-64 animate-pulse bg-surface-2" />
            ))}
          </div>
        ) : achievements.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-surface px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
              <Trophy size={22} />
            </span>
            <h2 className="mt-4 text-base font-semibold text-ink">No achievements published</h2>
            <p className="mt-1 max-w-sm text-sm text-ink-muted">
              Badges will appear here as the community unlocks them.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
            {achievements.map((achievement) => {
              const isLegendary = achievement.rarity === 'LEGENDARY'
              const isEpic = achievement.rarity === 'EPIC'

              return (
                <article
                  key={achievement.id}
                  className={`card flex flex-col p-5 transition-colors hover:border-line-strong sm:p-6 ${
                    isLegendary ? 'border-brand-border bg-brand-muted' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid h-11 w-11 place-items-center overflow-hidden rounded-lg border ${
                        isLegendary
                          ? 'border-brand-border bg-brand/15 text-brand-bright'
                          : 'border-line bg-surface-2 text-ink-muted'
                      }`}
                    >
                      {achievement.icon_url ? (
                        <img
                          src={achievement.icon_url}
                          alt=""
                          className="h-7 w-7 object-contain"
                        />
                      ) : (
                        <Shield size={22} />
                      )}
                    </span>
                    <span
                      className={`badge ${
                        isLegendary
                          ? 'border-brand-border bg-brand/15 text-brand-bright'
                          : isEpic
                            ? 'border-line-strong text-ink'
                            : ''
                      }`}
                    >
                      {achievement.rarity}
                    </span>
                  </div>

                  <h2 className="mt-5 text-lg font-semibold tracking-tight text-ink">
                    {achievement.name}
                  </h2>

                  {(achievement.player_name || achievement.player_uid) && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-line-subtle bg-surface-2 p-2.5">
                      <UserAvatar
                        src={achievement.avatar_url}
                        name={achievement.player_name}
                        size="sm"
                        className="h-9 w-9 shrink-0 border border-line"
                      />
                      <div className="min-w-0">
                        {achievement.player_name && (
                          <p className="truncate text-xs font-semibold text-ink">
                            {achievement.player_name}
                          </p>
                        )}
                        {achievement.player_uid && (
                          <p className="truncate font-mono text-xs text-brand-bright">
                            UID {achievement.player_uid}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-3 text-xs leading-relaxed text-ink-muted">
                    {achievement.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between border-t border-line-subtle pt-4">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-brand-bright">
                      <Sparkles size={14} />
                      +{achievement.xp_reward} XP
                    </span>
                    <span className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                      Active badge
                    </span>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </SitePage>
  )
}
