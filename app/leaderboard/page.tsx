'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ChevronRight,
  Crosshair,
  Flame,
  Search,
  Trophy,
  X,
  Zap,
} from 'lucide-react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import {
  fetchRankings,
  fetchPlayerHonors,
  type LeaderboardPlayer,
  type PlayerHonor,
} from '../../lib/supabase'
import { UserAvatar } from '../../components/ui/UserAvatar'

type LeaderboardTab = 'LOGIN STREAK' | 'GUN GODS' | 'MOVEMENT GODS'

const tabs: { name: LeaderboardTab; short: string; icon: typeof Flame }[] = [
  { name: 'LOGIN STREAK', short: 'Streak', icon: Flame },
  { name: 'GUN GODS', short: 'Gun Gods', icon: Crosshair },
  { name: 'MOVEMENT GODS', short: 'Movement', icon: Zap },
]

function TierBadge({ tier, rank }: { tier?: string; rank?: string }) {
  const label =
    rank === '01' || tier === 'ELITE MASTER'
      ? 'Elite Master'
      : rank === '02' || tier === 'ELITE HEROIC'
        ? 'Elite Heroic'
        : rank === '03' || tier === 'PLATINUM'
          ? 'Platinum'
          : rank === '04' || tier === 'GOLD'
            ? 'Gold'
            : rank === '05' || tier === 'SILVER'
              ? 'Silver'
              : 'Bronze'

  const isTop = label === 'Elite Master'
  const isSecond = label === 'Elite Heroic'

  return (
    <span
      className={`badge ${
        isTop
          ? 'badge-brand'
          : isSecond
            ? 'border-brand-border bg-brand-muted text-brand-bright'
            : ''
      }`}
    >
      {label}
    </span>
  )
}

