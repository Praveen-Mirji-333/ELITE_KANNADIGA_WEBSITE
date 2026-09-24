'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { Trophy, Search, ChevronRight, Flame, Crosshair, Zap } from 'lucide-react'
import {
  fetchRankings,
  LeaderboardPlayer,
  fetchPlayerHonors,
  PlayerHonor,
} from '../../lib/supabase'
import { UserAvatar } from '../../components/ui/UserAvatar'

function renderTierBadge(tier?: string, rank?: string) {
  if (rank === '01' || tier === 'ELITE MASTER') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-red-600 via-amber-500 to-red-600 px-2.5 py-0.5 text-[10px] font-black uppercase text-white shadow-[0_0_12px_rgba(239,68,68,0.6)] animate-pulse tracking-wider">
        👑 ELITE MASTER
      </span>
    )
  }
  if (rank === '02' || tier === 'ELITE HEROIC') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-red-700 to-rose-900 border border-red-500/60 px-2 py-0.5 text-[9px] font-black uppercase text-red-200 shadow-[0_0_8px_rgba(225,6,0,0.4)] tracking-wider">
        ⚡ ELITE HEROIC
      </span>
    )
  }
  if (rank === '03' || tier === 'PLATINUM') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-cyan-800 to-blue-900 border border-cyan-400/50 px-2 py-0.5 text-[9px] font-black uppercase text-cyan-200 tracking-wider">
        💎 PLATINUM
      </span>
    )
  }
  if (rank === '04' || tier === 'GOLD') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-amber-700 to-yellow-900 border border-amber-400/50 px-2 py-0.5 text-[9px] font-black uppercase text-amber-200 tracking-wider">
        🥇 GOLD
      </span>
    )
  }
  if (rank === '05' || tier === 'SILVER') {
    return (
      <span className="inline-flex items-center gap-1 rounded bg-gradient-to-r from-slate-700 to-neutral-800 border border-slate-400/50 px-2 py-0.5 text-[9px] font-black uppercase text-slate-200 tracking-wider">
        🥈 SILVER
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded bg-white/5 border border-white/10 px-2 py-0.5 text-[9px] font-bold uppercase text-white/50 tracking-wider">
      🥉 BRONZE
    </span>
  )
}

