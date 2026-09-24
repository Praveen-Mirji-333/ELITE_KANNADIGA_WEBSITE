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

      <div className="mx-auto max-w-[1440px] px-5 pt-32 pb-24 lg:px-10">
        {/* Page Header */}
        <div className="mb-12 border-b border-white/10 pb-8">
          <p className="eyebrow mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-red-600" /> OFFICIAL LIVESTREAM ARENA
          </p>
          <h1 className="font-display text-4xl font-black uppercase text-white sm:text-6xl">
            LIVE BROADCAST & <span className="text-metallic">INTEL</span>
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/60 sm:text-base">
            Watch live custom rooms, squad tournaments, and giveaways broadcasted live to the ELITE Kannada gaming community.
          </p>
        </div>

        {/* Live Arena Grid */}
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="stream-card relative min-h-[440px] overflow-hidden border border-red-900/60 bg-gradient-to-br from-red-950 via-[#120607] to-black p-8">
            <div className="relative flex h-full flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="live-pill">
                  <span /> LIVE NOW BROADCAST
                </span>
                <span className="text-xs font-bold tracking-widest text-white/50">
                  1,248 WATCHING NOW
                </span>
              </div>

              <div>
                <Video className="mb-4 text-red-500" size={48} />
                <span className="text-xs font-bold tracking-widest text-red-400">
                  FREE FIRE CUSTOM ROOM #104
                </span>
                <h2 className="font-display text-4xl font-black uppercase text-white sm:text-5xl">
                  ELITE GUILD WAR <span className="text-metallic">FINALS</span>
                </h2>
                <div className="mt-8 flex flex-wrap gap-4">
                  <button className="bg-white px-6 py-3.5 text-xs font-black tracking-widest text-black transition hover:bg-red-600 hover:text-white">
                    WATCH LIVESTREAM <ChevronRight className="ml-2 inline" size={16} />
                  </button>
                  <button className="border border-white/20 bg-white/5 px-6 py-3.5 text-xs font-black tracking-widest text-white hover:border-red-600">
                    CHAT ROOM
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="angular-panel p-7">
            <div className="mb-6 flex items-center justify-between">
              <p className="eyebrow">STREAM INTEL & STATS</p>
              <span className="h-2 w-2 rounded-full bg-red-500 shadow-[0_0_12px_#e10600]" />
            </div>

            <div className="space-y-6">
              {[
                ['TOP VIEWER', 'NAYAKA_07'],
                ['CURRENT GIVEAWAY', '₹500 REDEEM CODE'],
                ['STREAM XP POOL', '8,420 XP'],
                ['MV PLAYER', 'ELITE_RAHUL'],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="flex items-center justify-between border-b border-white/10 pb-4"
                >
                  <span className="text-[10px] font-bold tracking-widest text-white/40">
                    {label}
                  </span>
                  <span className="font-display text-sm font-bold text-white">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 border border-amber-500/30 bg-amber-950/30 p-4 text-xs font-bold text-amber-300">
              <Sparkles size={18} />
              <span>Watch 15 minutes of stream to unlock Stream XP badge!</span>
            </div>
          </div>
        </div>

        {/* Community Clips */}
        <div className="mt-20">
          <p className="eyebrow mb-3">COMMUNITY CLIPS</p>
          <h3 className="font-display text-3xl font-black uppercase text-white mb-8">
            RECENT HIGHLIGHTS
          </h3>
          <div className="grid gap-5 md:grid-cols-3">
            {clips.map((c) => (
              <article
                key={c.title}
                className={`clip-card bg-gradient-to-br ${c.color} p-6 border border-white/10 min-h-[180px] flex flex-col justify-between`}
              >
                <div className="flex justify-between items-start">
                  <span className="status">{c.title}</span>
                  <Play className="fill-white text-white" size={20} />
                </div>
                <div>
                  <p className="font-display text-xl font-black text-white">{c.player}</p>
                  <p className="mt-1 text-[10px] font-bold tracking-widest text-white/50">
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
