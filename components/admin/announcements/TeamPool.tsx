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
      <div className="flex flex-col gap-3.5 border border-line-subtle bg-surface-2 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <Users size={18} className="text-brand-bright" />
          <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-ink">
            Wheel Teams ({activeTeams.length})
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
            {season.matches_per_team} matches each
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onSync}
            disabled={busy}
            className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-ink transition hover:bg-surface-3 disabled:opacity-50"
          >
            <UserPlus size={14} /> Sync Registrations
          </button>
          <button
            onClick={onRegenerate}
            disabled={busy || hasLocked}
            title={hasLocked ? 'Unlock or delete all locked/completed pairings first' : 'Re-generate the full schedule'}
            className="inline-flex items-center gap-2 border border-brand bg-brand-muted px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-brand-bright transition hover:bg-brand hover:text-ink disabled:opacity-40"
          >
            <RefreshCw size={14} /> Regenerate
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-3 text-ink-subtle" size={16} />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search teams in the wheel…"
          className="w-full border border-line bg-surface-2 py-2.5 pl-10 pr-4 text-sm text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2.5">
        {visible.length === 0 && (
          <p className="w-full border border-line-subtle p-5 text-center text-sm text-ink-subtle">
            No active teams. Sync registrations or restore an excluded team.
          </p>
        )}

        {visible.map((team) => {
          const played = matchCounts.get(team.registration_id) || 0
          const complete = played >= season.matches_per_team
          return (
            <span
              key={team.id}
              className={`inline-flex max-w-full items-center gap-2.5 border px-3 py-2 text-xs sm:text-sm font-bold shadow-sm ${
                complete
                  ? 'border-line-strong bg-surface-3 text-ink'
                  : 'border-line bg-surface-2 text-ink'
              }`}
            >
              <span className="max-w-[200px] truncate">{team.team_name}</span>
              <span className="font-mono text-xs text-ink-subtle">
                {played}/{season.matches_per_team}
              </span>
              <button
                onClick={() => onExclude(team.registration_id)}
                disabled={busy}
                title="Remove this team from the wheel (cancels its open pairings)"
                className="text-ink-subtle transition hover:text-brand-bright p-0.5 disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </span>
          )
        })}
      </div>

      {excludedTeams.length > 0 && (
        <div className="space-y-3 border border-brand-border bg-brand-muted p-4">
          <p className="flex items-center gap-2 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-brand-bright">
            <UserMinus size={15} /> Excluded / Absent ({excludedTeams.length})
          </p>
          <div className="flex flex-wrap gap-2.5">
            {excludedTeams.map((team) => (
              <span
                key={team.id}
                className="inline-flex max-w-full items-center gap-2 border border-line-subtle bg-canvas/40 px-3 py-1.5 text-xs text-ink-subtle line-through"
              >
                <span className="max-w-[180px] truncate">{team.team_name}</span>
                <button
                  onClick={() => onRestore(team.registration_id)}
                  disabled={busy}
                  title="Restore this team"
                  className="text-ink-subtle transition hover:text-ink p-0.5 disabled:opacity-40"
                >
                  <RotateCcw size={14} />
                </button>
              </span>
            ))}
          </div>
          <p className="flex items-start gap-1.5 text-xs leading-4 text-ink-subtle">
            <AlertCircle size={13} className="mt-0.5 shrink-0" />
            Excluding a team cancels its scheduled/locked pairings. Completed results stay in the standings.
          </p>
        </div>
      )}
    </div>
  )
}
