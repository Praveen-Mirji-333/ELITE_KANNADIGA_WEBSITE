'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Navbar } from '../components/Navbar'
import { Footer } from '../components/Footer'
import {
  ArrowUpRight,
  ChevronRight,
  Crosshair,
  Flame,
  HelpCircle,
  Play,
  Trophy,
  Users,
  Video,
} from 'lucide-react'
import {
  fetchTournaments,
  fetchRankings,
  fetchHomeCards,
  trackPageVisit,
} from '../lib/supabase'
import { HomeCard, Tournament } from '../lib/types'

const logoUrl = '/logo.png'

function SectionHeading({
  eyebrow,
  title,
  action,
  actionHref,
}: {
  eyebrow: string
  title: string
  action?: string
  actionHref?: string
}) {
  return (
    <div className="mb-8 flex items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2">{eyebrow}</p>
        <h2 className="font-display text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
          {title}
        </h2>
      </div>
      {action && actionHref && (
        <Link
          href={actionHref}
          className="hidden items-center gap-2 text-xs font-bold uppercase tracking-widest text-red-500 transition hover:text-white sm:flex"
        >
          {action} <ArrowUpRight size={15} />
        </Link>
      )}
    </div>
  )
}

const SHOW_LIVE_SECTION = false // Set to true to show Live section & watch live button again

