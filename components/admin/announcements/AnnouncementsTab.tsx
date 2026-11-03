'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle2,
  Dices,
  Edit2,
  Plus,
  RefreshCw,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import type { LeagueSeason, Tournament } from '../../../lib/types'
import { fetchTournaments } from '../../../lib/supabase'
import {
  deleteLeagueSeason,
  fetchLeagueData,
  fetchLeagueSeasons,
  regenerateLeagueSchedule,
  setSeasonTeamStatus,
  syncSeasonTeams,
  updateLeagueSeason,
  type LeagueData,
} from '../../../lib/league-service'
import { SeasonDialog } from './SeasonDialog'
import { TeamPool } from './TeamPool'
import { SpinWheelPanel } from './SpinWheelPanel'
import { PairingsList } from './PairingsList'
import { ResultsPanel } from './ResultsPanel'
import { PlayoffBracketGraph } from './PlayoffBracketGraph'
import type { PlayoffBracketData } from '../../../lib/playoff-types'
import { fetchPlayoffData } from '../../../lib/playoff-service'
import { computeStandings } from '../../../lib/league'

interface AnnouncementsTabProps {
  showNotification: (text: string, type?: 'success' | 'error') => void
}

type SubTab = 'WHEEL' | 'RESULTS' | 'PLAYOFFS'

