'use client'

import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { Video, ChevronRight, Users, Radio, Play, Sparkles } from 'lucide-react'

const clips = [
  { title: '1V4 CLUTCH', player: 'ELITE_RAHUL', color: 'from-red-950 via-red-900 to-black', views: '14.2K' },
  { title: 'LAST BULLET', player: 'SHADOW_77', color: 'from-neutral-800 via-red-950 to-black', views: '9.8K' },
  { title: 'BOOYAH FINISH', player: 'KANNADA_KING', color: 'from-red-900 via-black to-neutral-950', views: '22.1K' },
]

export default function LivePage() {
  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8">
          <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-red-600" /> OFFICIAL LIVESTREAM ARENA
          </p>
          <h1 className="font-display text-3xl font-black uppercase text-white sm:text-5xl lg:text-6xl 2xl:text-7xl tracking-tight">
            LIVE BROADCAST & <span className="text-metallic">INTEL</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm 2xl:text-base">
            Watch live custom rooms, squad tournaments, and giveaways broadcasted live to the ELITE Kannada gaming community.
          </p>
        </div>

        {/* Live Arena Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] 2xl:grid-cols-[1.8fr_1fr]">
          <div className="stream-card relative min-h-[360px] sm:min-h-[440px] overflow-hidden border border-red-900/60 bg-gradient-to-br from-red-950 via-[#120607] to-black p-5 sm:p-8">
            <div className="relative flex h-full flex-col justify-between gap-6">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="live-pill">
                  <span /> LIVE NOW BROADCAST
                </span>
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-white/50">
                  1,248 WATCHING NOW
                </span>
              </div>

              <div>
                <Video className="mb-3 sm:mb-4 text-red-500" size={40} />
                <span className="text-[11px] sm:text-xs font-bold tracking-widest text-red-400">
                  FREE FIRE CUSTOM ROOM #104
                </span>
                <h2 className="font-display text-2xl sm:text-4xl 2xl:text-5xl font-black uppercase text-white mt-1">
                  ELITE GUILD WAR <span className="text-metallic">FINALS</span>
                </h2>
                <div className="mt-6 sm:mt-8 flex flex-wrap gap-3 sm:gap-4">
                  <button className="bg-white px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-black tracking-widest text-black transition hover:bg-red-600 hover:text-white">
                    WATCH LIVESTREAM <ChevronRight className="ml-1 inline" size={16} />
                  </button>
                  <button className="border border-white/20 bg-white/5 px-5 sm:px-6 py-3 sm:py-3.5 text-xs font-black tracking-widest text-white hover:border-red-600">
                    CHAT ROOM
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="angular-panel p-5 sm:p-7">
            <div className="mb-5 sm:mb-6 flex items-center justify-between">
              <p className="eyebrow">STREAM INTEL & STATS</p>
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#e10600]" />
            </div>

            <div className="space-y-4 sm:space-y-6">
              {[
                ['TOP VIEWER', 'NAYAKA_07'],
                ['CURRENT GIVEAWAY', '₹500 REDEEM CODE'],
                ['STREAM XP POOL', '8,420 XP'],
                ['MV PLAYER', 'ELITE_RAHUL'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/10 pb-3 sm:pb-4"
                >
                  <span className="text-[10px] sm:text-[11px] font-bold tracking-widest text-white/40">
                    {label}
                  </span>
                  <span className="font-display text-xs sm:text-sm font-bold text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-6 sm:mt-8 flex items-center gap-3 border border-amber-500/30 bg-amber-950/30 p-3 sm:p-4 text-xs font-bold text-amber-300">
              <Sparkles size={18} className="shrink-0" />
              <span>Watch 15 minutes of stream to unlock Stream XP badge!</span>
            </div>
          </div>
        </div>

        {/* Community Clips */}
        <div className="mt-14 sm:mt-20">
          <p className="eyebrow mb-2 sm:mb-3">COMMUNITY CLIPS</p>
          <h3 className="font-display text-2xl sm:text-3xl font-black uppercase text-white mb-6 sm:mb-8">
            RECENT HIGHLIGHTS
          </h3>
          <div className="grid gap-4 sm:gap-5 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4">
            {clips.map((c) => (
              <article
                key={c.title}
                className={`clip-card bg-gradient-to-br ${c.color} p-5 sm:p-6 border border-white/10 min-h-[170px] sm:min-h-[180px] flex flex-col justify-between`}
              >
                <div className="flex justify-between items-start">
                  <span className="status text-[10px]">{c.title}</span>
                  <Play className="fill-white text-white shrink-0" size={18} />
                </div>
                <div>
                  <p className="font-display text-lg sm:text-xl font-black text-white">{c.player}</p>
                  <p className="mt-1 text-[9px] sm:text-[10px] font-bold tracking-widest text-white/50">
                    {c.views} VIEWS / 840 LIKES
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