export default function Page() {
  const [tournamentsList, setTournamentsList] = useState<Tournament[]>([])
  const [rankingsList, setRankingsList] = useState<any[]>([])
  const [homeCards, setHomeCards] = useState<HomeCard[]>([])

  useEffect(() => {
    async function loadData() {
      await trackPageVisit(false)

      const fetchedT = await fetchTournaments()
      setTournamentsList(fetchedT || [])

      const fetchedR = await fetchRankings()
      setRankingsList(fetchedR || [])

      const cards = await fetchHomeCards()
      setHomeCards(cards || [])
    }
    loadData()
  }, [])

  return (
    <main className="min-h-screen overflow-hidden bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />

      {/* Shared Route Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="hero relative flex min-h-[auto] lg:min-h-[740px] 2xl:min-h-[860px] 3xl:min-h-[960px] items-center pt-20 sm:pt-24 lg:pt-28 pb-12 sm:pb-16 lg:pb-20 overflow-hidden">
        <div className="hero-grid absolute inset-0" />
        <div className="hero-glow absolute right-[5%] top-[18%] h-[320px] sm:h-[520px] 2xl:h-[700px] w-[320px] sm:w-[520px] 2xl:w-[700px] rounded-full bg-red-950/40 blur-[100px] sm:blur-[140px] pointer-events-none" />
        <div className="relative z-10 site-container grid items-center gap-8 sm:gap-12 lg:grid-cols-[1.1fr_.9fr] 2xl:gap-16">
          <div className="max-w-2xl 2xl:max-w-3xl">
            <p className="eyebrow mb-4 sm:mb-5 flex items-center gap-3">
              <span className="h-px w-6 sm:w-8 bg-red-600" /> THE OFFICIAL GAMING COMMUNITY
            </p>
            <h1 className="font-display text-[clamp(2.75rem,8vw,5.5rem)] lg:text-[clamp(4.5rem,6.5vw,7.5rem)] 2xl:text-[8.5rem] 3xl:text-[10rem] font-black uppercase leading-[0.88] tracking-[-0.04em] text-white">
              ELITE<span className="block text-metallic">ಕನ್ನಡಿಗ</span>
            </h1>
            <p className="mt-5 sm:mt-8 max-w-lg 2xl:max-w-2xl text-sm leading-6 sm:text-base sm:leading-7 2xl:text-xl text-white/60">
              Join the ELITE community, compete in CS & BR tournaments, climb the leaderboards, unlock achievements and dominate the arena.
            </p>
            <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-3 2xl:gap-4">
              <Link
                href="/tournaments"
                className="cut-button bg-red-600 px-5 py-3 sm:px-6 sm:py-4 2xl:px-8 2xl:py-5 text-xs sm:text-sm 2xl:text-base font-black tracking-[.18em] text-white transition hover:bg-red-500 shadow-lg"
              >
                ENTER TOURNAMENTS <ArrowUpRight className="ml-2 sm:ml-3 inline" size={16} />
              </Link>
              {SHOW_LIVE_SECTION && (
                <Link
                  href="/live"
                  className="cut-button border border-white/20 bg-white/5 px-5 py-3 sm:px-6 sm:py-4 2xl:px-8 2xl:py-5 text-xs sm:text-sm 2xl:text-base font-black tracking-[.18em] text-white transition hover:border-red-600"
                >
                  <Play className="mr-2 inline fill-current text-red-500" size={14} /> WATCH LIVE
                </Link>
              )}
            </div>

            {/* Real Dynamic Hero Stats Cards */}
            {homeCards.length > 0 && (
              <div className="mt-8 sm:mt-12 grid grid-cols-3 gap-2 sm:gap-6 border-t border-white/10 pt-5 sm:pt-7 max-w-xl 2xl:max-w-2xl">
                {homeCards.map((c) => (
                  <div key={c.id} className="min-w-0">
                    <p className="font-display text-xl sm:text-2xl 2xl:text-3xl font-black text-white truncate">
                      {c.stat_number || c.title}
                    </p>
                    <p className="mt-1 text-[8px] sm:text-[9px] 2xl:text-xs font-bold tracking-[.14em] text-white/40 truncate">
                      {c.stat_label || c.subtitle}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="relative flex justify-center lg:justify-end my-4 lg:my-0">
            <div className="orbit-ring" />
            <img
              src={logoUrl}
              alt="ELITE Kannada emblem"
              className="hero-logo relative z-10 w-[min(72vw,320px)] sm:w-[420px] lg:w-[480px] 2xl:w-[640px] 3xl:w-[760px] object-contain"
            />
            <div className="absolute -bottom-3 sm:bottom-6 2xl:bottom-10 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap border border-red-700/60 bg-black/85 px-3 py-1.5 sm:px-4 sm:py-2 text-[9px] sm:text-[10px] 2xl:text-xs font-bold tracking-[.25em] text-red-400 backdrop-blur">
              PLAY. COMPETE. DOMINATE.
            </div>
          </div>
        </div>
      </section>

      {/* Live Arena Preview */}
      {SHOW_LIVE_SECTION && (
        <section className="site-container py-16 sm:py-24">
          <SectionHeading
            eyebrow="LIVE ARENA / 01"
            title="The battle is live"
            action="View Live Arena"
            actionHref="/live"
          />
          <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
            <div className="stream-card relative min-h-[390px] overflow-hidden border border-red-900/60 bg-gradient-to-br from-red-950 via-[#120607] to-black p-6">
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="live-pill">
                    <span /> LIVE NOW
                  </span>
                  <span className="text-xs font-bold tracking-widest text-white/45">
                    1,248 WATCHING
                  </span>
                </div>
                <div>
                  <Video className="mb-4 text-red-500" size={38} />
                  <h3 className="font-display text-4xl font-black uppercase">
                    Free Fire
                    <br />
                    <span className="text-metallic">Custom Room</span>
                  </h3>
                  <Link
                    href="/live"
                    className="mt-6 inline-block bg-white px-5 py-3 text-xs font-black tracking-widest text-black transition hover:bg-red-500 hover:text-white"
                  >
                    WATCH LIVE BROADCAST <ChevronRight className="ml-2 inline" size={14} />
                  </Link>
                </div>
              </div>
            </div>
            <div className="angular-panel p-6">
              <div className="mb-6 flex items-center justify-between">
                <p className="eyebrow">STREAM INTEL</p>
                <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#e10600]" />
              </div>
              <div className="space-y-5">
                {[
                  ['TOP VIEWER', 'NAYAKA_07'],
                  ['CURRENT GIVEAWAY', '₹500 CASH'],
                  ['STREAM XP', '8,420 XP'],
                  ['TOP PLAYER', 'ELITE_RAHUL'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between border-b border-white/10 pb-4">
                    <span className="text-[10px] font-bold tracking-widest text-white/40">{label}</span>
                    <span className="font-display text-sm font-bold text-white">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-7 flex items-center gap-3 text-xs font-bold text-white/45">
                <Users size={16} className="text-red-500" /> CHAT IS MOVING FAST
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Tournaments Preview */}
      <section className="border-y border-white/5 bg-[#0b0b0d] py-16 sm:py-24 2xl:py-32">
        <div className="site-container">
          <SectionHeading
            eyebrow="TOURNAMENT ARENA / 02"
            title="Enter the battlefield"
            action="View all tournaments"
            actionHref="/tournaments"
          />

          {tournamentsList.length === 0 ? (
            <div className="border border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
              No tournaments announced yet. Admin will publish new tournaments soon!
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4">
              {tournamentsList.map((t) => (
                <article key={t.id || t.title} className="tournament-card red-edge flex flex-col justify-between">
                  <div>
                    <div className="mb-5 sm:mb-7 flex items-start justify-between">
                      <div>
                        <span className="status">{t.status.replace('_', ' ')}</span>
                        <h3 className="mt-3 sm:mt-4 font-display text-xl sm:text-2xl 2xl:text-3xl font-black text-white">
                          {t.title}
                        </h3>
                        <p className="mt-1 text-[10px] 2xl:text-xs font-bold tracking-[.2em] text-white/35">
                          {t.game_mode}
                        </p>
                      </div>
                      <Crosshair className="text-red-600 shrink-0" size={24} />
                    </div>
                    <div className="mb-5 sm:mb-7 grid grid-cols-2 gap-3 sm:gap-5 border-y border-white/10 py-4 sm:py-5">
                      <div>
                        <p className="label">PRIZE POOL / OFFERS</p>
                        <p className="font-display mt-1 text-lg sm:text-2xl 2xl:text-3xl font-black text-red-500">
                          {t.prize_pool}
                        </p>
                      </div>
                      <div>
                        <p className="label">SLOTS LIMIT</p>
                        <p className="font-display mt-1 text-lg sm:text-2xl 2xl:text-3xl font-black text-white">
                          MAX {t.max_slots}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <div>
                      <p className="font-display text-base sm:text-lg 2xl:text-xl font-bold">
                        {new Date(t.tournament_start).toLocaleDateString()}
                      </p>
                      <p className="mt-0.5 text-[9px] sm:text-[10px] 2xl:text-xs font-bold tracking-widest text-white/40">
                        {t.map || 'BERMUDA'} / {t.game_mode}
                      </p>
                    </div>
                    <Link
                      href="/tournaments"
                      className="border border-red-700 px-3 py-2 text-[10px] 2xl:text-xs font-black tracking-widest text-red-500 transition hover:bg-red-600 hover:text-white"
                    >
                      REGISTER <ChevronRight className="ml-1 inline" size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Shared Route Footer */}
      <Footer />
    </main>
  )
}