export function AnnouncementsTab({ showNotification }: AnnouncementsTabProps) {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tournamentId, setTournamentId] = useState('')
  const [seasons, setSeasons] = useState<LeagueSeason[]>([])
  const [seasonId, setSeasonId] = useState('')
  const [data, setData] = useState<LeagueData | null>(null)
  const [playoffData, setPlayoffData] = useState<PlayoffBracketData | null>(null)
  const [subTab, setSubTab] = useState<SubTab>('WHEEL')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [seasonDialogOpen, setSeasonDialogOpen] = useState(false)
  // Guards against a slow response for an old season overwriting a new one.
  const requestRef = useRef('')

  // Load tournaments once.
  useEffect(() => {
    let active = true
    fetchTournaments().then((list) => {
      if (!active) return
      setTournaments(list)
      if (list.length) setTournamentId(list[0].id)
    })
    return () => {
      active = false
    }
  }, [])

  const loadSeasonList = useCallback(async (selectedTournamentId: string, preferredSeasonId?: string) => {
    if (!selectedTournamentId) {
      setSeasons([])
      setSeasonId('')
      return
    }

    const list = await fetchLeagueSeasons(selectedTournamentId)
    if (list.error) {
      setSeasons([])
      setSeasonId('')
      setError(list.error)
      return
    }

    setError('')
    setSeasons(list.seasons)

    const preferred =
      preferredSeasonId && list.seasons.some((season) => season.id === preferredSeasonId)
        ? preferredSeasonId
        : list.seasons.length
          ? list.seasons[list.seasons.length - 1].id
          : ''

    setSeasonId(preferred)
  }, [])

  // Load seasons whenever the tournament changes.
  useEffect(() => {
    requestRef.current = ''
    setData(null)
    setError('')
    loadSeasonList(tournamentId)
  }, [tournamentId, loadSeasonList])

  const loadData = useCallback(
    async (selectedSeasonId: string) => {
      if (!selectedSeasonId) {
        requestRef.current = ''
        setData(null)
        setLoading(false)
        return
      }

      requestRef.current = selectedSeasonId
      setLoading(true)
      const [result, playoffs] = await Promise.all([
        fetchLeagueData(selectedSeasonId),
        fetchPlayoffData(selectedSeasonId),
      ])

      // A newer season was selected while this request was in flight.
      if (requestRef.current !== selectedSeasonId) return

      setLoading(false)

      if (!result.success || !result.data) {
        setData(null)
        setPlayoffData(null)
        setError(result.error || 'Could not load this season.')
        return
      }

      setError('')
      setData(result.data)
      setPlayoffData(playoffs)
    },
    []
  )

  useEffect(() => {
    setData(null)
    setPlayoffData(null)
    loadData(seasonId)
  }, [seasonId, loadData])

  const refresh = useCallback(async () => {
    if (seasonId) {
      await loadData(seasonId)
      const playoffs = await fetchPlayoffData(seasonId)
      setPlayoffData(playoffs)
    }
  }, [seasonId, loadData])

  const tournament = tournaments.find((item) => item.id === tournamentId) || null
  const season = data?.season || seasons.find((item) => item.id === seasonId) || null
  const nextSeasonNumber = useMemo(
    () => Math.max(0, ...seasons.map((item) => item.season_number)) + 1,
    [seasons]
  )

  const standings = useMemo(() => {
    if (!data) return []
    const completedTeamIds = new Set<string>()
    for (const pairing of data.pairings) {
      if (pairing.status !== 'completed') continue
      completedTeamIds.add(pairing.team_a_id)
      completedTeamIds.add(pairing.team_b_id)
    }
    const rankedTeams = data.teams.filter(
      (team) => team.status === 'active' || completedTeamIds.has(team.registration_id)
    )
    return computeStandings(rankedTeams, data.pairings, data.results, (data.season || season)?.win_points || 3)
  }, [data, season])

  const notify = (text: string, type: 'success' | 'error' = 'success') => showNotification(text, type)

  const handleExcludeTeam = async (registrationId: string) => {
    const team = data?.teams.find((item) => item.registration_id === registrationId)
    if (
      !window.confirm(
        `Remove ${team?.team_name || 'this team'} from the wheel?\n\nIts scheduled and locked pairings will be cancelled. Completed results stay in the standings.`
      )
    ) {
      return
    }

    setBusy(true)
    const result = await setSeasonTeamStatus(seasonId, registrationId, 'excluded')
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not exclude the team.', 'error')

    const cancelled = result.data?.cancelled || 0
    notify(
      `${team?.team_name || 'Team'} removed from the wheel${cancelled ? ` — ${cancelled} pairing(s) cancelled` : ''}.`
    )
    await refresh()
  }

  const handleRestoreTeam = async (registrationId: string) => {
    const team = data?.teams.find((item) => item.registration_id === registrationId)
    setBusy(true)
    const result = await setSeasonTeamStatus(seasonId, registrationId, 'active')
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not restore the team.', 'error')
    notify(
      `${team?.team_name || 'Team'} restored. Cancelled pairings stay cancelled — restore them or add new pairings.`
    )
    await refresh()
  }

  const handleSyncTeams = async () => {
    setBusy(true)
    const result = await syncSeasonTeams(seasonId)
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not sync registrations.', 'error')

    const added = result.data?.added || 0
    notify(
      added
        ? `${added} new team(s) added to the season. Regenerate or add pairings manually to include them.`
        : 'All tournament registrations are already in this season.'
    )
    await refresh()
  }

  const handleRegenerate = async () => {
    if (
      !window.confirm(
        'Regenerate the entire schedule for this season?\n\nAll scheduled and cancelled pairings will be replaced. Locked/completed pairings must be unlocked first.'
      )
    ) {
      return
    }

    setBusy(true)
    const result = await regenerateLeagueSchedule(seasonId)
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not regenerate the schedule.', 'error')

    const warnings: string[] = result.data?.warnings || []
    notify(
      `Schedule regenerated: ${result.data?.matchCount} matches across ${result.data?.roundCount} rounds.${
        warnings.length ? ` ${warnings.join(' ')}` : ''
      }`
    )
    await refresh()
  }

  const handleDeleteSeason = async () => {
    if (!season) return
    if (
      !window.confirm(
        `Delete ${season.name} permanently?\n\nAll pairings and results for this season will be deleted. This cannot be undone.`
      )
    ) {
      return
    }

    setBusy(true)
    const result = await deleteLeagueSeason(season.id)
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not delete the season.', 'error')

    notify(`${season.name} deleted.`)
    await loadSeasonList(tournamentId)
  }

  const handleCompleteSeason = async () => {
    if (!season) return
    if (!window.confirm(`Mark ${season.name} as completed? Pairings and results stay editable.`)) return

    setBusy(true)
    const result = await updateLeagueSeason(season.id, { status: 'completed' })
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not complete the season.', 'error')
    notify(`${season.name} marked completed.`)
    await loadSeasonList(tournamentId, season.id)
    await refresh()
  }

  const handleRenameSeason = async () => {
    if (!season) return
    const next = window.prompt('Season name', season.name)
    if (next === null) return
    const trimmed = next.trim()
    if (!trimmed || trimmed === season.name) return

    setBusy(true)
    const result = await updateLeagueSeason(season.id, { name: trimmed })
    setBusy(false)
    if (!result.success) return notify(result.error || 'Could not rename the season.', 'error')

    notify('Season renamed.')
    await loadSeasonList(tournamentId, season.id)
    await refresh()
  }

  return (
    <div className="space-y-5">
      <div className="border border-brand-border bg-brand-muted p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="eyebrow mb-1">Season Control</p>
            <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-ink">
              Announcements — Draw &amp; Results
            </h3>
            <p className="mt-1 text-xs leading-5 text-ink-subtle">
              Every pairing is generated before the wheel spins. The wheel only reveals a pre-made pairing, so a
              duplicate opponent is impossible.
            </p>
          </div>
          <Trophy className="shrink-0 text-brand-bright" size={26} />
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 border border-brand bg-brand-muted p-3 text-xs text-brand-bright">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-3 border border-line-subtle bg-surface-2 p-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid flex-1 gap-3 sm:grid-cols-2 xl:max-w-2xl">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-subtle">
              Tournament
            </label>
            <select
              value={tournamentId}
              onChange={(event) => setTournamentId(event.target.value)}
              className="w-full border border-line bg-surface px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none"
            >
              {tournaments.length === 0 && <option value="">No tournaments</option>}
              {tournaments.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-subtle">Season</label>
            <select
              value={seasonId}
              onChange={(event) => setSeasonId(event.target.value)}
              disabled={seasons.length === 0}
              className="w-full border border-line bg-surface px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none disabled:opacity-40"
            >
              {seasons.length === 0 && <option value="">No seasons yet</option>}
              {seasons.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setSeasonDialogOpen(true)}
            disabled={!tournament}
            className="inline-flex items-center gap-2 whitespace-nowrap border border-brand bg-brand px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink transition hover:bg-brand disabled:opacity-40 shadow-sm"
          >
            <Plus size={14} /> New Season
          </button>

          <button
            onClick={() => loadSeasonList(tournamentId, seasonId)}
            disabled={!tournamentId || loading}
            className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted transition hover:bg-surface-3 disabled:opacity-40"
            title="Reload seasons"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>

          {season && (
            <>
              <button
                onClick={handleRenameSeason}
                disabled={busy}
                className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink-muted transition hover:bg-surface-3 disabled:opacity-40"
                title="Rename this season"
              >
                <Edit2 size={13} /> Rename
              </button>

              {season.status !== 'completed' && (
                <button
                  onClick={handleCompleteSeason}
                  disabled={busy}
                  className="inline-flex items-center gap-2 border border-line-strong bg-surface-3 px-3.5 py-2.5 text-xs font-extrabold uppercase tracking-wider text-ink transition hover:bg-surface-3 hover:text-ink disabled:opacity-40"
                >
                  <CheckCircle2 size={14} /> Complete
                </button>
              )}
              <button
                onClick={handleDeleteSeason}
                disabled={busy}
                className="inline-flex items-center gap-1.5 border border-brand-border bg-brand-muted px-3 py-2.5 text-xs font-extrabold uppercase tracking-wider text-brand-bright transition hover:bg-brand hover:text-ink disabled:opacity-40"
              >
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      </div>

      {season && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-b border-line-subtle pb-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-ink-subtle">
          <span className="inline-flex items-center gap-2 text-ink">
            <Calendar size={14} className="text-brand-bright" /> {season.name}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users size={14} className="text-brand-bright" /> {data?.teams.filter((team) => team.status === 'active').length || 0} teams
          </span>
          <span>
            {season.matches_per_team} matches / team
          </span>
          <span>{season.win_points} pts / win</span>
          <span className="inline-flex items-center gap-1.5">
            Round {season.current_round}
          </span>
          <span
            className={`border px-2.5 py-0.5 text-xs font-extrabold tracking-wider ${
              season.status === 'completed'
                ? 'border-line-strong bg-surface-3 text-ink'
                : 'border-brand bg-brand-muted text-brand-bright'
            }`}
          >
            {season.status}
          </span>
        </div>
      )}

      {season && (
        <div className="flex border border-line-subtle bg-surface-2 p-1.5 gap-1.5">
          <button
            onClick={() => setSubTab('WHEEL')}
            className={`flex flex-1 items-center justify-center gap-2.5 px-4 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition ${
              subTab === 'WHEEL' ? 'bg-brand text-ink shadow-md' : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'
            }`}
          >
            <Dices size={16} /> Spin Wheel
          </button>
          <button
            onClick={() => setSubTab('RESULTS')}
            className={`flex flex-1 items-center justify-center gap-2.5 px-4 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition ${
              subTab === 'RESULTS' ? 'bg-brand text-ink shadow-md' : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'
            }`}
          >
            <BarChart3 size={16} /> Results &amp; Standings
          </button>
          <button
            onClick={() => setSubTab('PLAYOFFS')}
            className={`flex flex-1 items-center justify-center gap-2.5 px-4 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider transition ${
              subTab === 'PLAYOFFS'
                ? 'bg-brand text-ink shadow-md'
                : playoffData
                  ? 'text-brand-bright hover:text-brand-bright hover:bg-ink/[0.04]'
                  : 'text-ink-muted hover:text-ink hover:bg-ink/[0.04]'
            }`}
          >
            <Trophy size={16} /> IPL Playoffs (Top 6)
            {playoffData?.champion && (
              <span className="ml-1 text-xs bg-canvas/40 text-brand-bright px-2 py-0.5 rounded uppercase font-extrabold">
                Won
              </span>
            )}
          </button>
        </div>
      )}

      {loading && !data && (
        <div className="border border-line-subtle p-10 text-center text-xs font-bold uppercase tracking-widest text-ink-subtle">
          Loading season…
        </div>
      )}

      {!tournament && tournaments.length === 0 && (
        <div className="border border-line-subtle p-6 text-center text-xs text-ink-subtle">
          No tournaments found. Create a tournament in the TOURNAMENTS tab first.
        </div>
      )}

      {!loading && !season && tournament && !error && (
        <div className="flex flex-col items-center justify-center border border-line-subtle bg-surface p-10 text-center">
          <Dices size={38} className="mb-3 text-ink-subtle" />
          <p className="font-display text-sm font-extrabold uppercase tracking-widest text-ink-muted">
            No season for this tournament yet
          </p>
          <p className="mt-1 max-w-md text-xs leading-5 text-ink-subtle">
            Create a season and the full opponent schedule will be generated automatically from every registered
            team.
          </p>
          <button
            onClick={() => setSeasonDialogOpen(true)}
            className="mt-4 inline-flex items-center gap-2 whitespace-nowrap bg-brand px-4 py-2.5 text-xs font-extrabold uppercase tracking-widest text-ink transition hover:bg-brand"
          >
            <Plus size={13} /> Create First Season
          </button>
        </div>
      )}

      {season && data && (
        <>
          {subTab === 'WHEEL' && (
            <div className="space-y-5">
              <TeamPool
                season={season}
                teams={data.teams}
                pairings={data.pairings}
                busy={busy || loading}
                onExclude={handleExcludeTeam}
                onRestore={handleRestoreTeam}
                onSync={handleSyncTeams}
                onRegenerate={handleRegenerate}
              />

              <SpinWheelPanel
                season={season}
                teams={data.teams}
                pairings={data.pairings}
                busy={busy || loading}
                onRefresh={refresh}
                notify={notify}
              />

              <PairingsList
                season={season}
                teams={data.teams}
                pairings={data.pairings}
                results={data.results}
                busy={busy || loading}
                onRefresh={refresh}
                notify={notify}
              />
            </div>
          )}

          {subTab === 'RESULTS' && (
            <ResultsPanel
              season={season}
              teams={data.teams}
              pairings={data.pairings}
              results={data.results}
              busy={busy || loading}
              onRefresh={refresh}
              notify={notify}
              onOpenPlayoffs={() => setSubTab('PLAYOFFS')}
              playoffBracket={playoffData}
              onPlayoffFinalized={(bracket) => setPlayoffData(bracket)}
            />
          )}

          {subTab === 'PLAYOFFS' && (
            playoffData ? (
              <PlayoffBracketGraph
                bracket={playoffData}
                standings={standings}
                seasonName={season.name}
                onUpdate={(updated) => setPlayoffData(updated)}
                notify={notify}
              />
            ) : (
              <div className="flex flex-col items-center justify-center border border-line-subtle bg-surface p-12 text-center space-y-3">
                <Trophy size={42} className="text-brand-bright" />
                <h3 className="font-display text-base font-extrabold uppercase tracking-wider text-ink">
                  Playoffs Not Finalized Yet
                </h3>
                <p className="text-xs text-ink-subtle max-w-md leading-relaxed">
                  Once all tournament wheel spins and round matches are complete, go to the{' '}
                  <strong className="text-ink">Results &amp; Standings</strong> tab and click the{' '}
                  <strong className="text-brand-bright">Finalize</strong> button below the Points Table to select and lock
                  in the Top 6 teams.
                </p>
                <button
                  onClick={() => setSubTab('RESULTS')}
                  className="mt-2 inline-flex items-center gap-2 border border-brand bg-brand/20 hover:bg-brand hover:text-ink px-4 py-2 text-xs font-extrabold uppercase tracking-widest text-brand-bright transition"
                >
                  <BarChart3 size={13} /> View Points Table &amp; Results
                </button>
              </div>
            )
          )}
        </>
      )}

      <SeasonDialog
        isOpen={seasonDialogOpen}
        tournament={tournament}
        nextSeasonNumber={nextSeasonNumber}
        onClose={() => setSeasonDialogOpen(false)}
        onCreated={async ({ seasonId: createdId, message }) => {
          notify(message)
          await loadSeasonList(tournamentId, createdId)
        }}
      />
    </div>
  )
}
