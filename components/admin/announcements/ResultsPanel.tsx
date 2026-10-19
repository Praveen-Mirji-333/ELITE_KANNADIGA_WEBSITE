'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Lock,
  Search,
  Trash2,
  Trophy,
  Users,
} from 'lucide-react'
import type { LeagueMatchResult, LeaguePairing, LeagueSeason, LeagueSeasonTeam } from '../../../lib/types'
import { computeStandings, usedRounds } from '../../../lib/league'
import { deleteMatchResult, saveMatchResult } from '../../../lib/league-service'
import { StandingsTable } from './StandingsTable'
import { LeagueCharts } from './LeagueCharts'

interface ResultsPanelProps {
  season: LeagueSeason
  teams: LeagueSeasonTeam[]
  pairings: LeaguePairing[]
  results: LeagueMatchResult[]
  busy?: boolean
  onRefresh: () => Promise<void> | void
  notify: (text: string, type?: 'success' | 'error') => void
}

export function ResultsPanel({ season, teams, pairings, results, busy, onRefresh, notify }: ResultsPanelProps) {
  const [roundFilter, setRoundFilter] = useState<'all' | string>('all')
  const [search, setSearch] = useState('')

  const activeTeams = teams.filter((team) => team.status === 'active')
  const resultByPairing = useMemo(
    () => new Map(results.map((result) => [result.pairing_id, result])),
    [results]
  )

  const teamName = (id: string) => teams.find((team) => team.registration_id === id)?.team_name || 'Unknown Team'

  const standings = useMemo(() => {
    const completedTeamIds = new Set<string>()
    for (const pairing of pairings) {
      if (pairing.status !== 'completed') continue
      completedTeamIds.add(pairing.team_a_id)
      completedTeamIds.add(pairing.team_b_id)
    }

    // Keep active teams plus excluded teams that already have results, so a
    // team removed from the wheel does not silently lose its record.
    const rankedTeams = teams.filter(
      (team) => team.status === 'active' || completedTeamIds.has(team.registration_id)
    )

    return computeStandings(rankedTeams, pairings, results, season.win_points)
  }, [teams, pairings, results, season.win_points])

  const matchPairings = useMemo(() => {
    const locked = pairings.filter((pairing) => pairing.status === 'locked' || pairing.status === 'completed')
    const filtered = locked.filter((pairing) => {
      if (roundFilter !== 'all' && pairing.round_number !== parseInt(roundFilter, 10)) return false
      if (!search.trim()) return true
      const query = search.trim().toLowerCase()
      return (
        teamName(pairing.team_a_id).toLowerCase().includes(query) ||
        teamName(pairing.team_b_id).toLowerCase().includes(query) ||
        (pairing.label || '').toLowerCase().includes(query)
      )
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return filtered.sort(
      (a, b) => a.round_number - b.round_number || a.match_number - b.match_number
    )
  }, [pairings, roundFilter, search, teams])

  const rounds = useMemo(() => {
    const values = usedRounds(pairings)
    return values.length ? values : [1]
  }, [pairings])

  // If a regenerated/deleted schedule no longer has the selected round, fall
  // back to "All Rounds" instead of showing an empty filter.
  useEffect(() => {
    if (roundFilter !== 'all' && !rounds.includes(parseInt(roundFilter, 10))) {
      setRoundFilter('all')
    }
  }, [roundFilter, rounds])

  const maxRound = Math.max(season.matches_per_team, ...rounds, 1)
  const totalMatches = pairings.filter((pairing) => pairing.status !== 'cancelled').length
  const lockedMatches = pairings.filter(
    (pairing) => pairing.status === 'locked' || pairing.status === 'completed'
  ).length
  const completedMatches = pairings.filter((pairing) => pairing.status === 'completed').length
  const progress = lockedMatches > 0 ? Math.round((completedMatches / lockedMatches) * 100) : 0

  const handleSaveResult = async (
    pairing: LeaguePairing,
    scoreA: number,
    scoreB: number,
    winnerId: string
  ) => {
    const result = await saveMatchResult({
      pairingId: pairing.id,
      seasonId: season.id,
      teamAScore: scoreA,
      teamBScore: scoreB,
      winnerId,
    })

    if (!result.success) {
      notify(result.error || 'Could not save the result.', 'error')
      return false
    }

    notify(`Result saved: ${teamName(pairing.team_a_id)} ${scoreA} – ${scoreB} ${teamName(pairing.team_b_id)}`)
    await onRefresh()
    return true
  }

  const handleDeleteResult = async (pairing: LeaguePairing) => {
    if (!window.confirm('Delete this result? The pairing will return to LOCKED.')) return
    const result = await deleteMatchResult(pairing.id)
    if (!result.success) {
      notify(result.error || 'Could not delete the result.', 'error')
      return
    }
    notify('Result deleted.')
    await onRefresh()
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={Users} label="Teams" value={String(activeTeams.length)} />
        <SummaryCard icon={ClipboardList} label="Matches" value={String(totalMatches)} />
        <SummaryCard icon={Lock} label="Locked / Played" value={`${lockedMatches} / ${completedMatches}`} />
        <SummaryCard icon={Trophy} label="Results Entered" value={`${progress}%`} />
      </div>

      <div className="border border-white/10 bg-white/5 p-4">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-white">
            <BarChart3 size={15} className="text-red-500" /> Match Results
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roundFilter}
              onChange={(event) => setRoundFilter(event.target.value)}
              className="border border-white/15 bg-[#111] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white focus:border-red-500 focus:outline-none"
            >
              <option value="all">All Rounds</option>
              {rounds.map((round) => (
                <option key={round} value={String(round)}>
                  Round {round}
                </option>
              ))}
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-2 text-white/30" size={13} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search team or match…"
                className="w-44 border border-white/15 bg-white/5 py-1.5 pl-8 pr-2 text-[11px] text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {matchPairings.length === 0 ? (
          <div className="border border-white/10 p-8 text-center text-xs text-white/40">
            No locked pairings yet. Use the Spin Wheel tab to reveal and lock matches first.
          </div>
        ) : (
          <div className="space-y-2">
            {matchPairings.map((pairing) => (
              <MatchResultRow
                key={pairing.id}
                pairing={pairing}
                result={resultByPairing.get(pairing.id)}
                teamAName={teamName(pairing.team_a_id)}
                teamBName={teamName(pairing.team_b_id)}
                busy={busy}
                onSave={handleSaveResult}
                onDelete={() => handleDeleteResult(pairing)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="eyebrow flex items-center gap-2">
            <Trophy size={13} className="text-amber-500" /> Standings
          </p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
            Win = {season.win_points} pts · Tie-break: diff → score for
          </p>
        </div>

        <StandingsTable standings={standings} matchesPerTeam={season.matches_per_team} />
      </div>

      <LeagueCharts
        standings={standings}
        pairings={pairings}
        results={results}
        maxRound={maxRound}
        winPoints={season.win_points}
      />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users
  label: string
  value: string
}) {
  return (
    <div className="border border-white/10 bg-white/5 p-3">
      <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-white/40">
        <Icon size={11} className="text-red-500" /> {label}
      </p>
      <p className="mt-1 font-display text-xl font-black text-white">{value}</p>
    </div>
  )
}

function MatchResultRow({
  pairing,
  result,
  teamAName,
  teamBName,
  busy,
  onSave,
  onDelete,
}: {
  pairing: LeaguePairing
  result?: LeagueMatchResult
  teamAName: string
  teamBName: string
  busy?: boolean
  onSave: (pairing: LeaguePairing, scoreA: number, scoreB: number, winnerId: string) => Promise<boolean>
  onDelete: () => void
}) {
  const [scoreA, setScoreA] = useState('')
  const [scoreB, setScoreB] = useState('')
  const [manualWinner, setManualWinner] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setScoreA(result ? String(result.team_a_score) : '')
    setScoreB(result ? String(result.team_b_score) : '')
    setManualWinner('')
    setError('')
    // Only reset when this row's saved result changes, not when a sibling
    // row is saved (every refresh returns fresh object references).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.id, result?.updated_at, pairing.id])

  const parsedA = parseInt(scoreA, 10)
  const parsedB = parseInt(scoreB, 10)
  const validA = Number.isFinite(parsedA) ? parsedA : 0
  const validB = Number.isFinite(parsedB) ? parsedB : 0
  const scoresEntered = Number.isFinite(parsedA) && Number.isFinite(parsedB)
  const tied = scoresEntered && validA === validB
  const autoWinner = !scoresEntered || tied ? '' : validA > validB ? pairing.team_a_id : pairing.team_b_id
  const winnerId = autoWinner || manualWinner
  const saved = Boolean(result)

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')

    if (!Number.isFinite(parsedA) || !Number.isFinite(parsedB)) {
      setError('Enter a score for both teams.')
      return
    }
    if (parsedA < 0 || parsedB < 0) {
      setError('Scores cannot be negative.')
      return
    }
    if (!winnerId) {
      setError('Scores are tied — choose the winner.')
      return
    }

    setSaving(true)
    const ok = await onSave(pairing, parsedA, parsedB, winnerId)
    setSaving(false)
    if (!ok) setError('Could not save this result.')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={`border p-3 ${
        saved ? 'border-emerald-500/20 bg-emerald-950/10' : 'border-white/10 bg-white/[0.03]'
      }`}
    >
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-[10px] tracking-wider text-amber-400/80">
            {pairing.label || `R${pairing.round_number}-M${pairing.match_number}`}
          </span>
          {saved && (
            <span className="inline-flex items-center gap-1 border border-emerald-500/30 bg-emerald-950/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
              <CheckCircle2 size={8} /> Saved
            </span>
          )}
        </div>

        <div className="grid flex-1 grid-cols-[1fr_auto_auto_1fr] items-center gap-2">
          <span className="min-w-0 truncate text-right text-[11px] font-bold text-white">{teamAName}</span>
          <input
            type="number"
            min={0}
            value={scoreA}
            onChange={(event) => {
              setScoreA(event.target.value)
              setManualWinner('')
              setError('')
            }}
            placeholder="0"
            className="w-14 border border-white/15 bg-[#111] px-1 py-1.5 text-center font-display text-sm font-black text-white focus:border-red-500 focus:outline-none"
          />
          <input
            type="number"
            min={0}
            value={scoreB}
            onChange={(event) => {
              setScoreB(event.target.value)
              setManualWinner('')
              setError('')
            }}
            placeholder="0"
            className="w-14 border border-white/15 bg-[#111] px-1 py-1.5 text-center font-display text-sm font-black text-white focus:border-red-500 focus:outline-none"
          />
          <span className="min-w-0 truncate text-left text-[11px] font-bold text-white">{teamBName}</span>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          <button
            type="submit"
            disabled={saving || busy}
            className="bg-red-600 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {saving ? 'Saving…' : saved ? 'Update' : 'Save'}
          </button>
          {saved && (
            <button
              type="button"
              onClick={onDelete}
              className="border border-white/10 p-1.5 text-white/45 transition hover:border-red-600 hover:text-red-400"
              title="Delete result"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>

      {tied && (
        <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">Tied — pick winner:</span>
          {[pairing.team_a_id, pairing.team_b_id].map((teamId) => (
            <button
              key={teamId}
              type="button"
              onClick={() => setManualWinner(teamId)}
              className={`border px-2 py-1 text-[9px] font-black uppercase tracking-wider transition ${
                manualWinner === teamId
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-400'
                  : 'border-white/15 text-white/50 hover:border-white/30'
              }`}
            >
              {teamId === pairing.team_a_id ? teamAName : teamBName}
            </button>
          ))}
        </div>
      )}

      {error && (
        <p className="mt-2 flex items-center gap-1.5 text-[10px] text-red-400">
          <AlertCircle size={11} /> {error}
        </p>
      )}
    </form>
  )
}
