'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { Shield, Trophy, Users, Award, ChevronRight } from 'lucide-react'
import { fetchEliteArmyGuild, fetchSiteSetting } from '../../lib/supabase'
import { UserAvatar } from '../../components/ui/UserAvatar'

export default function GuildsPage() {
  const [guildInfo, setGuildInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showGuildSection, setShowGuildSection] = useState(true)

  useEffect(() => {
    async function load() {
      const isVisible = await fetchSiteSetting('show_guild_section', 'true')
      setShowGuildSection(isVisible)
      if (isVisible) {
        const data = await fetchEliteArmyGuild()
        setGuildInfo(data)
      }
      setLoading(false)
    }
    load()

    const handleUpdate = () => {
      load()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_updated', handleUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_updated', handleUpdate)
      }
    }
  }, [])

  if (!loading && !showGuildSection) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
        <div className="noise" />
        <Navbar />
        <div className="mx-auto max-w-[1440px] px-5 pt-40 pb-24 lg:px-10 flex flex-col items-center justify-center text-center">
          <div className="angular-panel border border-red-900/60 bg-gradient-to-b from-red-950/40 to-black p-12 max-w-xl w-full">
            <Shield className="mx-auto text-red-500 mb-4" size={56} />
            <h1 className="font-display text-3xl font-black uppercase text-white mb-2">
              GUILD SECTION OFFLINE
            </h1>
            <p className="text-sm text-white/60 mb-6">
              The Guild section is currently hidden by the site administrator. Please check back later.
            </p>
            <a
              href="/"
              className="inline-block cut-button bg-red-600 px-6 py-3 text-xs font-black tracking-widest text-white transition hover:bg-red-500"
            >
              RETURN TO HOME
            </a>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-red-600" /> OFFICIAL COMPETITIVE GUILD
            </p>
            <h1 className="font-display text-3xl font-black uppercase text-white sm:text-5xl lg:text-6xl 2xl:text-7xl tracking-tight">
              ELITE <span className="text-metallic">ARMY</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm 2xl:text-base">
              The single official competitive Free Fire squad of ELITE Kannada. Player rankings within the guild are dynamically calculated based on individual glory contributions.
            </p>
          </div>
        </div>

        {/* Guild Banner & Stats */}
        <div className="angular-panel border border-red-900/60 bg-gradient-to-r from-red-950/60 via-[#120607] to-black p-5 sm:p-8 mb-8 sm:mb-12 relative overflow-hidden">
          <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="h-16 w-16 sm:h-20 sm:w-20 rounded border-2 border-red-600 bg-black flex items-center justify-center text-red-500 shadow-xl shrink-0">
                <Shield size={36} className="sm:w-11 sm:h-11" />
              </div>
              <div>
                <span className="border border-red-600/40 bg-red-950/60 px-2.5 sm:px-3 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest text-red-400 uppercase">
                  OFFICIAL SQUAD
                </span>
                <h2 className="font-display text-2xl sm:text-3xl font-black text-white mt-1">
                  {guildInfo?.guild?.name || 'ELITE ARMY'}
                </h2>
                <p className="text-xs text-white/60 mt-0.5 max-w-md">
                  {guildInfo?.guild?.description || 'The Official Premier Guild of ELITE Kannada'}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right border-t sm:border-t-0 border-white/10 pt-4 sm:pt-0 w-full sm:w-auto">
              <p className="label text-[10px] sm:text-xs">TOTAL GUILD GLORY</p>
              <p className="font-display text-2xl sm:text-3xl font-black text-red-500 mt-0.5 sm:mt-1">
                {guildInfo?.guild?.glory_points?.toLocaleString() || '250,000'} GP
              </p>
            </div>
          </div>
        </div>

        {/* Player Roster Ranked by Glory */}
        <div>
          <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
            <div>
              <p className="eyebrow">ELITE ARMY ROSTER</p>
              <h3 className="font-display text-xl sm:text-2xl font-black text-white">
                GLORY-BASED PLAYER RANKINGS
              </h3>
            </div>
            <span className="text-[11px] sm:text-xs font-bold text-white/40 shrink-0">
              {guildInfo?.members?.length || 4} MEMBERS ACTIVE
            </span>
          </div>

          <div className="divide-y divide-white/10 border border-white/10 bg-white/5">
            {guildInfo?.members?.map((m: any, index: number) => (
              <div
                key={m.id || index}
                className="p-3.5 sm:p-5 flex items-center justify-between gap-3 transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                  <span
                    className={`font-display text-lg sm:text-2xl font-black w-6 sm:w-8 shrink-0 ${
                      index === 0
                        ? 'text-red-500'
                        : index === 1
                        ? 'text-amber-400'
                        : index === 2
                        ? 'text-slate-300'
                        : 'text-white/40'
                    }`}
                  >
                    #{index + 1}
                  </span>

                  <div className="shrink-0">
                    <UserAvatar
                      src={m.profiles?.avatar_url}
                      name={m.profiles?.ign || m.player_name}
                      size="md"
                      className="border border-white/20 h-9 w-9 sm:h-11 sm:w-11"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <h4 className="font-display text-sm sm:text-lg font-black text-white truncate">
                        {m.profiles?.ign || 'ELITE PLAYER'}
                      </h4>
                      <span className="border border-white/10 bg-white/5 px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] font-bold text-white/50 uppercase">
                        {m.guild_role}
                      </span>
                    </div>
                    <p className="text-[9px] sm:text-[10px] font-bold text-white/40 truncate mt-0.5">
                      ID: {m.profiles?.player_id || 'ELITE-1000'} • LEVEL {m.profiles?.level || 1}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="font-display text-sm sm:text-lg font-black text-red-500">
                    {m.glory_contributed?.toLocaleString()} GP
                  </p>
                  <p className="text-[9px] sm:text-[10px] font-bold text-white/40 hidden sm:block">CONTRIBUTED GLORY</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
