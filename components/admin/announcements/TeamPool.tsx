'use client'

import { useMemo, useState } from 'react'
import { AlertCircle, RefreshCw, RotateCcw, Search, UserMinus, UserPlus, Users, X } from 'lucide-react'
import type { LeaguePairing, LeagueSeason, LeagueSeasonTeam } from '../../../lib/types'

interface TeamPoolProps {
  season: LeagueSeason
  teams: LeagueSeasonTeam[]
  pairings: LeaguePairing[]
  busy?: boolean
  onExclude: (registrationId: string) => void
  onRestore: (registrationId: string) => void
  onSync: () => void
  onRegenerate: () => void
}

export function TeamPool({
  season,
  teams,
  pairings,
  busy,
  onExclude,
  onRestore,
  onSync,
  onRegenerate,
}: TeamPoolProps) {
  const [search, setSearch] = useState('')

  const activeTeams = teams.filter((team) => team.status === 'active')
  const excludedTeams = teams.filter((team) => team.status !== 'active')

  const matchCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const pairing of pairings) {
      if (pairing.status === 'cancelled') continue
      counts.set(pairing.team_a_id, (counts.get(pairing.team_a_id) || 0) + 1)
      counts.set(pairing.team_b_id, (counts.get(pairing.team_b_id) || 0) + 1)
    }
    return counts
  }, [pairings])

  const hasLocked = pairings.some((pairing) => pairing.status === 'locked' || pairing.status === 'completed')

  const visible = activeTeams.filter((team) =>
    search.trim() ? team.team_name.toLowerCase().includes(search.trim().toLowerCase()) : true
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Users size={15} className="text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest text-white">
            Wheel Teams ({activeTeams.length})
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            {season.matches_per_team} matches each
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onSync}
            disabled={busy}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
          >
            <UserPlus size={12} /> Sync Registrations
          </button>
          <button
            onClick={onRegenerate}
            disabled={busy || hasLocked}
            title={hasLocked ? 'Unlock or delete all locked/completed pairings first' : 'Re-generate the full schedule'}
            className="inline-flex items-center gap-1.5 border border-amber-500/40 bg-amber-950/30 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-amber-400 transition hover:bg-amber-500 hover:text-black disabled:opacity-40"
          >
            <RefreshCw size={12} /> Regenerate
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-white/30" size={14} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams in the wheel…"
          className="w-full border border-white/10 bg-white/5 py-2 pl-9 pr-3 text-xs text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {visible.length === 0 && (
          <p className="w-full border border-white/10 p-4 text-center text-xs text-white/40">
            No active teams. Sync registrations or restore an excluded team.
          </p>
        )}

        {visible.map((team) => {
          const played = matchCounts.get(team.registration_id) || 0
          const complete = played >= season.matches_per_team
          return (
            <span
              key={team.id}
              className={`inline-flex max-w-full items-center gap-2 border px-2.5 py-1.5 text-[11px] font-bold ${
                complete
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300'
                  : 'border-white/15 bg-white/5 text-white/80'
              }`}
            >
              <span className="max-w-[180px] truncate">{team.team_name}</span>
              <span className="font-mono text-[10px] text-white/35">
                {played}/{season.matches_per_team}
              </span>
              <button
                onClick={() => onExclude(team.registration_id)}
                disabled={busy}
                title="Remove this team from the wheel (cancels its open pairings)"
                className="text-white/30 transition hover:text-red-500 disabled:opacity-40"
              >
                <X size={12} />
              </button>
            </span>
          )
        })}
      </div>

      {excludedTeams.length > 0 && (
        <div className="space-y-2 border border-red-900/30 bg-red-950/10 p-3">
          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-400">
            <UserMinus size={12} /> Excluded / Absent ({excludedTeams.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {excludedTeams.map((team) => (
              <span
                key={team.id}
                className="inline-flex max-w-full items-center gap-2 border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] text-white/45 line-through"
              >
                <span className="max-w-[180px] truncate">{team.team_name}</span>
                <button
                  onClick={() => onRestore(team.registration_id)}
                  disabled={busy}
                  title="Restore this team"
                  className="text-white/40 transition hover:text-emerald-400 disabled:opacity-40"
                >
                  <RotateCcw size={12} />
                </button>
              </span>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-[10px] leading-4 text-white/35">
            <AlertCircle size={11} className="mt-0.5 shrink-0" />
            Excluding a team cancels its scheduled/locked pairings. Completed results stay in the standings.
          </p>
        </div>
      )}
    </div>
  )
}