function EmptyChampion({ label }: { label: string }) {
  return (
    <div className="card flex min-h-[280px] flex-col items-center justify-center p-6 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
        <Trophy size={22} />
      </span>
      <p className="mt-4 text-sm font-semibold text-ink">No champion yet</p>
      <p className="mt-1 max-w-xs text-xs text-ink-subtle">{label}</p>
    </div>
  )
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('LOGIN STREAK')
  const [rankings, setRankings] = useState<LeaderboardPlayer[]>([])
  const [honors, setHonors] = useState<PlayerHonor[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      if (activeTab === 'LOGIN STREAK') {
        setRankings(await fetchRankings())
      } else if (activeTab === 'GUN GODS') {
        setHonors(await fetchPlayerHonors('gun_gods'))
      } else {
        setHonors(await fetchPlayerHonors('movement_gods'))
      }
    }
    load()
  }, [activeTab])

  const query = searchQuery.trim().toLowerCase()

  const filteredRankings = rankings.filter((player) => {
    if (!query) return true
    return (
      player.name.toLowerCase().includes(query) ||
      player.uid.toLowerCase().includes(query) ||
      player.guild.toLowerCase().includes(query)
    )
  })

  const filteredHonors = honors.filter((honor) => {
    if (!query) return true
    return (
      honor.player_name.toLowerCase().includes(query) ||
      honor.player_uid.toLowerCase().includes(query) ||
      honor.title_name.toLowerCase().includes(query) ||
      (honor.description || '').toLowerCase().includes(query)
    )
  })

  const streakChampion = filteredRankings[0] || null
  const honorChampion = filteredHonors[0] || null
  const totalPlayers =
    activeTab === 'LOGIN STREAK' ? rankings.length : honors.length

  const description =
    activeTab === 'LOGIN STREAK'
      ? 'Maintain active login streaks and continuous visits to climb the community rankings.'
      : activeTab === 'GUN GODS'
        ? 'Official Gun Gods rankings for players with lethal weapon mastery and elite gunplay.'
        : 'Official Movement Gods rankings for players with elite speed, reflexes, and gloo-wall control.'

  return (
    <SitePage>
      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Elite standings"
          title={
            <>
              Community <span className="text-brand-bright">leaderboard</span>
            </>
          }
          description={description}
          meta={
            <>
              <span className="badge">{totalPlayers} ranked players</span>
              <span className="badge">Updated live</span>
            </>
          }
        />

        {/* Tabs + search */}
        <div className="surface mb-6 flex flex-col gap-2 p-2 md:flex-row md:items-center md:justify-between">
          <div
            className="grid min-w-0 grid-cols-3 gap-1 sm:flex sm:gap-1"
            role="tablist"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.name
              return (
                <button
                  key={tab.name}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => {
                    setActiveTab(tab.name)
                    setSearchQuery('')
                  }}
                  className={`flex min-h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 text-xs font-bold tracking-[0.05em] uppercase transition-all sm:shrink-0 sm:justify-start sm:gap-2 sm:px-3.5 ${
                    isActive
                      ? 'neu-btn-crimson !min-h-9 !py-0 text-white'
                      : 'neu-btn-dark !min-h-9 !py-0 text-ink-muted hover:text-ink'
                  }`}
                >
                  <Icon
                    size={14}
                    className={`hidden shrink-0 sm:block ${isActive ? 'text-white' : 'text-ink-subtle'}`}
                  />
                  <span className="truncate text-[12px] sm:hidden">{tab.short}</span>
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              )
            })}
          </div>

          <div className="relative w-full shrink-0 md:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
              size={16}
            />
            <input
              type="text"
              placeholder="Search player or UID..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="field h-10 pl-9 pr-9 text-sm"
              aria-label="Search players"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded text-ink-subtle transition-colors hover:bg-surface-2 hover:text-ink"
                aria-label="Clear search"
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>

        <div className="grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr] 2xl:grid-cols-[0.8fr_1.2fr]">
          {activeTab === 'LOGIN STREAK' ? (
            <>
              {streakChampion ? (
                <div className="space-y-5 self-start lg:sticky lg:top-24">
                  <div className="card relative overflow-hidden p-5 sm:p-6 lg:p-7">
                  <div
                    className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="badge badge-brand">
                        <Trophy size={12} />
                        Rank #1
                      </span>
                      <TierBadge tier={streakChampion.tier} rank={streakChampion.rank} />
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <UserAvatar
                        src={streakChampion.avatar_url}
                        name={streakChampion.name}
                        size="xl"
                        className="h-16 w-16 shrink-0 border-2 border-brand-border"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold tracking-tight text-ink">
                          {streakChampion.name}
                        </h2>
                        <p className="mt-1 truncate font-mono text-xs text-brand-bright">
                          UID: {streakChampion.uid}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-ink-subtle">
                          {streakChampion.guild} · Level {streakChampion.level}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 grid grid-cols-2 gap-4 border-t border-line-subtle pt-5">
                      <div>
                        <p className="label">Total logins</p>
                        <p className="mt-1 flex items-center gap-1.5 text-xl font-bold tracking-tight text-ink">
                          <Flame size={17} className="text-brand-bright" />
                          {streakChampion.logins}
                        </p>
                      </div>
                      <div>
                        <p className="label">Total XP</p>
                        <p className="mt-1 text-xl font-bold tracking-tight text-ink">
                          {streakChampion.xp.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                  </div>

                  <div className="card p-5">
                    <p className="label">How streaks work</p>
                    <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-ink-muted">
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-brand bg-brand-muted text-[10px] font-bold text-brand-bright">
                          1
                        </span>
                        Visit the arena each day to keep your login streak active.
                      </li>
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-bold text-ink-subtle">
                          2
                        </span>
                        Compete in verified tournaments and earn XP along the way.
                      </li>
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-bold text-ink-subtle">
                          3
                        </span>
                        The longest active streak holds the top community ranking.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <EmptyChampion label="Login streak data will appear when players start visiting." />
              )}

              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                    Login streak rankings
                  </p>
                  <span className="text-xs text-ink-subtle">{filteredRankings.length}</span>
                </div>

                {filteredRankings.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-ink">No players found</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      Try a different name, UID, or guild.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[640px] divide-y divide-line-subtle overflow-y-auto">
                    {filteredRankings.map((player) => (
                      <div
                        key={`${player.rank}-${player.id}-${player.uid}`}
                        className={`flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5 ${
                          player.rank === '01' ? 'bg-brand-muted' : ''
                        }`}
                      >
                        <span
                          className={`w-7 shrink-0 text-center text-sm font-bold tabular-nums ${
                            player.rank === '01' ? 'text-brand-bright' : 'text-ink-subtle'
                          }`}
                        >
                          {player.rank}
                        </span>
                        <UserAvatar
                          src={player.avatar_url}
                          name={player.name}
                          size="md"
                          className="h-10 w-10 shrink-0 border border-line"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="truncate text-sm font-semibold text-ink">
                              {player.name}
                            </p>
                            <span className="hidden xs:inline-flex">
                              <TierBadge tier={player.tier} rank={player.rank} />
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-mono text-brand-bright">
                              UID {player.uid}
                            </span>
                            <span className="text-ink-subtle">·</span>
                            <span className="truncate text-ink-subtle">{player.guild}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="flex items-center justify-end gap-1 text-sm font-semibold text-ink">
                            <Flame size={12} className="text-brand-bright" />
                            {player.logins}
                          </p>
                          <p className="mt-0.5 text-xs text-ink-subtle">
                            {player.xp.toLocaleString()} XP
                          </p>
                        </div>
                        <ChevronRight
                          size={15}
                          className="hidden shrink-0 text-ink-subtle sm:block"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              {honorChampion ? (
                <div className="space-y-5 self-start lg:sticky lg:top-24">
                  <div className="card relative overflow-hidden p-5 sm:p-6 lg:p-7">
                  <div
                    className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-brand/10 blur-3xl"
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="badge badge-brand">
                        <Trophy size={12} />
                        Rank #1
                      </span>
                      <TierBadge tier={honorChampion.tier} rank={honorChampion.rank || '01'} />
                    </div>

                    <div className="mt-6 flex items-center gap-4">
                      <UserAvatar
                        src={honorChampion.avatar_url}
                        name={honorChampion.player_name}
                        size="xl"
                        className="h-16 w-16 shrink-0 border-2 border-brand-border"
                      />
                      <div className="min-w-0">
                        <h2 className="truncate text-2xl font-bold tracking-tight text-ink">
                          {honorChampion.player_name}
                        </h2>
                        <p className="mt-1 truncate font-mono text-xs text-brand-bright">
                          UID: {honorChampion.player_uid}
                        </p>
                      </div>
                    </div>

                    <div className="mt-7 border-t border-line-subtle pt-5">
                      <p className="label">
                        {activeTab === 'GUN GODS' ? 'Gun specialty' : 'Movement style'}
                      </p>
                      <h3 className="mt-1.5 flex items-center gap-2 text-lg font-semibold tracking-tight text-ink">
                        {activeTab === 'GUN GODS' ? (
                          <Crosshair size={18} className="shrink-0 text-brand-bright" />
                        ) : (
                          <Zap size={18} className="shrink-0 text-brand-bright" />
                        )}
                        <span className="truncate">{honorChampion.title_name}</span>
                      </h3>
                      {honorChampion.description && (
                        <p className="mt-3 rounded-lg border border-line-subtle bg-surface-2 p-3 text-xs leading-relaxed text-ink-muted">
                          {honorChampion.description}
                        </p>
                      )}
                    </div>
                  </div>
                  </div>

                  <div className="card p-5">
                    <p className="label">
                      {activeTab === 'GUN GODS'
                        ? 'How Gun Gods are ranked'
                        : 'How Movement Gods are ranked'}
                    </p>
                    <ul className="mt-3 space-y-2.5 text-xs leading-relaxed text-ink-muted">
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-brand bg-brand-muted text-[10px] font-bold text-brand-bright">
                          1
                        </span>
                        Titles are awarded by admins for verified in-game skill.
                      </li>
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-bold text-ink-subtle">
                          2
                        </span>
                        Every title includes a specialty and a short performance note.
                      </li>
                      <li className="flex gap-2.5">
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-bold text-ink-subtle">
                          3
                        </span>
                        Rank #1 is the latest top-ranked title holder in this category.
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                <EmptyChampion label="Titles will appear here once the admin awards them." />
              )}

              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.1em] text-ink-subtle">
                    {activeTab === 'GUN GODS' ? 'Gun Gods' : 'Movement Gods'}
                  </p>
                  <span className="text-xs text-ink-subtle">{filteredHonors.length}</span>
                </div>

                {filteredHonors.length === 0 ? (
                  <div className="px-5 py-12 text-center">
                    <p className="text-sm font-medium text-ink">No titles awarded yet</p>
                    <p className="mt-1 text-xs text-ink-subtle">
                      The admin can assign titles from the control center.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-[640px] divide-y divide-line-subtle overflow-y-auto">
                    {filteredHonors.map((honor, index) => {
                      const rank = honor.rank || String(index + 1).padStart(2, '0')
                      return (
                        <div
                          key={honor.id || `${honor.player_uid}-${index}`}
                          className={`flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 sm:px-5 ${
                            rank === '01' ? 'bg-brand-muted' : ''
                          }`}
                        >
                          <span
                            className={`mt-0.5 w-7 shrink-0 text-center text-sm font-bold tabular-nums ${
                              rank === '01' ? 'text-brand-bright' : 'text-ink-subtle'
                            }`}
                          >
                            {rank}
                          </span>
                          <UserAvatar
                            src={honor.avatar_url}
                            name={honor.player_name}
                            size="md"
                            className="h-10 w-10 shrink-0 border border-line"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="truncate text-sm font-semibold text-ink">
                                {honor.player_name}
                              </p>
                              <span className="hidden xs:inline-flex">
                                <TierBadge tier={honor.tier} rank={rank} />
                              </span>
                            </div>
                            <p className="mt-0.5 font-mono text-xs text-brand-bright">
                              UID {honor.player_uid}
                            </p>
                            <div className="mt-2 rounded-md border border-line-subtle bg-surface-2 px-2.5 py-2">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-bright">
                                {activeTab === 'GUN GODS' ? (
                                  <Crosshair size={12} className="shrink-0" />
                                ) : (
                                  <Zap size={12} className="shrink-0" />
                                )}
                                <span className="truncate">{honor.title_name}</span>
                              </p>
                              {honor.description && (
                                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink-muted">
                                  {honor.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 rounded-xl border border-line bg-surface px-5 py-4 sm:flex-row sm:items-center">
          <p className="text-xs text-ink-subtle">
            Rankings update as players visit, compete, and earn verified titles.
          </p>
          <a
            href="/achievements"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted transition-colors hover:text-brand-bright"
          >
            View achievements
            <ArrowRight size={14} />
          </a>
        </div>
      </div>
    </SitePage>
  )
}
