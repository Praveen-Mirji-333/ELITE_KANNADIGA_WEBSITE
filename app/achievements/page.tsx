'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { Shield, Sparkles } from 'lucide-react'
import { fetchAchievements } from '../../lib/supabase'
import { Achievement } from '../../lib/types'
import { UserAvatar } from '../../components/ui/UserAvatar'

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])

  useEffect(() => {
    async function load() {
      const data = await fetchAchievements()
      setAchievements(data)
    }
    load()
  }, [])

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8">
          <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-red-600" /> HALL OF FAME
          </p>
          <h1 className="font-display text-3xl font-black uppercase text-white sm:text-5xl lg:text-6xl 2xl:text-7xl tracking-tight">
            LEGACY <span className="text-metallic">ACHIEVEMENTS</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm 2xl:text-base">
            Unlock dynamic achievement cards by playing tournaments, maintaining login streaks, and participating in live QnA quizzes.
          </p>
        </div>

        {/* Achievements Grid */}
        <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5">
          {achievements.map((a) => (
            <div
              key={a.id}
              className="achievement unlocked p-5 sm:p-7 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="badge-icon">
                    {a.icon_url ? (
                      <img src={a.icon_url} alt={a.name} className="h-7 w-7 sm:h-8 sm:w-8 object-contain" />
                    ) : (
                      <Shield size={24} />
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-black tracking-widest px-2.5 py-1 border ${
                      a.rarity === 'LEGENDARY'
                        ? 'border-amber-500/40 bg-amber-950/40 text-amber-400'
                        : a.rarity === 'EPIC'
                        ? 'border-purple-500/40 bg-purple-950/40 text-purple-400'
                        : 'border-red-500/40 bg-red-950/40 text-red-400'
                    }`}
                  >
                    {a.rarity}
                  </span>
                </div>

                <h3 className="mt-6 sm:mt-8 font-display text-lg sm:text-xl font-black text-white">
                  {a.name}
                </h3>

                {(a.player_name || a.player_uid) && (
                  <div className="mt-3 rounded border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-xs flex items-center gap-3">
                    <UserAvatar
                      src={a.avatar_url}
                      name={a.player_name}
                      size="sm"
                      className="h-9 w-9 sm:h-10 sm:w-10 border-2 border-amber-500/60 shadow-md shadow-amber-950/60 shrink-0"
                    />
                    <div className="min-w-0">
                      {a.player_name && (
                        <p className="font-bold text-amber-300 truncate text-xs">
                          PLAYER: <span className="text-white">{a.player_name}</span>
                        </p>
                      )}
                      {a.player_uid && (
                        <p className="font-mono text-[10px] text-amber-400/90 mt-0.5 truncate">
                          FF UID: {a.player_uid}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <p className="mt-2 text-[10px] sm:text-[11px] font-bold tracking-widest text-white/40">
                  {a.description}
                </p>
              </div>

              <div className="mt-6 sm:mt-8 border-t border-white/10 pt-3.5 sm:pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles size={14} /> +{a.xp_reward} XP
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold tracking-widest uppercase text-white/50">
                  ACTIVE BADGE
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Footer />
    </main>
  )
}
