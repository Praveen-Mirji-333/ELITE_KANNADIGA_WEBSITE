'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Trophy,
  Swords,
  Radio,
  Flame,
  Users,
  RefreshCw,
  Crown,
  Medal,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Sparkles,
  ChevronRight,
  Shield,
} from 'lucide-react'
import type { Tournament, TournamentRegistration, Profile } from '../../lib/types'
import { fetchTournaments, fetchSiteSettingText, supabase } from '../../lib/supabase'
import { fetchLeagueSeasons, fetchLeagueData, type LeagueData } from '../../lib/league-service'
import { computeStandings } from '../../lib/league'
import { TournamentRegisterModal } from '../tournaments/TournamentRegisterModal'
import { fetchPlayoffData } from '../../lib/playoff-service'
import type { PlayoffBracketData } from '../../lib/playoff-types'
import { PlayoffBracketGraph } from '../admin/announcements/PlayoffBracketGraph'

interface LiveTournamentSectionProps {
  currentUserProfile: Profile | null
  onProfileUpdated?: () => void
}

export function LiveTournamentSection({
  currentUserProfile,
  onProfileUpdated,
}: LiveTournamentSectionProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selectedTourneyId, setSelectedTourneyId] = useState<string>('')
  const [seasons, setSeasons] = useState<any[]>([])
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>('')
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null)
  const [playoffData, setPlayoffData] = useState<PlayoffBracketData | null>(null)
  const [viewMode, setViewMode] = useState<'standings' | 'playoffs'>('standings')
  const [registeredTeams, setRegisteredTeams] = useState<TournamentRegistration[]>([])

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [registerModalOpen, setRegisterModalOpen] = useState(false)

  // 1. Load tournaments and respect live_tournament_id from site_settings
  const loadTournaments = useCallback(async () => {
    try {
      const [list, featuredId] = await Promise.all([
        fetchTournaments(),
        fetchSiteSettingText('live_tournament_id', ''),
      ])
      setTournaments(list)
      if (list.length > 0) {
        if (featuredId && list.some((t) => t.id === featuredId)) {
          setSelectedTourneyId(featuredId)
        } else {
          // Priority to tournament with registration_open or live, otherwise the latest
          const active = list.find((t) => t.status === 'registration_open' || t.status === 'live') || list[0]
          setSelectedTourneyId(active.id)
        }
      }
    } catch (err) {
      console.error('Failed to load tournaments in LiveTournamentSection:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadTournaments()
  }, [loadTournaments])

  // Listen for admin changes to live_tournament_id in real-time
  useEffect(() => {
    const handleSettingsUpdate = async () => {
      const featuredId = await fetchSiteSettingText('live_tournament_id', '')
      if (featuredId) {
        setSelectedTourneyId(featuredId)
      }
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_updated', handleSettingsUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_updated', handleSettingsUpdate)
      }
    }
  }, [])

  // 2. Load seasons and registrations for the selected tournament
  const loadTournamentDetails = useCallback(async (tourneyId: string) => {
    if (!tourneyId) return
    setRefreshing(true)
    try {
      // Fetch registrations for this tournament
      const { data: regs } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('tournament_id', tourneyId)
        .order('created_at', { ascending: true })
      setRegisteredTeams((regs || []) as TournamentRegistration[])

      // Fetch league seasons
      const { seasons: sList } = await fetchLeagueSeasons(tourneyId)
      setSeasons(sList || [])
      if (sList && sList.length > 0) {
        // Select active season or first
        const activeSeason = sList.find((s) => s.status === 'active') || sList[0]
        setSelectedSeasonId(activeSeason.id)
      } else {
        setSelectedSeasonId('')
        setLeagueData(null)
      }
    } catch (err) {
      console.error('Error loading tournament details:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (selectedTourneyId) {
      loadTournamentDetails(selectedTourneyId)
    }
  }, [selectedTourneyId, loadTournamentDetails])

  // 3. Load league data when season changes
  const loadSeasonLeagueData = useCallback(async (seasonId: string) => {
    if (!seasonId) {
      setLeagueData(null)
      setPlayoffData(null)
      return
    }
    setRefreshing(true)
    try {
      const [res, playoffs] = await Promise.all([
        fetchLeagueData(seasonId),
        fetchPlayoffData(seasonId),
      ])
      if (res.success && res.data) {
        setLeagueData(res.data)
      } else {
        setLeagueData(null)
      }
      setPlayoffData(playoffs)
    } catch (err) {
      console.error('Error fetching league data:', err)
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (selectedSeasonId) {
      loadSeasonLeagueData(selectedSeasonId)
    }
  }, [selectedSeasonId, loadSeasonLeagueData])

  const selectedTournament = useMemo(
    () => tournaments.find((t) => t.id === selectedTourneyId) || null,
    [tournaments, selectedTourneyId]
  )

  const activeSeason = useMemo(
    () => seasons.find((s) => s.id === selectedSeasonId) || null,
    [seasons, selectedSeasonId]
  )

  // Compute live standings with points and rounds lost
  const standings = useMemo(() => {
    if (!leagueData || !leagueData.teams || !leagueData.pairings) return []
    const winPts = leagueData.season?.win_points || 3
    return computeStandings(leagueData.teams, leagueData.pairings, leagueData.results || [], winPts)
  }, [leagueData])

  // Check if current user is registered in this tournament
  const userRegistration = useMemo(() => {
    if (!currentUserProfile) return null
    return registeredTeams.find((r) => r.user_id === currentUserProfile.id) || null
  }, [registeredTeams, currentUserProfile])

  // Check recent match results
  const recentPairings = useMemo(() => {
    if (!leagueData?.pairings) return []
    const resultsMap = new Map((leagueData.results || []).map((r) => [r.pairing_id, r]))
    const teamMap = new Map((leagueData.teams || []).map((t) => [t.registration_id, t.team_name]))

    return leagueData.pairings
      .filter((p) => p.status === 'completed' || p.status === 'locked')
      .slice(-6)
      .map((p) => ({
        ...p,
        teamAName: teamMap.get(p.team_a_id) || 'Team A',
        teamBName: teamMap.get(p.team_b_id) || 'Team B',
        result: resultsMap.get(p.id),
      }))
  }, [leagueData])

  const handleRefresh = async () => {
    if (selectedTourneyId) {
      await loadTournamentDetails(selectedTourneyId)
    }
    if (selectedSeasonId) {
      await loadSeasonLeagueData(selectedSeasonId)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center border border-white/10 bg-white/5 p-8 text-center">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-amber-400 animate-pulse">
          <RefreshCw size={14} className="animate-spin" /> Loading Live Tournament Data...
        </p>
      </div>
    )
  }

  if (tournaments.length === 0) {
    return (
      <div className="border border-white/10 bg-white/5 p-8 text-center">
        <Radio className="mx-auto mb-3 text-red-500/50" size={32} />
        <h4 className="font-display text-sm font-bold uppercase text-white">No Live Tournaments</h4>
        <p className="mt-1 text-xs text-white/50">There are no tournaments scheduled at the moment.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Tournament Switcher */}
      <div className="border border-red-900/60 bg-gradient-to-br from-red-950/50 via-[#120607] to-black p-4 sm:p-6 shadow-xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-950/80 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-red-400">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                LIVE ARENA
              </span>
              {selectedTournament?.status === 'registration_open' && (
                <span className="rounded border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[9px] font-black tracking-widest text-amber-300">
                  🔥 REGISTRATION OPEN
                </span>
              )}
              {selectedTournament?.status === 'live' && (
                <span className="rounded border border-emerald-500/40 bg-emerald-950/40 px-2 py-0.5 text-[9px] font-black tracking-widest text-emerald-300">
                  ⚡ MATCHES LIVE NOW
                </span>
              )}
            </div>

            <h3 className="font-display text-xl sm:text-2xl font-black uppercase text-white tracking-tight">
              {selectedTournament?.title || 'TOURNAMENT LIVE'}
            </h3>
            <p className="text-xs text-white/60 mt-0.5">
              Mode: <span className="font-bold text-white">{selectedTournament?.game_mode}</span> • Prize Pool:{' '}
              <span className="font-bold text-amber-400">{selectedTournament?.prize_pool}</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Tournament Selector */}
            {tournaments.length > 1 && (
              <select
                value={selectedTourneyId}
                onChange={(e) => setSelectedTourneyId(e.target.value)}
                className="w-full sm:w-auto border border-white/15 bg-[#121214] px-3 py-2 text-xs font-bold text-white focus:border-red-500 focus:outline-none"
              >
                {tournaments.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} {t.status === 'registration_open' ? '(Reg Open)' : ''}
                  </option>
                ))}
              </select>
            )}

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 border border-white/15 bg-white/5 px-3 py-2 text-xs font-bold text-white/70 hover:border-red-500 hover:text-white transition disabled:opacity-50"
                title="Refresh live points & matches"
              >
                <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>

              {/* Register CTA Button if registrations open */}
              {selectedTournament?.status === 'registration_open' && !userRegistration && (
                <button
                  onClick={() => setRegisterModalOpen(true)}
                  className="flex-1 sm:flex-initial bg-red-600 hover:bg-red-500 px-4 py-2 text-xs font-black uppercase tracking-widest text-white transition shadow-lg shadow-red-950/50 text-center"
                >
                  Register <ChevronRight size={14} className="inline ml-0.5" />
                </button>
              )}
            </div>

            {userRegistration && (
              <span className="w-full sm:w-auto text-center border border-emerald-500/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-400 truncate">
                ✓ Registered: {userRegistration.team_name || userRegistration.captain_name}
              </span>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 border-t border-white/10 pt-4">
          <div className="border border-white/5 bg-black/40 p-2 sm:p-2.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/40 block truncate">REGISTERED SQUADS</span>
            <p className="font-display text-base sm:text-lg font-black text-white mt-0.5 truncate">
              {registeredTeams.length}
              {selectedTournament?.max_slots ? (
                <span className="text-xs text-white/40"> / {selectedTournament.max_slots}</span>
              ) : null}
            </p>
          </div>
          <div className="border border-white/5 bg-black/40 p-2 sm:p-2.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/40 block truncate">ACTIVE SEASON</span>
            <p className="font-display text-base sm:text-lg font-black text-amber-400 mt-0.5 truncate">
              {activeSeason?.name || (seasons.length > 0 ? seasons[0].name : 'Pending Draw')}
            </p>
          </div>
          <div className="border border-white/5 bg-black/40 p-2 sm:p-2.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/40 block truncate">MATCHES PLAYED</span>
            <p className="font-display text-base sm:text-lg font-black text-emerald-400 mt-0.5 truncate">
              {leagueData?.results?.length || 0}
            </p>
          </div>
          <div className="border border-white/5 bg-black/40 p-2 sm:p-2.5 min-w-0">
            <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest text-white/40 block truncate">TIE-BREAKER RULE</span>
            <p className="text-[11px] sm:text-xs font-bold text-white mt-1 truncate">1. PTS → 2. Least Lost Rounds</p>
          </div>
        </div>
      </div>

      {/* 2. Season Selector if multiple seasons exist */}
      {seasons.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/40">Select Season:</span>
          <div className="flex flex-wrap gap-1.5">
            {seasons.map((s) => (
              <button
                key={s.id}
                onClick={() => setSelectedSeasonId(s.id)}
                className={`px-3 py-1 text-xs font-black uppercase tracking-wider transition ${
                  selectedSeasonId === s.id
                    ? 'border border-amber-500 bg-amber-950/40 text-amber-400'
                    : 'border border-white/10 bg-white/5 text-white/50 hover:text-white'
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playoff / Points Table View Selector */}
      {playoffData && (
        <div className="flex border border-white/10 bg-white/5 p-1">
          <button
            onClick={() => setViewMode('standings')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition rounded ${
              viewMode === 'standings' ? 'bg-red-600 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            📊 Points Table &amp; Results
          </button>
          <button
            onClick={() => setViewMode('playoffs')}
            className={`flex-1 py-2 text-xs font-black uppercase tracking-wider transition rounded flex items-center justify-center gap-1.5 ${
              viewMode === 'playoffs'
                ? 'bg-amber-500 text-black shadow-md'
                : 'text-amber-400 hover:text-amber-300'
            }`}
          >
            <Trophy size={13} /> IPL Playoff Tree (Top 6)
            {playoffData.champion && (
              <span className="ml-1 text-[8px] bg-black/40 text-amber-300 px-1 py-0.2 rounded uppercase font-black">
                Won
              </span>
            )}
          </button>
        </div>
      )}

      {/* Render Playoff Graph if in playoff view */}
      {viewMode === 'playoffs' && playoffData ? (
        <PlayoffBracketGraph
          bracket={playoffData}
          seasonName={activeSeason?.name || 'Playoffs'}
          isReadOnly={true}
        />
      ) : (
        <>
          {/* 3. Live Points Table (Standings) */}
          <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="eyebrow flex items-center gap-2">
            <Trophy size={14} className="text-amber-500" /> LIVE POINTS TABLE
          </p>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
            Win = {activeSeason?.win_points || 3} PTS • Tied teams ranked by lowest rounds lost
          </span>
        </div>

        {standings.length > 0 ? (
          <div>
            {/* Desktop / Tablet Full Table */}
            <div className="hidden md:block overflow-x-auto border border-white/10">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Team Name</th>
                    <th className="px-3 py-2.5 text-center">P</th>
                    <th className="px-3 py-2.5 text-center">W</th>
                    <th className="px-3 py-2.5 text-center">L</th>
                    <th
                      className="px-3 py-2.5 text-center text-amber-300 font-black"
                      title="Total Rounds Lost (Tie-breaker: team with fewer lost rounds ranks higher)"
                    >
                      R. LOST
                    </th>
                    <th className="px-3 py-2.5 text-center">DIFF</th>
                    <th className="px-3 py-2.5 text-center">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standings.map((row) => {
                    const isUserTeam =
                      userRegistration &&
                      (userRegistration.team_name === row.teamName ||
                        userRegistration.captain_name === row.teamName)

                    return (
                      <tr
                        key={row.teamId}
                        className={`border-t border-white/5 text-xs transition-colors ${
                          isUserTeam
                            ? 'bg-red-950/30 border-red-600/40'
                            : row.rank === 1
                              ? 'bg-amber-950/20'
                              : row.rank === 2
                                ? 'bg-slate-800/20'
                                : row.rank === 3
                                  ? 'bg-orange-950/15'
                                  : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center gap-1 font-display text-sm font-black text-white/70">
                            {row.rank === 1 ? (
                              <Crown size={14} className="text-amber-400" />
                            ) : row.rank <= 3 ? (
                              <Medal size={14} className="text-white/60" />
                            ) : null}
                            {String(row.rank).padStart(2, '0')}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`max-w-[240px] truncate font-bold ${
                                isUserTeam ? 'text-amber-300 font-black' : 'text-white'
                              }`}
                            >
                              {row.teamName}
                            </span>
                            {isUserTeam && (
                              <span className="rounded border border-red-500/40 bg-red-950/60 px-1.5 py-0.2 text-[8px] font-black uppercase text-red-300">
                                Your Squad
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-white/60">{row.played}</td>
                        <td className="px-3 py-2.5 text-center font-bold text-emerald-400">{row.wins}</td>
                        <td className="px-3 py-2.5 text-center text-red-400/80">{row.losses}</td>
                        <td className="px-3 py-2.5 text-center font-mono font-bold text-amber-300">
                          {row.roundsLost}
                        </td>
                        <td className="px-3 py-2.5 text-center text-white/60">
                          {row.diff > 0 ? `+${row.diff}` : row.diff}
                        </td>
                        <td className="px-3 py-2.5 text-center font-display text-base font-black text-amber-400">
                          {row.points}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Zero-Scroll Card View */}
            <div className="block md:hidden space-y-2.5">
              {standings.map((row) => {
                const isUserTeam =
                  userRegistration &&
                  (userRegistration.team_name === row.teamName ||
                    userRegistration.captain_name === row.teamName)

                return (
                  <div
                    key={row.teamId}
                    className={`border p-3 transition-colors ${
                      isUserTeam
                        ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950/50'
                        : row.rank === 1
                          ? 'bg-amber-950/25 border-amber-500/50'
                          : row.rank === 2
                            ? 'bg-slate-800/20 border-slate-400/30'
                            : row.rank === 3
                              ? 'bg-orange-950/20 border-orange-500/30'
                              : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="inline-flex items-center gap-1 font-display text-sm font-black text-amber-400 shrink-0">
                          {row.rank === 1 ? <Crown size={14} className="text-amber-400" /> : null}
                          #{String(row.rank).padStart(2, '0')}
                        </span>
                        <span className={`font-bold text-xs sm:text-sm truncate ${isUserTeam ? 'text-amber-300 font-black' : 'text-white'}`}>
                          {row.teamName}
                        </span>
                        {isUserTeam && (
                          <span className="shrink-0 rounded border border-red-500/40 bg-red-950/60 px-1.5 py-0.2 text-[8px] font-black uppercase text-red-300">
                            Your Squad
                          </span>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="inline-block bg-amber-500/20 border border-amber-500/50 px-2.5 py-0.5 rounded font-display text-sm font-black text-amber-400">
                          {row.points} PTS
                        </span>
                      </div>
                    </div>

                    {/* Mobile Stat Grid - Fits 100% within mobile screen width */}
                    <div className="grid grid-cols-4 gap-1 text-center bg-black/50 p-2 rounded border border-white/5 text-[10px]">
                      <div>
                        <span className="text-white/40 block text-[8px] sm:text-[9px] uppercase font-bold">MATCHES</span>
                        <span className="text-white font-bold text-xs">{row.played}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[8px] sm:text-[9px] uppercase font-bold">W - L</span>
                        <span className="text-emerald-400 font-bold text-xs">{row.wins}</span> - <span className="text-red-400 font-bold text-xs">{row.losses}</span>
                      </div>
                      <div>
                        <span className="text-amber-300/80 block text-[8px] sm:text-[9px] uppercase font-black" title="Rounds Lost Tie-breaker">R. LOST</span>
                        <span className="text-amber-300 font-mono font-black text-xs">{row.roundsLost}</span>
                      </div>
                      <div>
                        <span className="text-white/40 block text-[8px] sm:text-[9px] uppercase font-bold">DIFF</span>
                        <span className="text-white/80 font-bold text-xs">{row.diff > 0 ? `+${row.diff}` : row.diff}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : registeredTeams.length > 0 ? (
          <div className="space-y-3">
            <div className="border border-amber-500/30 bg-amber-950/20 px-3.5 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles size={14} className="text-amber-400 shrink-0" />
                <span className="font-bold text-amber-300">
                  REGISTRATIONS OPEN: {registeredTeams.length} Squads Confirmed & Seeded!
                </span>
              </div>
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/70">
                Seeded Standings • Match Wheel Starting Soon
              </span>
            </div>

            {/* Desktop / Tablet Seeded Table */}
            <div className="hidden md:block overflow-x-auto border border-white/10">
              <table className="w-full min-w-[680px] border-collapse text-left">
                <thead>
                  <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
                    <th className="px-3 py-2.5">#</th>
                    <th className="px-3 py-2.5">Team Name</th>
                    <th className="px-3 py-2.5">Captain IGN</th>
                    <th className="px-3 py-2.5 text-center">P</th>
                    <th className="px-3 py-2.5 text-center">W</th>
                    <th className="px-3 py-2.5 text-center">L</th>
                    <th
                      className="px-3 py-2.5 text-center text-amber-300 font-black"
                      title="Total Rounds Lost (Tie-breaker: team with fewer lost rounds ranks higher)"
                    >
                      R. LOST
                    </th>
                    <th className="px-3 py-2.5 text-center">PTS</th>
                    <th className="px-3 py-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {registeredTeams.map((team, idx) => {
                    const isUserTeam =
                      currentUserProfile && team.user_id === currentUserProfile.id

                    return (
                      <tr
                        key={team.id}
                        className={`border-t border-white/5 text-xs transition-colors ${
                          isUserTeam
                            ? 'bg-red-950/30 border-red-600/40'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-3 py-2.5 font-display text-sm font-black text-white/50">
                          {String(idx + 1).padStart(2, '0')}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`max-w-[220px] truncate font-bold ${
                                isUserTeam ? 'text-amber-300 font-black' : 'text-white'
                              }`}
                            >
                              {team.team_name || team.captain_name}
                            </span>
                            {isUserTeam && (
                              <span className="rounded border border-red-500/40 bg-red-950/60 px-1.5 py-0.2 text-[8px] font-black uppercase text-red-300">
                                Your Squad
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-white/60 font-mono text-[11px]">
                          {team.captain_name || 'Captain'}
                        </td>
                        <td className="px-3 py-2.5 text-center text-white/40">0</td>
                        <td className="px-3 py-2.5 text-center text-white/40">0</td>
                        <td className="px-3 py-2.5 text-center text-white/40">0</td>
                        <td className="px-3 py-2.5 text-center font-mono text-amber-300/60">0</td>
                        <td className="px-3 py-2.5 text-center font-display text-base font-black text-amber-400">
                          0
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          <span className="border border-emerald-500/30 bg-emerald-950/20 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                            Confirmed
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Zero-Scroll Seeded Card View */}
            <div className="block md:hidden space-y-2">
              {registeredTeams.map((team, idx) => {
                const isUserTeam =
                  currentUserProfile && team.user_id === currentUserProfile.id

                return (
                  <div
                    key={team.id}
                    className={`border p-2.5 flex items-center justify-between gap-2 text-xs transition ${
                      isUserTeam
                        ? 'bg-red-950/40 border-red-500 shadow-md shadow-red-950/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/[0.07]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-display text-xs font-black text-white/40 shrink-0 w-6">
                        #{String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`font-bold truncate text-xs ${isUserTeam ? 'text-amber-300 font-black' : 'text-white'}`}>
                            {team.team_name || team.captain_name}
                          </p>
                          {isUserTeam && (
                            <span className="rounded border border-red-500/40 bg-red-950/60 px-1 py-0.2 text-[7px] font-black uppercase text-red-300">
                              You
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-white/50 truncate font-mono mt-0.5">
                          Leader: {team.captain_name || 'Captain'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-display font-black text-amber-400 text-xs px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 rounded">
                        0 PTS
                      </span>
                      <span className="border border-emerald-500/30 bg-emerald-950/20 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
                        Seeded
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="border border-white/10 bg-white/5 p-6 text-center space-y-2">
            <Trophy className="mx-auto text-amber-400/60" size={28} />
            <p className="text-xs font-bold text-white">
              {seasons.length > 0
                ? 'Matches are currently being drawn or scheduled.'
                : 'Registrations are open! Points table will go live once tournament wheel matches begin.'}
            </p>
            <p className="text-[11px] text-white/40">
              No squads registered yet. Register your squad above to be placed on the points table!
            </p>
          </div>
        )}
      </div>
    </>
  )}

      {/* 4. Recent Live Matches Feed (if pairings exist) */}
      {recentPairings.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow flex items-center gap-2">
            <Swords size={14} className="text-red-500" /> RECENT MATCH RESULTS &amp; SCHEDULE
          </p>

          <div className="grid gap-2 sm:grid-cols-2">
            {recentPairings.map((p) => {
              const completed = p.status === 'completed' && p.result
              return (
                <div
                  key={p.id}
                  className={`border p-3 ${
                    completed ? 'border-white/10 bg-black/40' : 'border-amber-500/20 bg-amber-950/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] text-white/40 mb-1.5">
                    <span className="font-mono text-amber-400 font-bold">
                      {p.label || `R${p.round_number}-M${p.match_number}`}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 uppercase font-black text-[8px] ${
                        completed
                          ? 'border border-emerald-500/30 bg-emerald-950/30 text-emerald-400'
                          : 'border border-amber-500/30 bg-amber-950/30 text-amber-400'
                      }`}
                    >
                      {completed ? 'Finished' : 'Locked on Wheel'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`truncate flex-1 text-right font-bold ${
                        completed && p.result?.winner_id === p.team_a_id ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {p.teamAName}
                    </span>
                    <span className="shrink-0 font-display font-black text-white/50 px-2 py-0.5 bg-white/5 border border-white/10">
                      {completed
                        ? `${p.result?.team_a_score} – ${p.result?.team_b_score}`
                        : 'VS'}
                    </span>
                    <span
                      className={`truncate flex-1 text-left font-bold ${
                        completed && p.result?.winner_id === p.team_b_id ? 'text-amber-300' : 'text-white'
                      }`}
                    >
                      {p.teamBName}
                    </span>
                  </div>

                  {completed && p.result && (
                    <div className="mt-1.5 text-center text-[9px] font-mono text-amber-300/80 border-t border-white/5 pt-1">
                      Rounds Lost: {p.teamAName} ({p.result.team_a_rounds_lost ?? 0}) • {p.teamBName} (
                      {p.result.team_b_rounds_lost ?? 0})
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 5. Registered Teams Pool */}
      {registeredTeams.length > 0 && (
        <div className="space-y-3">
          <p className="eyebrow flex items-center gap-2">
            <Users size={14} className="text-white/60" /> REGISTERED SQUADS ({registeredTeams.length})
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {registeredTeams.slice(0, 15).map((team, idx) => (
              <div
                key={team.id}
                className="flex items-center justify-between border border-white/10 bg-white/5 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono text-[10px] text-white/30">{idx + 1}.</span>
                  <span className="truncate font-bold text-white">
                    {team.team_name || team.captain_name}
                  </span>
                </div>
                <span className="shrink-0 border border-emerald-500/30 bg-emerald-950/20 px-1.5 py-0.5 text-[8px] font-bold text-emerald-400 uppercase">
                  Confirmed
                </span>
              </div>
            ))}
          </div>

          {registeredTeams.length > 15 && (
            <p className="text-center text-[10px] text-white/40">
              + {registeredTeams.length - 15} more squads confirmed in this tournament.
            </p>
          )}
        </div>
      )}

      {/* Registration Modal */}
      {selectedTournament && (
        <TournamentRegisterModal
          isOpen={registerModalOpen}
          onClose={() => setRegisterModalOpen(false)}
          tournament={selectedTournament}
          currentUserProfile={currentUserProfile}
          onSuccess={() => {
            setRegisterModalOpen(false)
            if (selectedTourneyId) loadTournamentDetails(selectedTourneyId)
            onProfileUpdated?.()
          }}
        />
      )}
    </div>
  )
}
