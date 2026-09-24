'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { TournamentRegisterModal } from '../../components/tournaments/TournamentRegisterModal'
import {
  Crosshair,
  ChevronRight,
  Search,
  Trophy,
  CheckCircle2,
  Award,
  Calendar,
  Clock,
  FileText,
  X,
  Users,
} from 'lucide-react'
import { fetchTournaments, fetchTournamentRegistrationsForAdmin, fetchAvatarMap } from '../../lib/supabase'
import { Tournament, TournamentRegistration } from '../../lib/types'
import { UserAvatar } from '../../components/ui/UserAvatar'

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filterType, setFilterType] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map())

  // Modal State
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null)

  // Rules Modal State
  const [rulesTournament, setRulesTournament] = useState<Tournament | null>(null)

  // Selected Results State
  const [resultsTournament, setResultsTournament] = useState<Tournament | null>(null)
  const [resultsList, setResultsList] = useState<TournamentRegistration[]>([])

  // View Results Modal State for Finished Tournaments
  const [viewResultsModalTourney, setViewResultsModalTourney] = useState<Tournament | null>(null)
  const [viewResultsRegs, setViewResultsRegs] = useState<TournamentRegistration[]>([])
  const [resultsSearchQuery, setResultsSearchQuery] = useState('')

  useEffect(() => {
    async function load() {
      const [data, avMap] = await Promise.all([
        fetchTournaments(),
        fetchAvatarMap(),
      ])
      setTournaments(data)
      setAvatarMap(avMap)
      if (data.length > 0) {
        loadResults(data[0])
      }
    }
    load()
  }, [])

  async function loadResults(t: Tournament) {
    setResultsTournament(t)
    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    const verified = regs.filter((r) => r.result_verified || r.placement)
    verified.sort((a, b) => (a.placement || 99) - (b.placement || 99))
    setResultsList(verified)
  }

  async function handleOpenResultsModal(t: Tournament) {
    setViewResultsModalTourney(t)
    setResultsSearchQuery('')
    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    regs.sort((a, b) => (a.placement || 99) - (b.placement || 99))
    setViewResultsRegs(regs)
  }

  const handleRegisterClick = (t: Tournament) => {
    setSelectedTournament(t)
    setRegisterModalOpen(true)
  }

  const filteredTournaments = tournaments.filter((t) => {
    const matchesFilter =
      filterType === 'ALL' ||
      t.game_mode?.toUpperCase().includes(filterType) ||
      t.tournament_type?.toUpperCase().includes(filterType)
    const matchesSearch =
      !searchQuery ||
      t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.game_mode?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesFilter && matchesSearch
  })

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8">
          <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
            <span className="h-px w-6 sm:w-8 bg-red-600" /> ARENA TOURNAMENTS
          </p>
          <h1 className="font-display text-3xl sm:text-5xl 2xl:text-6xl font-black uppercase text-white">
            BATTLEFIELD <span className="text-metallic">TOURNAMENTS</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-xl 2xl:max-w-2xl text-xs sm:text-sm 2xl:text-base leading-relaxed text-white/60">
            Compete in Karnataka&apos;s most prestigious Free Fire tournaments. CS & BR Squad Battles with no duplicate UIDs, live dates, rulebooks, and verified standings.
          </p>
        </div>

        {/* Search & Filters Bar */}
        <div className="mb-8 sm:mb-10 flex flex-col items-stretch justify-between gap-4 md:flex-row md:items-center">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {['ALL', 'CS SQUAD BATTLE', 'BR SQUAD BATTLE', 'BR SOLO', 'GUILD'].map((tab) => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3.5 py-2 sm:px-4 sm:py-2.5 text-[11px] sm:text-xs font-black tracking-widest whitespace-nowrap transition shrink-0 ${
                  filterType === tab
                    ? 'bg-red-600 text-white shadow-md'
                    : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="relative w-full md:max-w-xs shrink-0">
            <Search className="absolute left-3.5 top-3 text-white/40" size={16} />
            <input
              type="text"
              placeholder="SEARCH TOURNAMENTS..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-white/15 bg-white/5 py-2.5 pl-10 pr-4 text-xs text-white placeholder-white/40 focus:border-red-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Tournaments Grid */}
        {filteredTournaments.length === 0 ? (
          <div className="border border-white/10 bg-white/5 p-12 text-center text-sm text-white/40">
            No tournaments announced yet. Admin will publish new CS & BR tournaments soon!
          </div>
        ) : (
          <div className="grid gap-5 sm:gap-6 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3 3xl:grid-cols-4">
            {filteredTournaments.map((t) => (
              <article
                key={t.id}
                className="tournament-card red-edge flex flex-col justify-between"
              >
                <div>
                  <div className="mb-5 sm:mb-6 flex items-start justify-between">
                    <div>
                      <span className="status">{t.status.replace('_', ' ')}</span>
                      <h3 className="mt-2.5 sm:mt-3 font-display text-xl sm:text-2xl 2xl:text-3xl font-black text-white">
                        {t.title}
                      </h3>
                      <p className="mt-1 text-[10px] 2xl:text-xs font-bold tracking-[.2em] text-red-400 uppercase">
                        {t.game_mode}
                      </p>
                    </div>
                    <Crosshair className="text-red-600 shrink-0" size={24} />
                  </div>

                  {/* Prize & Registered Slots */}
                  <div className="mb-4 sm:mb-5 grid grid-cols-2 gap-3 sm:gap-4 border-y border-white/10 py-3 sm:py-4">
                    <div>
                      <p className="label">PRIZE POOL / OFFERS</p>
                      <p className="font-display mt-1 text-lg sm:text-xl 2xl:text-2xl font-black text-red-500">
                        {t.prize_pool}
                      </p>
                    </div>
                    <div>
                      <p className="label">SLOTS REGISTERED</p>
                      <p className="font-display mt-1 text-lg sm:text-xl 2xl:text-2xl font-black text-white">
                        {t.slots_filled || 0} / {t.max_slots}
                      </p>
                    </div>
                  </div>

                  {/* Schedule Dates & Times */}
                  <div className="mb-4 sm:mb-5 space-y-2 text-xs bg-white/5 p-2.5 sm:p-3 border border-white/10">
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 text-amber-400">
                      <span className="flex items-center gap-1 font-bold text-[9px] sm:text-[10px]">
                        <Clock size={12} /> REGISTRATION CLOSES:
                      </span>
                      <span className="font-bold text-[10px] sm:text-[11px]">
                        {t.registration_end ? new Date(t.registration_end).toLocaleString() : 'OPEN UNTIL FULL'}
                      </span>
                    </div>
                    <div className="flex flex-col xs:flex-row xs:items-center justify-between gap-0.5 text-white/80">
                      <span className="flex items-center gap-1 font-bold text-[9px] sm:text-[10px]">
                        <Calendar size={12} /> TOURNAMENT STARTS:
                      </span>
                      <span className="font-bold text-[10px] sm:text-[11px]">
                        {new Date(t.tournament_start).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between border-t border-white/10 pt-3 gap-2">
                  {/* See Rules Button */}
                  <button
                    onClick={() => setRulesTournament(t)}
                    className="flex items-center gap-1.5 text-[10px] 2xl:text-xs font-black tracking-widest text-amber-400 hover:text-white"
                  >
                    <FileText size={14} /> SEE RULES
                  </button>

                  <div className="flex items-center gap-2">
                    {(t.status === 'completed' || (t.top_3_teams && t.top_3_teams.length > 0)) && (
                      <button
                        onClick={() => handleOpenResultsModal(t)}
                        className="flex items-center gap-1 border border-amber-500 bg-amber-950/60 px-2.5 py-1.5 sm:px-3 sm:py-2 text-[10px] 2xl:text-xs font-black tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black shadow-lg"
                      >
                        <Trophy size={13} /> VIEW RESULTS
                      </button>
                    )}

                    {t.status !== 'completed' && (
                      <button
                        onClick={() => handleRegisterClick(t)}
                        className="border border-red-700 bg-red-950/40 px-3 py-1.5 sm:px-3.5 sm:py-2 text-[10px] 2xl:text-xs font-black tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white"
                      >
                        REGISTER <ChevronRight className="ml-1 inline" size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Live Published Match Standings & Results */}
        <div className="mt-20 border-t border-white/10 pt-16">
          <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="eyebrow mb-2">VERIFIED STANDINGS & BRACKETS</p>
              <h2 className="font-display text-3xl font-black uppercase text-white">
                PUBLISHED MATCH RESULTS
              </h2>
            </div>
            {tournaments.length > 0 && (
              <select
                value={resultsTournament?.id}
                onChange={(e) => {
                  const found = tournaments.find((t) => t.id === e.target.value)
                  if (found) loadResults(found)
                }}
                className="border border-white/15 bg-[#120607] px-4 py-2 text-xs font-bold text-white"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {resultsList.length === 0 ? (
            <div className="border border-white/10 p-12 text-center text-sm text-white/40">
              No match results published yet for this tournament. Admin will publish verified scores after match completion.
            </div>
          ) : (
            <div className="divide-y divide-white/10 border border-white/10 bg-white/5">
              {resultsList.map((res, i) => (
                <div key={res.id} className="p-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="font-display text-2xl font-black text-red-500">
                      #{res.placement || i + 1}
                    </span>
                    <UserAvatar
                      src={avatarMap.get((res.captain_free_fire_uid || '').trim().toLowerCase()) || avatarMap.get((res.captain_name || '').trim().toLowerCase())}
                      name={res.captain_name}
                      size="md"
                      className="border border-red-600/50"
                    />
                    <div>
                      <h4 className="font-display text-lg font-black text-white">
                        {res.team_name || res.captain_name || 'REGISTERED SQUAD'}
                      </h4>
                      <p className="text-xs text-white/50">Captain: {res.captain_name}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-display text-lg font-bold text-red-500">
                      {res.kills} KILLS
                    </span>
                    <p className="text-[10px] font-bold text-emerald-400">VERIFIED RESULT</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      {/* Registration Modal */}
      <TournamentRegisterModal
        isOpen={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        tournament={selectedTournament}
        onSuccess={() => {
          if (selectedTournament) loadResults(selectedTournament)
        }}
      />

      {/* Rules Modal Overlay */}
      {rulesTournament && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
          <div className="relative my-auto w-full max-w-lg border border-red-800/80 bg-[#0c0c0e] p-5 sm:p-6 shadow-2xl space-y-4 text-white max-h-[92vh] overflow-y-auto no-scrollbar">
            <button
              onClick={() => setRulesTournament(null)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <FileText className="text-red-500 shrink-0" size={26} />
              <div className="min-w-0">
                <h3 className="font-display text-lg sm:text-xl font-black uppercase text-white truncate">
                  TOURNAMENT RULES & REGULATIONS
                </h3>
                <p className="text-xs text-red-400 font-bold truncate">{rulesTournament.title}</p>
              </div>
            </div>

            <div className="max-h-[55vh] overflow-y-auto space-y-3 text-xs leading-relaxed text-white/80 pr-2">
              <p className="font-bold text-amber-400 uppercase">
                OFFICIAL RULEBOOK ({rulesTournament.game_mode}):
              </p>
              <div className="whitespace-pre-wrap border border-white/10 bg-white/5 p-3.5 sm:p-4 rounded text-xs text-white/90">
                {rulesTournament.rules ||
                  `1. All players must register with valid Free Fire UIDs.
2. Duplicate Free Fire UIDs are strictly forbidden across teams.
3. Teams must check in 15 minutes before official match start time.
4. Use of hacks, third-party scripts, or bug exploits results in immediate disqualification.
5. Admin decisions on room credentials and points calculations are final.`}
              </div>
            </div>

            <button
              onClick={() => setRulesTournament(null)}
              className="w-full bg-red-600 py-2.5 font-display text-xs font-black tracking-widest text-white hover:bg-red-500"
            >
              I UNDERSTAND THE RULES
            </button>
          </div>
        </div>
      )}

      {/* Finished Tournament View Results Modal */}
      {viewResultsModalTourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2.5 sm:p-4 backdrop-blur-md">
          <div className="relative w-full max-w-4xl 2xl:max-w-5xl border border-amber-500/80 bg-[#0c0c0e] p-4 sm:p-6 shadow-2xl space-y-4 sm:space-y-5 max-h-[92vh] flex flex-col text-white">
            <button
              onClick={() => setViewResultsModalTourney(null)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-4 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Trophy className="text-amber-400 shrink-0" size={28} />
                <div className="min-w-0">
                  <span className="text-[9px] sm:text-[10px] font-bold text-red-500 tracking-widest uppercase block truncate">
                    {viewResultsModalTourney.game_mode} • OFFICIAL STANDINGS & RESULTS
                  </span>
                  <h3 className="font-display text-lg sm:text-2xl font-black text-white truncate">
                    {viewResultsModalTourney.title}
                  </h3>
                </div>
              </div>
              {viewResultsModalTourney.prize_pool && viewResultsModalTourney.prize_pool.trim() !== '' && (
                <div className="text-right">
                  <p className="text-[10px] text-white/50">TOTAL PRIZE POOL</p>
                  <p className="font-display text-xl font-black text-amber-400">
                    {viewResultsModalTourney.prize_pool}
                  </p>
                </div>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* TOP 3 PODIUM DISPLAY */}
              <div className="space-y-3">
                <h4 className="eyebrow flex items-center gap-2 text-amber-400">
                  <Award size={16} /> TOP 3 WINNING SQUADS PODIUM
                </h4>

                {viewResultsModalTourney.top_3_teams && viewResultsModalTourney.top_3_teams.length > 0 ? (
                  <div className="grid gap-5 sm:grid-cols-3">
                    {viewResultsModalTourney.top_3_teams.map((top) => {
                      const isGold = top.rank === 1
                      const isSilver = top.rank === 2
                      const isBronze = top.rank === 3

                      return (
                        <div
                          key={top.rank}
                          className={`p-5 rounded-lg border-2 relative flex flex-col justify-between transition-all duration-300 transform hover:-translate-y-1 ${
                            isGold
                              ? 'border-amber-400 bg-gradient-to-b from-amber-500/25 via-amber-950/40 to-[#080500] shadow-[0_0_25px_rgba(245,158,11,0.3)]'
                              : isSilver
                              ? 'border-slate-300 bg-gradient-to-b from-slate-300/20 via-slate-900/40 to-[#050608] shadow-[0_0_20px_rgba(203,213,225,0.2)]'
                              : 'border-amber-700 bg-gradient-to-b from-amber-800/20 via-amber-950/30 to-[#0a0502] shadow-[0_0_20px_rgba(180,83,9,0.2)]'
                          }`}
                        >
                          {/* Rank Badge Header */}
                          <div>
                            <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-black uppercase rounded shadow-md ${
                                  isGold
                                    ? 'bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black border border-amber-300'
                                    : isSilver
                                    ? 'bg-gradient-to-r from-slate-200 via-slate-300 to-slate-400 text-black border border-slate-200'
                                    : 'bg-gradient-to-r from-amber-700 via-amber-800 to-amber-900 text-white border border-amber-600'
                                }`}
                              >
                                {isGold ? '🏆 1ST PLACE CHAMPION' : isSilver ? '🥈 2ND PLACE RUNNER UP' : '🥉 3RD PLACE 2ND RUNNER UP'}
                              </span>
                              {top.prize && top.prize.trim() !== '' && (
                                <span
                                  className={`px-2.5 py-1 text-xs font-black rounded border shadow ${
                                    isGold
                                      ? 'border-amber-400/60 bg-amber-950/90 text-amber-300'
                                      : isSilver
                                      ? 'border-slate-300/60 bg-slate-900/90 text-slate-100'
                                      : 'border-amber-700/60 bg-amber-950/90 text-amber-400'
                                  }`}
                                >
                                  {top.prize}
                                </span>
                              )}
                            </div>

                            {/* Team Name */}
                            <h5
                              className={`font-display text-xl font-black uppercase tracking-wide drop-shadow-md ${
                                isGold ? 'text-amber-300' : isSilver ? 'text-slate-100' : 'text-amber-200'
                              }`}
                            >
                              {top.team_name}
                            </h5>

                            {/* 4 Squad Players List */}
                            {top.player_names && top.player_names.length > 0 ? (
                              <div className="mt-3 text-[11px] space-y-1 border-t border-white/10 pt-3">
                                <p
                                  className={`text-[10px] font-bold uppercase tracking-wider ${
                                    isGold ? 'text-amber-400' : isSilver ? 'text-slate-300' : 'text-amber-500'
                                  }`}
                                >
                                  👑 4 SQUAD PLAYERS:
                                </p>
                                <div className="space-y-1 font-medium">
                                  {top.player_names.map((name, pIdx) => {
                                    const pUid = top.player_uids?.[pIdx] || ''
                                    const pAvatar =
                                      avatarMap.get(pUid.trim().toLowerCase()) ||
                                      avatarMap.get(name.trim().toLowerCase()) ||
                                      null
                                    return (
                                      <div
                                        key={pIdx}
                                        className={`flex items-center justify-between px-2 py-1 rounded text-[11px] ${
                                          pIdx === 0
                                            ? isGold
                                              ? 'bg-amber-500/20 text-amber-200 font-bold border border-amber-500/30'
                                              : isSilver
                                              ? 'bg-slate-300/20 text-slate-100 font-bold border border-slate-400/30'
                                              : 'bg-amber-800/20 text-amber-300 font-bold border border-amber-700/30'
                                            : 'bg-black/30 text-white/90'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 min-w-0">
                                          <UserAvatar
                                            src={pAvatar}
                                            name={name}
                                            size="xs"
                                            className="h-5 w-5 border border-white/20 shrink-0"
                                          />
                                          <span className="truncate">
                                            {pIdx + 1}. {name} {pIdx === 0 ? ' (Leader)' : ''}
                                          </span>
                                        </div>
                                        {pUid && (
                                          <span className="font-mono text-[9px] text-white/50 shrink-0 ml-2">
                                            UID: {pUid}
                                          </span>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-2 text-xs flex items-center gap-2">
                                <UserAvatar
                                  src={avatarMap.get((top.captain_uid || '').trim().toLowerCase()) || avatarMap.get((top.captain_name || '').trim().toLowerCase())}
                                  name={top.captain_name}
                                  size="xs"
                                  className="h-6 w-6 border border-white/20"
                                />
                                <div>
                                  <p className="text-white/80">Leader: {top.captain_name}</p>
                                  {top.captain_uid && (
                                    <p className="text-[10px] text-white/50 font-mono">UID: {top.captain_uid}</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Stats Footer */}
                          <div className="mt-4 flex items-center justify-between text-xs font-bold border-t border-white/10 pt-2.5">
                            {top.kills && top.kills > 0 ? (
                              <span className="text-red-400 flex items-center gap-1">
                                🎯 {top.kills} KILLS
                              </span>
                            ) : <span />}
                            <span
                              className={isGold ? 'text-amber-400' : isSilver ? 'text-slate-200' : 'text-amber-500'}
                            >
                              ⭐ {top.points || 0} POINTS
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="border border-white/10 p-4 text-center text-xs text-white/40">
                    Top 3 podium details pending admin announcement.
                  </div>
                )}
              </div>

              {/* ALL REGISTERED TEAMS & STANDINGS TABLE */}
              <div className="space-y-3 border-t border-white/10 pt-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h4 className="eyebrow flex items-center gap-2">
                    <Users size={16} /> ALL REGISTERED TEAMS & FINAL STANDINGS ({viewResultsRegs.length})
                  </h4>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 text-white/40" size={14} />
                    <input
                      type="text"
                      placeholder="Search team name..."
                      value={resultsSearchQuery}
                      onChange={(e) => setResultsSearchQuery(e.target.value)}
                      className="w-full border border-white/15 bg-black/60 py-1.5 pl-9 pr-3 text-xs text-white placeholder-white/40 focus:outline-none"
                    />
                  </div>
                </div>

                {viewResultsRegs.length === 0 ? (
                  <div className="border border-white/10 p-6 text-center text-xs text-white/40">
                    No registered teams found for this tournament.
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 border border-white/10 bg-white/5 max-h-80 overflow-y-auto pr-1">
                    {viewResultsRegs
                      .filter((r) => {
                        if (!resultsSearchQuery) return true
                        const q = resultsSearchQuery.toLowerCase()
                        return (
                          (r.team_name && r.team_name.toLowerCase().includes(q)) ||
                          (r.captain_name && r.captain_name.toLowerCase().includes(q)) ||
                          (r.captain_free_fire_uid && r.captain_free_fire_uid.includes(q))
                        )
                      })
                      .map((r, idx) => (
                        <div key={r.id} className="p-3.5 flex items-center justify-between hover:bg-white/5 transition">
                          <div className="flex items-center gap-3.5">
                            <span className="font-display text-xl font-black text-amber-400 w-8 text-center">
                              #{r.placement || idx + 1}
                            </span>
                            <div className="space-y-1.5 flex-1">
                              <h5 className="font-display text-base font-black text-amber-400">
                                {r.team_name || r.captain_name}
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] bg-black/40 p-2.5 border border-white/10 rounded">
                                <div className="text-white/80 flex items-center gap-2">
                                  <UserAvatar
                                    src={avatarMap.get((r.captain_free_fire_uid || '').trim().toLowerCase()) || avatarMap.get((r.captain_name || '').trim().toLowerCase())}
                                    name={r.captain_name}
                                    size="xs"
                                    className="h-6 w-6 border border-amber-400/60"
                                  />
                                  <div>
                                    <span className="font-bold text-amber-300">👑 Leader: <strong className="text-white">{r.captain_name}</strong></span>
                                    <span className="block font-mono text-[9px] text-amber-300/80">UID: {r.captain_free_fire_uid || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-white/80 flex items-center gap-2">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[0] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[0] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[0]}
                                    size="xs"
                                    className="h-6 w-6 border border-white/20"
                                  />
                                  <div>
                                    <span>🎮 2nd: <strong className="text-white">{r.teammate_names?.[0] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-[9px] text-amber-300/80">UID: {r.teammate_uids?.[0] || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-white/80 flex items-center gap-2">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[1] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[1] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[1]}
                                    size="xs"
                                    className="h-6 w-6 border border-white/20"
                                  />
                                  <div>
                                    <span>🎮 3rd: <strong className="text-white">{r.teammate_names?.[1] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-[9px] text-amber-300/80">UID: {r.teammate_uids?.[1] || 'N/A'}</span>
                                  </div>
                                </div>
                                <div className="text-white/80 flex items-center gap-2">
                                  <UserAvatar
                                    src={avatarMap.get((r.teammate_uids?.[2] || '').trim().toLowerCase()) || avatarMap.get((r.teammate_names?.[2] || '').trim().toLowerCase())}
                                    name={r.teammate_names?.[2]}
                                    size="xs"
                                    className="h-6 w-6 border border-white/20"
                                  />
                                  <div>
                                    <span>🎮 4th: <strong className="text-white">{r.teammate_names?.[2] || 'N/A'}</strong></span>
                                    <span className="block font-mono text-[9px] text-amber-300/80">UID: {r.teammate_uids?.[2] || 'N/A'}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            {r.kills && r.kills > 0 ? (
                              <span className="font-display text-base font-black text-red-500 block">
                                {r.kills} KILLS
                              </span>
                            ) : null}
                            <p className="text-[10px] font-bold text-emerald-400 flex items-center justify-end gap-1">
                              <CheckCircle2 size={11} /> VERIFIED
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