export default function LeaderboardPage() {
  const [activeTab, setActiveTab] = useState<'LOGIN STREAK' | 'GUN GODS' | 'MOVEMENT GODS'>('LOGIN STREAK')
  const [rankings, setRankings] = useState<LeaderboardPlayer[]>([])
  const [honors, setHonors] = useState<PlayerHonor[]>([])
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      if (activeTab === 'LOGIN STREAK') {
        const data = await fetchRankings()
        console.log('[LeaderboardPage] fetchRankings result:', data?.map(p => ({ name: p.name, avatar_url: p.avatar_url })))
        setRankings(data)
      } else if (activeTab === 'GUN GODS') {
        const data = await fetchPlayerHonors('gun_gods')
        setHonors(data)
      } else if (activeTab === 'MOVEMENT GODS') {
        const data = await fetchPlayerHonors('movement_gods')
        setHonors(data)
      }
    }
    load()
  }, [activeTab])

  // Filter Rankings for Login Streak tab
  const filteredRankings = rankings.filter((player) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      player.name.toLowerCase().includes(q) ||
      player.uid.toLowerCase().includes(q) ||
      player.guild.toLowerCase().includes(q)
    )
  })

  // Filter Honors for Gun Gods or Movement Gods tab
  const filteredHonors = honors.filter((h) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      h.player_name.toLowerCase().includes(q) ||
      h.player_uid.toLowerCase().includes(q) ||
      h.title_name.toLowerCase().includes(q) ||
      (h.description || '').toLowerCase().includes(q)
    )
  })

  const streakChampion = filteredRankings[0] || {
    rank: '01',
    name: 'ELITE_RAHUL',
    uid: '1928374650',
    guild: 'ELITE ARMY',
    logins: 48,
    xp: 24920,
    level: 42,
    tier: 'ELITE MASTER',
  }

  const honorChampion = filteredHonors[0] || {
    rank: '01',
    player_name: 'ELITE_RAHUL',
    player_uid: '1928374650',
    title_name: activeTab === 'GUN GODS' ? 'M1887 One-Tap King' : '360 Gloo Wall Fast Dash',
    description: activeTab === 'GUN GODS' ? 'Dominates 1v1 custom rooms with devastating close-range headshot accuracy.' : 'Lightning fast gloo wall placement and unpredictable zig-zag rush movements.',
    tier: 'ELITE MASTER',
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8">
          <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-red-600" /> ELITE STANDINGS ({activeTab === 'LOGIN STREAK' ? rankings.length : honors.length} PLAYERS)
          </p>
          <h1 className="font-display text-3xl font-black uppercase text-white sm:text-5xl lg:text-6xl 2xl:text-7xl tracking-tight">
            COMMUNITY <span className="text-metallic">LEADERBOARD</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm 2xl:text-base">
            {activeTab === 'LOGIN STREAK'
              ? 'Maintain active login streaks and continuous website visits to dominate the top rankings.'
              : activeTab === 'GUN GODS'
              ? 'Official Gun Gods rankings recognizing players with lethal weapon mastery and supreme gunplay skills.'
              : 'Official Movement Gods rankings honoring players with supreme speed, reflex dodges, and gloo wall mastery.'}
          </p>
        </div>

        {/* Tab & Search Controls */}
        <div className="mb-6 sm:mb-8 flex flex-col items-stretch justify-between gap-3 sm:gap-4 md:flex-row md:items-center">
          <div className="flex overflow-x-auto no-scrollbar gap-2 border-b border-white/10 pb-3 md:border-b-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {(['LOGIN STREAK', 'GUN GODS', 'MOVEMENT GODS'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab)
                  setSearchQuery('')
                }}
                className={`shrink-0 whitespace-nowrap px-3.5 sm:px-5 py-2.5 sm:py-3 text-[11px] sm:text-xs font-black tracking-wider sm:tracking-widest transition flex items-center gap-2 ${
                  activeTab === tab
                    ? 'bg-red-600 text-white shadow-lg'
                    : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                }`}
              >
                {tab === 'LOGIN STREAK' && <Flame size={14} className={activeTab === tab ? 'fill-white' : 'text-red-500'} />}
                {tab === 'GUN GODS' && <Crosshair size={14} className="text-amber-400" />}
                {tab === 'MOVEMENT GODS' && <Zap size={14} className="text-cyan-400" />}
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72 lg:w-80 shrink-0">
            <Search className="absolute left-3.5 top-3 text-white/40" size={15} />
            <input
              type="text"
              placeholder="SEARCH PLAYER OR UID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-white/15 bg-white/5 py-2 sm:py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/40 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* SECTION 1: LOGIN STREAK LEADERBOARD */}
        {activeTab === 'LOGIN STREAK' && (
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] 2xl:grid-cols-[1fr_1.3fr]">
            {/* Champion Highlight (#1 Ranked Player by Logins) */}
            <div className="rank-feature angular-panel relative overflow-hidden p-5 sm:p-8 border border-red-600/40 bg-gradient-to-br from-red-950/40 via-black to-black flex flex-col justify-between">
              <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-red-600/20 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="eyebrow text-red-500">RANK #1 ARENA CHAMPION</p>
                  {renderTierBadge(streakChampion.tier, streakChampion.rank)}
                </div>

                <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6">
                  <UserAvatar
                    src={streakChampion.avatar_url}
                    name={streakChampion.name}
                    size="xl"
                    className="border-2 border-red-500 shadow-[0_0_20px_rgba(225,6,0,0.6)] shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl sm:text-3xl 2xl:text-4xl font-black text-white truncate">
                      {streakChampion.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs font-bold tracking-widest text-amber-400">
                      UID: {streakChampion.uid}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold tracking-widest text-white/40 truncate">
                      {streakChampion.guild} / LVL {streakChampion.level}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-12 grid grid-cols-2 gap-3 sm:gap-4 border-t border-white/10 pt-5 sm:pt-6">
                <div>
                  <p className="label text-[10px] sm:text-xs text-amber-400">TOTAL LOGINS</p>
                  <p className="font-display text-xl sm:text-2xl 2xl:text-3xl font-black text-white flex items-center gap-1.5 sm:gap-2">
                    <Flame className="text-red-500 inline shrink-0" size={20} />
                    {streakChampion.logins} Times
                  </p>
                </div>
                <div>
                  <p className="label text-[10px] sm:text-xs">TOTAL XP</p>
                  <p className="font-display text-xl sm:text-2xl 2xl:text-3xl font-black text-metallic truncate">
                    {streakChampion.xp.toLocaleString()} XP
                  </p>
                </div>
              </div>
            </div>

            {/* Leaderboard Table List (Shows ALL database registrations) */}
            <div className="angular-panel divide-y divide-white/10 max-h-[640px] sm:max-h-[720px] 2xl:max-h-[820px] overflow-y-auto">
              {filteredRankings.map((player) => (
                <div
                  key={player.rank + player.id + player.uid}
                  className={`flex items-center gap-2.5 sm:gap-4 px-3 sm:px-6 py-3 sm:py-4 transition hover:bg-white/5 ${
                    player.rank === '01' ? 'bg-red-950/20 border-l-2 border-red-500' : ''
                  }`}
                >
                  <span
                    className={`font-display w-6 sm:w-8 text-base sm:text-xl font-black text-center shrink-0 ${
                      player.rank === '01'
                        ? 'text-red-500'
                        : player.rank === '02'
                        ? 'text-amber-400'
                        : player.rank === '03'
                        ? 'text-cyan-400'
                        : player.rank === '04'
                        ? 'text-yellow-400'
                        : player.rank === '05'
                        ? 'text-slate-300'
                        : 'text-white/40'
                    }`}
                  >
                    {player.rank}
                  </span>

                  <div className="shrink-0">
                    <UserAvatar
                      src={player.avatar_url}
                      name={player.name}
                      size="md"
                      className="border border-white/20 h-9 w-9 sm:h-11 sm:w-11"
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <p className="truncate text-xs sm:text-sm font-black text-white">{player.name}</p>
                      {renderTierBadge(player.tier, player.rank)}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 flex-wrap">
                      <span className="font-mono text-[9px] sm:text-[10px] text-amber-400">
                        UID: {player.uid}
                      </span>
                      <span className="text-[10px] font-bold text-white/30 hidden xs:inline">•</span>
                      <span className="truncate text-[9px] sm:text-[10px] font-bold tracking-widest text-white/40 max-w-[120px] sm:max-w-none">
                        {player.guild}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="font-display text-xs sm:text-sm font-bold text-amber-400 flex items-center justify-end gap-1">
                      <Flame size={12} className="text-red-500 fill-red-500 shrink-0" />
                      <span>{player.logins}</span>
                      <span className="hidden sm:inline">Logins</span>
                    </p>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/50">
                      {player.xp.toLocaleString()} XP
                    </p>
                  </div>

                  <ChevronRight size={15} className="text-white/20 shrink-0 hidden sm:block" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2 & 3: GUN GODS AND MOVEMENT GODS LEADERBOARD */}
        {(activeTab === 'GUN GODS' || activeTab === 'MOVEMENT GODS') && (
          <div className="grid gap-6 lg:grid-cols-[.9fr_1.1fr] 2xl:grid-cols-[1fr_1.3fr]">
            {/* Champion Highlight for Gun/Movement Gods */}
            <div className="rank-feature angular-panel relative overflow-hidden p-5 sm:p-8 border border-amber-600/40 bg-gradient-to-br from-amber-950/30 via-black to-black flex flex-col justify-between">
              <div className="absolute -right-12 -top-12 h-56 w-56 rounded-full border border-amber-600/20 pointer-events-none" />
              <div>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="eyebrow text-amber-400">
                    {activeTab === 'GUN GODS' ? 'RANK #1 GUN GOD' : 'RANK #1 MOVEMENT GOD'}
                  </p>
                  {renderTierBadge(honorChampion.tier, honorChampion.rank || '01')}
                </div>

                <div className="mt-6 sm:mt-8 flex items-center gap-4 sm:gap-6">
                  <UserAvatar
                    src={honorChampion.avatar_url}
                    name={honorChampion.player_name}
                    size="xl"
                    className="border-2 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="font-display text-2xl sm:text-3xl 2xl:text-4xl font-black text-white truncate">
                      {honorChampion.player_name}
                    </h3>
                    <p className="mt-1 font-mono text-xs font-bold tracking-widest text-amber-400">
                      UID: {honorChampion.player_uid}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 sm:mt-10 border-t border-white/10 pt-5 sm:pt-6">
                <p className="label text-[10px] sm:text-xs text-amber-400 mb-1">
                  {activeTab === 'GUN GODS' ? 'GUN SPECIALTY / TITLE' : 'MOVEMENT STYLE / TITLE'}
                </p>
                <h4 className="font-display text-xl sm:text-2xl font-black text-white flex items-center gap-2">
                  {activeTab === 'GUN GODS' ? (
                    <Crosshair className="text-amber-400 inline shrink-0" size={20} />
                  ) : (
                    <Zap className="text-cyan-400 inline shrink-0" size={20} />
                  )}
                  <span className="truncate">{honorChampion.title_name}</span>
                </h4>
                <p className="mt-2.5 sm:mt-3 text-xs leading-relaxed text-white/70 italic bg-white/5 border border-white/10 p-3 sm:p-3.5 rounded">
                  "{honorChampion.description}"
                </p>
              </div>
            </div>

            {/* List of Gun Gods / Movement Gods */}
            <div className="angular-panel divide-y divide-white/10 max-h-[640px] sm:max-h-[720px] 2xl:max-h-[820px] overflow-y-auto">
              {filteredHonors.length === 0 ? (
                <div className="p-8 sm:p-12 text-center text-xs sm:text-sm text-white/40">
                  No {activeTab} awarded yet. Admin can assign titles by searching Player UIDs in Control Center.
                </div>
              ) : (
                filteredHonors.map((h, idx) => {
                  const rankStr = h.rank || String(idx + 1).padStart(2, '0')
                  return (
                    <div
                      key={h.id || h.player_uid + idx}
                      className={`flex items-start gap-2.5 sm:gap-4 px-3 sm:px-6 py-3.5 sm:py-4.5 transition hover:bg-white/5 ${
                        rankStr === '01' ? 'bg-amber-950/20 border-l-2 border-amber-500' : ''
                      }`}
                    >
                      <span
                        className={`font-display w-6 sm:w-8 text-base sm:text-xl font-black mt-1 text-center shrink-0 ${
                          rankStr === '01'
                            ? 'text-amber-400'
                            : rankStr === '02'
                            ? 'text-red-500'
                            : rankStr === '03'
                            ? 'text-cyan-400'
                            : rankStr === '04'
                            ? 'text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {rankStr}
                      </span>

                      <div className="shrink-0 mt-0.5">
                        <UserAvatar
                          src={h.avatar_url}
                          name={h.player_name}
                          size="md"
                          className="border border-amber-500/40 h-9 w-9 sm:h-11 sm:w-11"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <p className="truncate text-sm sm:text-base font-black text-white">{h.player_name}</p>
                          {renderTierBadge(h.tier, rankStr)}
                        </div>
                        <p className="font-mono text-[9px] sm:text-[10px] text-amber-400 mt-0.5">
                          UID: {h.player_uid}
                        </p>
                        <div className="mt-2 bg-white/5 border border-white/10 p-2 sm:p-2.5 rounded">
                          <p className="font-display text-[11px] sm:text-xs font-bold text-amber-300 flex items-center gap-1.5">
                            {activeTab === 'GUN GODS' ? <Crosshair size={13} className="shrink-0" /> : <Zap size={13} className="shrink-0" />}
                            <span className="truncate">{h.title_name}</span>
                          </p>
                          {h.description && (
                            <p className="mt-1 text-[10px] sm:text-[11px] text-white/60 leading-snug">
                              {h.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
