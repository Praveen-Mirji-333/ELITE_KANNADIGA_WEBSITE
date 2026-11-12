'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ArrowUpRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  Gamepad2,
  MapPin,
  Play,
  Shield,
  Sparkles,
  Trophy,
  Users,
  Search,
  Flame,
  Radio,
  User,
} from 'lucide-react'
import { SitePage } from '../components/layout/SitePage'
import {
  fetchDynamicHomeStats,
  fetchEliteArmyGuild,
  fetchRankings,
  fetchTournaments,
  LeaderboardPlayer,
  trackPageVisit,
} from '../lib/supabase'
import type { Guild, GuildMember, Tournament } from '../lib/types'

const mascotSlides = [
  {
    id: 1,
    image: '/images/carousel-elite-kannadiga.jpg',
    title: 'ELITE ಕನ್ನಡಿಗ',
    subtitle: 'Official Karnataka Esports Hub',
    badge: 'COMMUNITY',
    progress: 100,
  },
  {
    id: 2,
    image: '/images/carousel-elite-army.jpg',
    title: 'ELITE ARMY',
    subtitle: 'Official Guild Roster & Squad',
    badge: 'GUILD ROSTER',
    progress: 100,
  },
]

/* --- Compact Wrapped Navigation Hub (Designed for non-tech & mobile users) --- */
const navCards = [
  {
    title: 'Tournaments',
    kannadaTitle: 'ಟೂರ್ನಮೆಂಟ್ಗಳು',
    href: '/tournaments',
    tag: '₹10,000+ Cash',
    actionText: 'Enter',
    isPrimary: true,
    icon: Trophy,
  },
  {
    title: 'Live Arena',
    kannadaTitle: 'ಲೈವ್ ಪಂದ್ಯಗಳು',
    href: '/live',
    tag: 'Live Stream',
    actionText: 'Watch',
    isLive: true,
    icon: Radio,
  },
  {
    title: 'Leaderboard',
    kannadaTitle: 'ಲೀಡರ್‌ಬೋರ್ಡ್',
    href: '/leaderboard',
    tag: 'Top 100 Players',
    actionText: 'Rankings',
    icon: Flame,
  },
  {
    title: 'Elite Guild',
    kannadaTitle: 'ಆರ್ಮಿ ಗಿಲ್ಡ್',
    href: '/guilds',
    tag: 'Tier 1 Squad',
    actionText: 'Roster',
    icon: Shield,
  },
  {
    title: 'Achievements',
    kannadaTitle: 'ಸಾಧನೆಗಳು',
    href: '/achievements',
    tag: 'Badges & Trophies',
    actionText: 'Badges',
    icon: Sparkles,
  },
  {
    title: 'My Profile',
    kannadaTitle: 'ನನ್ನ ಪ್ರೊಫೈಲ್',
    action: 'dashboard',
    tag: 'UID & Rewards',
    actionText: 'Account',
    icon: User,
  },
]

/* --- Light Neumorphic Visualizer Components --- */

// 3D Audio Frequency Waveform (Coral-red active frequency bars)
function AudioFrequencyWaveform({ active = true, barCount = 18 }: { active?: boolean; barCount?: number }) {
  const heights = [6, 14, 22, 10, 26, 18, 30, 24, 12, 28, 20, 8, 26, 16, 28, 12, 20, 10, 24, 18]
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: barCount }).map((_, i) => {
        const height = heights[i % heights.length]
        return (
          <span
            key={i}
            className={`w-[2.5px] sm:w-[3px] rounded-full transition-all duration-300 ${
              active ? 'neu-wave-bar' : 'bg-neutral-300'
            }`}
            style={{
              height: active ? undefined : `${height}px`,
              animationDelay: `${(i * 0.08).toFixed(2)}s`,
              animationDuration: `${0.9 + (i % 5) * 0.15}s`,
            }}
          />
        )
      })}
    </div>
  )
}

// 3D Circular Progress Dial (Matching circular dials from reference image)
function NeuCircularDial({
  percent,
  size = 64,
  strokeWidth = 5,
  label,
}: {
  percent: number
  size?: number
  strokeWidth?: number
  label?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (percent / 100) * circumference

  return (
    <div className="relative inline-flex flex-col items-center justify-center">
      <div
        className="neu-circle relative flex items-center justify-center"
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(0, 0, 0, 0.08)"
            strokeWidth={strokeWidth}
          />
          {/* Coral-Red Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="url(#coralGrad)"
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
          <defs>
            <linearGradient id="coralGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff5e6b" />
              <stop offset="100%" stopColor="#eb3845" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Percentage */}
        <span className="absolute text-[10px] sm:text-[11px] font-black tracking-tight text-ink tabular-nums">
          {percent}%
        </span>
      </div>
      {label && (
        <span className="mt-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
          {label}
        </span>
      )}
    </div>
  )
}

// 3D Mini Bar Chart (Matching telemetry in reference image)
function NeuMiniBarChart({ values = [30, 50, 40, 70, 60, 90, 100] }: { values?: number[] }) {
  return (
    <div className="neu-inset-sm flex h-8 sm:h-11 items-end justify-between gap-1 p-1.5 sm:p-2">
      {values.map((val, idx) => (
        <div key={idx} className="flex h-full flex-1 flex-col justify-end">
          <div
            className="w-full rounded-t-sm transition-all duration-500"
            style={{
              height: `${val}%`,
              background: 'linear-gradient(to top, #eb3845, #ff6b76)',
              boxShadow: '0 1px 3px rgba(235, 56, 69, 0.25)',
            }}
          />
        </div>
      ))}
    </div>
  )
}

export default function HomePage() {
  const [activeMascotIndex, setActiveMascotIndex] = useState(0)
  const [activeLeaderboardTab, setActiveLeaderboardTab] = useState<'XP' | 'STREAK' | 'LEVEL'>('XP')
  const [allTournaments, setAllTournaments] = useState<Tournament[]>([])
  const [dbTournaments, setDbTournaments] = useState<Tournament[]>([])
  const [rankings, setRankings] = useState<LeaderboardPlayer[]>([])
  const [guildSummary, setGuildSummary] = useState<{ guild: Guild | null; members: GuildMember[] }>({
    guild: null,
    members: [],
  })
  const [liveStats, setLiveStats] = useState([
    { value: '0', label: 'Registered players', chart: [15, 20, 25, 20, 30, 25, 35] },
    { value: '0', label: 'Tournaments hosted', chart: [15, 20, 25, 20, 30, 25, 35] },
    { value: '0', label: 'Guild members', chart: [15, 20, 25, 20, 30, 25, 35] },
    { value: '0', label: 'Arena visits', chart: [15, 20, 25, 20, 30, 25, 35] },
  ])
  const [tournamentSearch, setTournamentSearch] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ALL')

  useEffect(() => {
    trackPageVisit(false)
    async function loadData() {
      try {
        const [fetchedTournaments, dynamicCards, fetchedRankings, fetchedGuild] = await Promise.all([
          fetchTournaments(),
          fetchDynamicHomeStats(),
          fetchRankings(),
          fetchEliteArmyGuild(),
        ])

        setAllTournaments(fetchedTournaments || [])
        const upcomingOrActive = (fetchedTournaments || []).filter(
          (t) => t.status !== 'completed' && t.status !== 'cancelled'
        )
        setDbTournaments((upcomingOrActive.length > 0 ? upcomingOrActive : fetchedTournaments || []).slice(0, 3))
        setRankings(fetchedRankings || [])
        setGuildSummary(fetchedGuild || { guild: null, members: [] })

        const playersVal = dynamicCards?.[0]?.stat_number || '0'
        const tourneysVal = dynamicCards?.[1]?.stat_number || String((fetchedTournaments || []).length)
        const visitsVal = dynamicCards?.[2]?.stat_number || '0'
        const guildMemberCount = String(fetchedGuild?.members?.length || 0)

        setLiveStats([
          { value: playersVal, label: 'Registered players', chart: [25, 40, 35, 60, 55, 80, 95] },
          { value: tourneysVal, label: 'Tournaments hosted', chart: [20, 30, 45, 60, 50, 75, 85] },
          { value: guildMemberCount, label: 'Guild members', chart: [30, 45, 55, 65, 70, 80, 90] },
          { value: visitsVal, label: 'Arena visits', chart: [40, 55, 60, 75, 85, 90, 100] },
        ])
      } catch {
        // Keep clean empty defaults on error
      }
    }
    loadData()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveMascotIndex((prev) => (prev + 1) % mascotSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const handleNavCardClick = (card: (typeof navCards)[0]) => {
    if (card.action === 'dashboard') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open_player_dashboard'))
      }
    }
  }

  const currentTournaments = dbTournaments.map((tournament) => ({
    id: tournament.id,
    title: tournament.title,
    game_mode: tournament.game_mode || 'FREE FIRE • BATTLE ROYALE',
    map: tournament.map || 'BERMUDA',
    tournament_start: tournament.tournament_start,
    entry_status:
      tournament.status === 'registration_open'
        ? 'REGISTRATION OPEN'
        : tournament.status === 'completed'
        ? 'COMPLETED'
        : 'UPCOMING',
    prize_pool: tournament.prize_pool || 'TBD',
    slots_filled: tournament.slots_filled || 0,
    max_slots: tournament.max_slots || 48,
  }))

  const sortedTopPlayers = [...rankings]
    .sort((a, b) => {
      if (activeLeaderboardTab === 'XP') return (b.xp || 0) - (a.xp || 0)
      if (activeLeaderboardTab === 'STREAK') return (b.logins || 0) - (a.logins || 0)
      return (b.level || 0) - (a.level || 0)
    })
    .slice(0, 5)
    .map((p, idx) => ({
      rank: idx + 1,
      ign: p.name || 'Player',
      score:
        activeLeaderboardTab === 'XP'
          ? String(p.xp || 0)
          : activeLeaderboardTab === 'STREAK'
          ? String(p.logins || 0)
          : String(p.level || 1),
      label:
        activeLeaderboardTab === 'XP'
          ? 'XP'
          : activeLeaderboardTab === 'STREAK'
          ? 'days'
          : 'LVL',
      kd: p.tier || 'BRONZE',
    }))

  const recentWinners = allTournaments
    .filter((t) => t.status === 'completed' && t.top_3_teams && t.top_3_teams.length > 0)
    .slice(0, 4)
    .map((t) => {
      const winner = t.top_3_teams?.find((team) => team.rank === 1) || t.top_3_teams?.[0]
      return {
        place: '1ST',
        name: winner?.team_name || 'Champion Squad',
        tournament: t.title,
        date: t.tournament_start
          ? new Date(t.tournament_start).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              timeZone: 'UTC',
            })
          : 'Completed',
        points: winner?.prize || t.prize_pool || 'Champion',
      }
    })

  const guildMemberCount = guildSummary.members.length
  const guildMaxMembers = 50
  const guildCapacityPercent = Math.min(100, Math.round((guildMemberCount / guildMaxMembers) * 100))

  const activeSlide = mascotSlides[activeMascotIndex]

  const filteredTournaments = currentTournaments.filter((t) => {
    const matchesSearch =
      !tournamentSearch ||
      t.title.toLowerCase().includes(tournamentSearch.toLowerCase()) ||
      t.map.toLowerCase().includes(tournamentSearch.toLowerCase())
    const matchesFormat =
      selectedFormat === 'ALL' ||
      t.game_mode.toUpperCase().includes(selectedFormat)
    return matchesSearch && matchesFormat
  })

  return (
    <SitePage className="neu-theme">
      {/* ============================================================
          HERO SECTION — Soft Light 3D Battle Console (Optimized for Mobile)
          ============================================================ */}
      <section className="relative overflow-hidden pb-8 pt-20 sm:pb-14 sm:pt-28 lg:pb-16 lg:pt-32">
        <div className="site-container relative">
          <div className="grid items-center gap-8 sm:gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
            {/* Left Column: Brand & High-Octane Title */}
            <div className="min-w-0">
              {/* 3D Inset Kicker Pill */}
              <div className="inline-flex items-center gap-2">
                <div className="neu-inset-pill flex items-center gap-2 px-3 py-1 sm:px-3.5 sm:py-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-ink-muted">
                  <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(235,56,69,0.7)]" />
                  Karnataka&apos;s Official Esports Arena
                </div>
              </div>

              {/* Main Heading — Restored to Previous Style */}
              <h1 className="hero-main-heading mt-3.5 sm:mt-5">
                <span className="hero-title-elite block text-4xl xs:text-5xl sm:text-7xl lg:text-8xl font-black tracking-[-0.04em] text-neutral-900 drop-shadow-[0_4px_10px_rgba(0,0,0,0.12)]">
                  ELITE
                </span>
                <span className="hero-title-kannada font-kannada mt-1.5 sm:mt-2 block text-3xl xs:text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-brand drop-shadow-[0_4px_14px_rgba(235,56,69,0.32)]">
                  ಕನ್ನಡಿಗ
                </span>
              </h1>

              <p className="mt-4 sm:mt-6 max-w-xl text-sm sm:text-base lg:text-lg leading-relaxed text-ink-muted">
                Enter the premier Free Fire gaming hub in Karnataka. Compete in
                verified cash tournaments, climb state leaderboards, and
                represent the Elite Army squad.
              </p>

              {/* 3D Action Buttons (Red BUY pill + Soft Grey BUY pill from reference image) */}
              <div className="mt-6 sm:mt-8 flex flex-col xs:flex-row items-stretch xs:items-center gap-3 sm:gap-4">
                <Link href="/tournaments" className="neu-btn-crimson w-full xs:w-auto">
                  <span>Join Tournament</span>
                  <ArrowRight size={16} />
                </Link>

                <Link href="/live" className="neu-btn-dark w-full xs:w-auto">
                  <Play size={14} className="text-brand" />
                  <span>Watch Live</span>
                </Link>
              </div>

              {/* Tactile Feature Pills */}
              <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs">
                <span className="neu-badge !py-1 !px-2.5">
                  <Shield size={13} className="text-brand" />
                  Verified Results
                </span>
                <span className="neu-badge !py-1 !px-2.5">
                  <Users size={13} className="text-brand" />
                  Squad &amp; Solo
                </span>
                <span className="neu-badge !py-1 !px-2.5">
                  <Trophy size={13} className="text-brand" />
                  ₹10,000+ Prize Pools
                </span>
              </div>
            </div>

            {/* Right Column: 3D Console Frame (Inspired by top-right card of reference image) */}
            <div className="relative mx-auto w-full max-w-[440px] sm:max-w-[480px] lg:max-w-none">
              <div className="neu-raised-lg relative p-3.5 sm:p-5">
                {/* Media Screen Well */}
                <div className="neu-inset relative aspect-square overflow-hidden rounded-xl sm:rounded-2xl">
                  <img
                    key={activeSlide.image}
                    src={activeSlide.image}
                    alt={activeSlide.title}
                    className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
                    loading="eager"
                  />
                  {/* Subtle dark gradient for legibility over photos */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Top Badge with Hairline Red Accent */}
                  <div className="absolute left-3 top-3 sm:left-4 sm:top-4">
                    <span className="neu-badge-crimson !bg-white/95 !py-0.5 sm:!py-1 text-[10px] sm:text-[11px] shadow-md">
                      <Sparkles size={11} />
                      {activeSlide.badge}
                    </span>
                  </div>

                  {/* Slide Info & Controls */}
                  <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-5 text-white">
                    <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-rose-300">
                      {activeSlide.subtitle}
                    </p>
                    <h2 className="mt-0.5 sm:mt-1 text-base sm:text-xl lg:text-2xl font-black tracking-tight text-white drop-shadow">
                      {activeSlide.title}
                    </h2>

                    {/* Progress Track & Arrow Dials */}
                    <div className="mt-3 sm:mt-4 flex items-center justify-between gap-2.5">
                      {/* Recessed Pill Indicator Track */}
                      <div className="neu-inset-pill flex items-center gap-1.5 bg-black/40 px-2 py-1 sm:px-2.5 sm:py-1.5 backdrop-blur-sm">
                        {mascotSlides.map((slide, index) => (
                          <button
                            key={slide.id}
                            type="button"
                            onClick={() => setActiveMascotIndex(index)}
                            className={`h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                              activeMascotIndex === index
                                ? 'w-5 sm:w-6 bg-brand shadow-[0_0_8px_rgba(235,56,69,0.8)]'
                                : 'w-1.5 sm:w-2 bg-white/40 hover:bg-white/70'
                            }`}
                            aria-label={`Show ${slide.title}`}
                          />
                        ))}
                      </div>

                      {/* 3D Circular Previous & Next Buttons */}
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMascotIndex(
                              (prev) => (prev - 1 + mascotSlides.length) % mascotSlides.length
                            )
                          }
                          className="neu-circle h-8 w-8 sm:h-9 sm:w-9 text-ink"
                          aria-label="Previous slide"
                        >
                          <ChevronLeft size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMascotIndex((prev) => (prev + 1) % mascotSlides.length)
                          }
                          className="neu-circle h-8 w-8 sm:h-9 sm:w-9 text-ink"
                          aria-label="Next slide"
                        >
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub-chassis Dial & Telemetry Row */}
                <div className="mt-3 sm:mt-4 flex items-center justify-between gap-3 px-1 sm:px-2">
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <NeuCircularDial percent={activeSlide.progress} size={42} strokeWidth={4} />
                    <div>
                      <p className="text-[11px] sm:text-xs font-bold text-ink">Elite Activity Score</p>
                      <p className="text-[10px] sm:text-[11px] text-ink-subtle">Live Guild Sync</p>
                    </div>
                  </div>

                  <Link
                    href="/guilds"
                    className="neu-btn-dark !min-h-[2.15rem] sm:!min-h-[2.35rem] !px-3 sm:!px-3.5 text-[11px] sm:text-xs"
                  >
                    Guild Roster
                    <ArrowUpRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* ============================================================
              STATS BAR — 3D Telemetry Mixer Panel (Mobile-optimized)
              ============================================================ */}
          <div className="neu-raised mt-8 sm:mt-12 lg:mt-14 grid grid-cols-2 gap-2.5 sm:gap-4 p-3 sm:p-5 lg:grid-cols-4 lg:gap-5">
            {liveStats.map((stat, idx) => (
              <div
                key={stat.label}
                className="neu-inset-sm flex flex-col justify-between p-3 sm:p-4 transition-transform duration-200 hover:scale-[1.02]"
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div>
                    <span className="text-[9px] sm:text-[11px] font-bold uppercase tracking-[0.12em] text-ink-subtle">
                      Metric 0{idx + 1}
                    </span>
                    <p className="mt-0.5 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-ink">
                      {stat.value}
                    </p>
                  </div>
                  <span className="neu-circle h-6 w-6 sm:h-7 sm:w-7 text-brand shrink-0">
                    <Sparkles size={11} />
                  </span>
                </div>

                <div className="mt-2.5 sm:mt-3">
                  <NeuMiniBarChart values={stat.chart} />
                  <p className="mt-1.5 text-[10px] sm:text-xs font-semibold text-ink-muted truncate">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* ============================================================
              COMPACT WRAPPED NAVIGATION CARDS (Direct Access for Non-Tech Users)
              ============================================================ */}
          <div className="mt-8 sm:mt-12 lg:mt-14">
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="neu-badge-crimson !px-2.5 !py-1 text-[10px] sm:text-[11px]">
                  <Compass size={12} />
                  Quick Access • ನೇರ ಆಯ್ಕೆಗಳು
                </span>
                <span className="text-xs font-bold text-ink hidden sm:inline">
                  Direct navigation without top menu
                </span>
              </div>
              <span className="text-[10px] sm:text-xs font-semibold text-ink-subtle">
                1-Tap to Open
              </span>
            </div>

            {/* 2 columns on mobile, 3 on tablet, 6 on desktop — Wraps cleanly & tightly */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
              {navCards.map((card) => {
                const IconComponent = card.icon
                const isAction = !!card.action

                const cardContent = (
                  <div
                    className={`neu-nav-tile ${
                      card.isPrimary ? 'featured-tile' : ''
                    } group flex flex-col justify-between p-3 sm:p-3.5 h-full cursor-pointer`}
                  >
                    <div>
                      {/* Top row: Icon with crisp border + Status Badge */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          className={`grid h-9 w-9 sm:h-10 sm:w-10 place-items-center rounded-xl shrink-0 border ${
                            card.isPrimary
                              ? 'neu-circle-crimson border-rose-400 shadow-sm'
                              : 'neu-circle border-neutral-300/80 shadow-xs'
                          }`}
                        >
                          <IconComponent
                            size={18}
                            className={card.isPrimary ? 'text-white' : 'text-brand'}
                          />
                        </span>
                        {card.isLive ? (
                          <span className="neu-badge-crimson !px-2 !py-0.5 text-[9px] sm:text-[10px] shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-brand animate-ping" />
                            Live
                          </span>
                        ) : (
                          <span className="neu-badge !py-0.5 !px-2 text-[9px] sm:text-[10px] !border-neutral-300/80 text-ink-subtle group-hover:!border-brand/50 group-hover:text-brand transition-colors">
                            {card.actionText}
                          </span>
                        )}
                      </div>

                      {/* Middle: Titles */}
                      <div className="mt-2.5 sm:mt-3">
                        <p className="font-kannada text-[10px] sm:text-[11px] font-bold text-brand leading-none">
                          {card.kannadaTitle}
                        </p>
                        <h3 className="mt-1 text-xs sm:text-sm font-black text-ink leading-tight group-hover:text-brand transition-colors truncate">
                          {card.title}
                        </h3>
                      </div>
                    </div>

                    {/* Bottom: Crisp divider + tag & arrow */}
                    <div className="mt-2.5 pt-2 border-t border-black/[0.08] flex items-center justify-between gap-1 text-[10px] sm:text-[11px]">
                      <span className="font-semibold text-ink-subtle truncate">
                        {card.tag}
                      </span>
                      <ArrowRight
                        size={12}
                        className="text-brand group-hover:translate-x-0.5 transition-transform shrink-0"
                      />
                    </div>
                  </div>
                )

                if (isAction) {
                  return (
                    <button
                      key={card.title}
                      type="button"
                      onClick={() => handleNavCardClick(card)}
                      className="text-left w-full focus:outline-none"
                    >
                      {cardContent}
                    </button>
                  )
                }

                return (
                  <Link key={card.title} href={card.href!} className="focus:outline-none">
                    {cardContent}
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          LIVE BROADCAST — 3D Stream Console & Match Telemetry (Mobile-friendly)
          ============================================================ */}
      <section className="py-10 sm:py-16">
        <div className="site-container">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="neu-badge-crimson !py-0.5 text-[10px] sm:text-[11px]">
                  <Radio size={12} className="animate-pulse" />
                  Live Broadcast
                </span>
              </div>
              <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-ink">
                Featured Arena Match
              </h2>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-ink-muted">
                Follow live custom rooms, squad tournaments, and community scrims.
              </p>
            </div>

            <Link href="/live" className="neu-btn-dark !min-h-[2.35rem] sm:!min-h-[2.5rem] !px-3.5 sm:!px-4 text-xs w-fit">
              <span>Open Live Arena</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid gap-5 sm:gap-6 lg:grid-cols-[1.55fr_1fr]">
            {/* Stream Video Console */}
            <div className="neu-raised-lg group relative overflow-hidden p-3 sm:p-5">
              <div className="neu-inset relative aspect-video overflow-hidden rounded-xl sm:rounded-2xl">
                <img
                  src="/images/stream-preview.jpg"
                  alt="Free Fire live arena broadcast"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                {/* Badges Overlay */}
                <div className="absolute inset-x-3 top-3 sm:inset-x-4 sm:top-4 flex items-center justify-between">
                  <span className="neu-badge-crimson !bg-white/95 !py-0.5 sm:!py-1 text-[10px] sm:text-[11px] shadow-sm">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-ping" />
                    Official Cast
                  </span>
                  <span className="neu-badge !bg-white/90 !py-0.5 sm:!py-1 text-[10px] sm:text-[11px] shadow-sm text-neutral-800">
                    1,420 Watching
                  </span>
                </div>

                {/* Play Button & Title */}
                <div className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 flex items-end justify-between gap-3 sm:gap-4 text-white">
                  <div>
                    <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-[0.14em] text-rose-300">
                      Custom Room • Finals
                    </span>
                    <h3 className="mt-0.5 sm:mt-1 text-sm sm:text-lg lg:text-xl font-bold text-white drop-shadow">
                      Elite Guild War — Grand Finale
                    </h3>
                    <p className="text-[11px] sm:text-xs text-neutral-300">
                      Bermuda • Squad BR • Round 3
                    </p>
                  </div>

                  <Link
                    href="/live"
                    className="neu-circle-crimson h-10 w-10 sm:h-12 sm:w-12 shrink-0 shadow-[0_4px_16px_rgba(235,56,69,0.5)]"
                    aria-label="Watch stream"
                  >
                    <Play size={17} className="ml-0.5" fill="currentColor" />
                  </Link>
                </div>
              </div>

              {/* Stream Telemetry Strip */}
              <div className="mt-3 flex items-center justify-between px-1 sm:px-2 text-[11px] sm:text-xs text-ink-subtle">
                <span className="flex items-center gap-1.5 font-medium">
                  <Radio size={13} className="text-brand" />
                  Live Match Broadcast
                </span>
                <span className="neu-badge !py-0.5 text-[9px]">1080p 60fps</span>
              </div>
            </div>

            {/* Stream Match Telemetry Unit (Matching reference image dial style) */}
            <div className="neu-raised flex flex-col justify-between p-4 sm:p-6">
              <div>
                <div className="flex items-center justify-between border-b border-black/[0.08] pb-3">
                  <p className="text-xs font-bold uppercase tracking-[0.12em] text-ink">
                    Match Telemetry
                  </p>
                  <span className="neu-badge-crimson !py-0.5 text-[9px] sm:text-[10px]">Active</span>
                </div>

                {/* 3D Circular Progress Dials */}
                <div className="my-4 sm:my-5 flex items-center justify-around gap-3 rounded-xl p-1 sm:p-2">
                  <NeuCircularDial percent={78} size={66} strokeWidth={6} label="Game Time" />
                  <NeuCircularDial percent={69} size={66} strokeWidth={6} label="Alive Squads" />
                </div>

                {/* Tactile Data Rows */}
                <div className="space-y-2 text-xs">
                  {[
                    ['Channel', 'ELITE ಕನ್ನಡಿಗ'],
                    ['Game Mode', 'Free Fire Clash Squad'],
                    ['Current Prize', '₹10,000 Pool'],
                    ['Server', 'India / Karnataka'],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="neu-inset-sm flex items-center justify-between px-3 py-2 sm:px-3.5 sm:py-2.5 text-[11px] sm:text-xs"
                    >
                      <span className="text-ink-subtle">{label}</span>
                      <span className="font-bold text-ink">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/live" className="neu-btn-crimson mt-5 sm:mt-6 w-full !min-h-[2.65rem] text-xs">
                <span>Enter Live Arena</span>
                <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TOURNAMENTS SECTION — 3D Arena Cards & Tactile Filters
          ============================================================ */}
      <section className="py-10 sm:py-16">
        <div className="site-container">
          {/* Header */}
          <div className="mb-6 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2">
                <span className="neu-badge-crimson !py-0.5 text-[10px] sm:text-[11px]">
                  <Trophy size={12} />
                  Cash Tournaments
                </span>
              </div>
              <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-ink">
                Upcoming Battles
              </h2>
              <p className="mt-1 max-w-xl text-xs sm:text-sm text-ink-muted">
                Compete with Karnataka&apos;s best squads. Verified brackets &amp; direct UPI prizes.
              </p>
            </div>

            <Link href="/tournaments" className="neu-btn-dark !min-h-[2.35rem] sm:!min-h-[2.5rem] !px-3.5 sm:!px-4 text-xs w-fit">
              <span>View All Tournaments</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          {/* 3D Search & Segment Filter Bar */}
          <div className="neu-raised mb-6 sm:mb-8 flex flex-col gap-3 sm:gap-4 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
            {/* 3D Inset Pill Search Input */}
            <div className="relative w-full lg:max-w-md">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-subtle"
              />
              <input
                type="text"
                placeholder="Search tournament or map (Bermuda, Purgatory)..."
                value={tournamentSearch}
                onChange={(e) => setTournamentSearch(e.target.value)}
                className="neu-inset-pill w-full py-2 sm:py-2.5 pl-10 pr-4 text-xs text-ink placeholder:text-ink-subtle focus:outline-none"
              />
              {tournamentSearch && (
                <button
                  type="button"
                  onClick={() => setTournamentSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-subtle hover:text-ink"
                >
                  Clear
                </button>
              )}
            </div>

            {/* 3D Segmented Control Tabs */}
            <div className="neu-tabs overflow-x-auto no-scrollbar py-1">
              {['ALL', 'CLASH SQUAD', 'BATTLE ROYALE'].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSelectedFormat(mode)}
                  className={`neu-tab-btn whitespace-nowrap !px-3 !py-1 text-[11px] sm:text-xs ${
                    selectedFormat === mode ? 'active' : ''
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Tournament Cards Grid */}
          {filteredTournaments.length === 0 ? (
            <div className="neu-raised p-8 text-center">
              <Trophy size={28} className="mx-auto text-ink-subtle" />
              <p className="mt-3 text-sm font-bold text-ink">No tournaments scheduled yet</p>
              <p className="mt-1 text-xs text-ink-muted">
                Check back soon or ask an admin to publish an upcoming bracket.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredTournaments.map((tournament) => {
                const filledPercent =
                  tournament.max_slots > 0
                    ? Math.round((tournament.slots_filled / tournament.max_slots) * 100)
                    : 0

                return (
                  <article
                    key={tournament.id}
                    className="neu-raised neu-raised-hover flex flex-col justify-between p-4 sm:p-6"
                  >
                    <div>
                      {/* Card Top: Date & Status */}
                      <div className="flex items-center justify-between gap-2 border-b border-black/[0.08] pb-3">
                        <span className="flex items-center gap-1.5 text-xs text-ink-subtle font-medium" suppressHydrationWarning>
                          <Calendar size={13} className="text-brand" />
                          {tournament.tournament_start
                            ? new Date(tournament.tournament_start).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                timeZone: 'UTC',
                              })
                            : 'TBD'}
                        </span>
                        <span className="neu-badge-crimson !py-0.5 text-[10px]">
                          {tournament.entry_status}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="mt-3.5 line-clamp-2 text-sm sm:text-base lg:text-lg font-bold tracking-tight text-ink">
                        {tournament.title}
                      </h3>

                      {/* Mode & Map */}
                      <div className="mt-2.5 flex flex-wrap items-center gap-2.5 text-xs text-ink-muted">
                        <span className="flex items-center gap-1.5">
                          <Gamepad2 size={13} className="text-brand" />
                          {tournament.game_mode}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <MapPin size={13} className="text-brand" />
                          {tournament.map}
                        </span>
                      </div>

                      {/* 3D Telemetry Wells: Prize + Slot Dial */}
                      <div className="mt-4 grid grid-cols-2 gap-2.5">
                        <div className="neu-inset-sm flex flex-col justify-center p-2.5 sm:p-3">
                          <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                            Prize Pool
                          </span>
                          <p className="mt-0.5 text-xs sm:text-sm font-black text-ink">
                            {tournament.prize_pool}
                          </p>
                        </div>

                        <div className="neu-inset-sm flex items-center justify-between p-2.5 sm:p-3">
                          <div>
                            <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-ink-subtle">
                              Slots
                            </span>
                            <p className="mt-0.5 text-[11px] sm:text-xs font-bold text-ink">
                              {tournament.slots_filled}/{tournament.max_slots}
                            </p>
                          </div>
                          <NeuCircularDial percent={filledPercent} size={36} strokeWidth={3.5} />
                        </div>
                      </div>
                    </div>

                    {/* Card Bottom: Action */}
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-black/[0.08] pt-3.5">
                      <Link
                        href="/tournaments"
                        className="text-xs font-bold text-ink-subtle hover:text-ink transition-colors"
                      >
                        Rules
                      </Link>

                      <Link href="/tournaments" className="neu-btn-crimson !min-h-[2.35rem] !px-3.5 text-xs">
                        <span>Register</span>
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
      </section>

      {/* ============================================================
          TOP PLAYERS — 3D Telemetry Leaderboard (Mobile-friendly)
          ============================================================ */}
      <section className="py-10 sm:py-16">
        <div className="site-container">
          <div className="neu-raised p-4 sm:p-7">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="neu-badge-crimson !py-0.5 text-[10px] sm:text-[11px]">
                  <Flame size={12} />
                  State Hall of Fame
                </span>
                <h2 className="mt-2 sm:mt-3 text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-ink">
                  Top Ranked Competitors
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-ink-muted">
                  Current top fraggers, match winners, and K/D leaders across Karnataka.
                </p>
              </div>

              {/* 3D Segment Switcher */}
              <div className="neu-tabs py-1 w-fit">
                {(['XP', 'STREAK', 'LEVEL'] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveLeaderboardTab(tab)}
                    className={`neu-tab-btn !px-3 !py-1 text-[11px] sm:text-xs ${
                      activeLeaderboardTab === tab ? 'active' : ''
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            {/* Tactile Player Strip List */}
            <div className="mt-5 sm:mt-7 space-y-2.5">
              {sortedTopPlayers.length === 0 ? (
                <div className="neu-inset-sm p-6 text-center text-xs text-ink-muted">
                  No ranked players yet. Register and compete in tournaments to appear here.
                </div>
              ) : (
                sortedTopPlayers.map((player) => (
                  <div
                    key={`${player.rank}-${player.ign}`}
                    className="neu-inset-sm flex items-center justify-between gap-2.5 p-3 sm:px-4 transition-all duration-200 hover:scale-[1.01]"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
                      {/* Rank Badge */}
                      <span
                        className={`grid h-7 w-7 sm:h-8 sm:w-8 place-items-center rounded-full text-xs font-black shrink-0 ${
                          player.rank === 1
                            ? 'neu-circle-crimson'
                            : 'neu-circle text-ink-muted'
                        }`}
                      >
                        {player.rank}
                      </span>

                      {/* Avatar Well */}
                      <span className="neu-circle h-8 w-8 sm:h-9 sm:w-9 text-xs font-bold text-ink shrink-0">
                        {player.ign.slice(0, 2)}
                      </span>

                      {/* Name */}
                      <div className="min-w-0 truncate">
                        <p className="text-xs sm:text-sm font-bold text-ink truncate">{player.ign}</p>
                        <p className="text-[10px] text-ink-subtle truncate">Verified Elite Player</p>
                      </div>
                    </div>

                    {/* Equalizer Waveform & Score */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:block">
                        <AudioFrequencyWaveform active={player.rank <= 3} barCount={8} />
                      </div>

                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-black text-ink">
                          {player.score}{' '}
                          <span className="text-[10px] sm:text-xs font-semibold text-brand">
                            {player.label}
                          </span>
                        </p>
                        <p className="text-[10px] text-ink-subtle">{player.kd}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 sm:mt-6 flex justify-end">
              <Link href="/leaderboard" className="neu-btn-dark !min-h-[2.35rem] sm:!min-h-[2.5rem] !px-3.5 sm:!px-4 text-xs">
                <span>View Full Leaderboard</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURED GUILD & RECENT CHAMPIONS
          ============================================================ */}
      <section className="py-10 sm:py-16">
        <div className="site-container grid gap-6 sm:gap-8 lg:grid-cols-2">
          {/* Featured Guild Unit */}
          <div className="neu-raised flex flex-col justify-between p-4 sm:p-6 lg:p-7">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="neu-circle-crimson h-11 w-11 sm:h-13 sm:w-13 shrink-0">
                    <Shield size={20} />
                  </span>
                  <div>
                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand">
                      Official Unit
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-ink">ELITE ARMY GUILD</h3>
                  </div>
                </div>
                <span className="neu-badge-crimson !py-0.5 text-[10px]">Tier 1 Pro</span>
              </div>

              <p className="mt-4 text-xs sm:text-sm leading-relaxed text-ink-muted">
                The frontline competitive roster of ELITE ಕನ್ನಡಿಗ. Scrims, official state
                qualifiers, and clan tournaments across Karnataka.
              </p>

              {/* 3D Tactile Member Capacity Slider */}
              <div className="neu-inset-sm mt-5 p-3 sm:p-4">
                <div className="flex items-center justify-between text-xs font-bold text-ink">
                  <span>Guild Capacity</span>
                  <span className="text-brand">{guildMemberCount} / {guildMaxMembers} Members</span>
                </div>
                {/* Sunken track with raised coral-red knob */}
                <div className="neu-inset-pill relative mt-2.5 h-3 w-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#eb3845] to-[#ff5e6b] shadow-[0_1px_6px_rgba(235,56,69,0.4)]"
                    style={{ width: `${guildCapacityPercent}%` }}
                  />
                </div>
              </div>

              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-1.5 sm:gap-2 text-[11px] sm:text-xs">
                {['Free Fire Tier 1', 'Weekly Scrims', 'Official Roster', 'Verified'].map((tag) => (
                  <span key={tag} className="neu-badge !py-0.5 !px-2">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <Link href="/guilds" className="neu-btn-dark mt-6 w-full !min-h-[2.5rem] text-xs">
              <span>View Full Guild Roster &amp; Apply</span>
              <ArrowRight size={14} />
            </Link>
          </div>

          {/* Recent Champions Podium */}
          <div className="neu-raised flex flex-col justify-between p-4 sm:p-6 lg:p-7">
            <div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-brand">
                    Hall of Glory
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-ink">Recent Champions</h3>
                </div>
                <span className="neu-badge !py-0.5 text-[10px]">Verified</span>
              </div>

              {/* Champions Rows */}
              <div className="mt-4 space-y-2.5">
                {recentWinners.length === 0 ? (
                  <div className="neu-inset-sm p-6 text-center text-xs text-ink-muted">
                    No completed tournament champions recorded yet.
                  </div>
                ) : (
                  recentWinners.map((winner) => (
                    <div
                      key={`${winner.place}-${winner.name}-${winner.tournament}`}
                      className="neu-inset-sm flex items-center justify-between p-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`grid h-7 w-8 place-items-center rounded-lg text-xs font-black ${
                            winner.place === '1ST'
                              ? 'neu-circle-crimson'
                              : 'neu-circle text-ink-muted'
                          }`}
                        >
                          {winner.place}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-ink">{winner.name}</p>
                          <p className="text-[10px] sm:text-[11px] text-ink-subtle">{winner.tournament}</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="neu-badge-crimson !py-0.5 text-[9px] sm:text-[10px]">
                          {winner.points}
                        </span>
                        <p className="mt-0.5 text-[9px] sm:text-[10px] text-ink-subtle">{winner.date}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <Link href="/tournaments" className="neu-btn-crimson mt-6 w-full !min-h-[2.5rem] text-xs">
              <span>Past Tournament Results</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================
          BOTTOM ARENA CTA — 3D Raised Battle Deck
          ============================================================ */}
      <section className="py-12 sm:py-18">
        <div className="site-container">
          <div className="neu-raised-lg relative overflow-hidden p-6 sm:p-10 lg:p-14">
            <div className="relative flex flex-col items-start justify-between gap-6 sm:gap-8 md:flex-row md:items-center">
              <div className="max-w-xl">
                <span className="neu-badge-crimson !py-0.5 text-[10px] sm:text-[11px]">
                  <Sparkles size={12} />
                  Arena Registrations Open
                </span>

                <h2 className="mt-3 text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-ink">
                  Step Into The Arena.
                </h2>

                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-ink-muted">
                  Get your squad registered for the next weekend tournament. Real cash
                  rewards, live YouTube casting, and verified rankings await.
                </p>

                {/* Community Badge Accent */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand shadow-[0_0_8px_rgba(235,56,69,0.7)]" />
                  <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-ink-subtle">
                    Karnataka Official Esports Community
                  </span>
                </div>
              </div>

              {/* Call to action button */}
              <div className="w-full md:w-auto">
                <Link href="/tournaments" className="neu-btn-crimson w-full md:w-auto !min-h-[2.85rem] sm:!min-h-[3.25rem] !px-6 sm:!px-8 text-xs sm:text-sm">
                  <span>Enter Tournament</span>
                  <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SitePage>
  )
}
