'use client'

import { Crown, Medal } from 'lucide-react'
import type { LeagueStanding } from '../../../lib/types'

interface StandingsTableProps {
  standings: LeagueStanding[]
  matchesPerTeam: number
}

export function StandingsTable({ standings, matchesPerTeam }: StandingsTableProps) {
  if (standings.length === 0) {
    return (
      <div className="rounded-lg border border-line-subtle p-6 text-center text-xs text-ink-subtle">
        No teams in this season yet.
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {standings.map((row) => {
          const complete = row.played >= matchesPerTeam
          return (
            <div
              key={row.teamId}
              className={`rounded-lg border p-3 ${
                row.rank === 1
                  ? 'border-brand bg-brand-muted'
                  : row.rank <= 3
                    ? 'border-line bg-surface-2'
                    : 'border-line-subtle bg-surface'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="inline-flex shrink-0 items-center gap-1 font-display text-xs font-extrabold text-ink-subtle">
                    {row.rank === 1 ? (
                      <Crown size={13} className="text-brand-bright" />
                    ) : row.rank <= 3 ? (
                      <Medal size={13} className="text-ink-muted" />
                    ) : null}
                    {String(row.rank).padStart(2, '0')}
                  </span>
                  <span className="truncate text-sm font-bold text-ink">{row.teamName}</span>
                  {complete && <span className="badge shrink-0">Done</span>}
                </div>
                <span className="shrink-0 font-display text-lg font-extrabold text-brand-bright">
                  {row.points}
                  <span className="ml-1 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
                    pts
                  </span>
                </span>
              </div>

              <div className="mt-2.5 grid grid-cols-5 gap-2 border-t border-line-subtle pt-2.5 text-xs">
                <div>
                  <span className="label block">P</span>
                  <span className="font-semibold text-ink">{row.played}</span>
                </div>
                <div>
                  <span className="label block">W-L</span>
                  <span className="font-semibold text-ink">
                    {row.wins}-{row.losses}
                  </span>
                </div>
                <div>
                  <span className="label block">R. lost</span>
                  <span className="font-mono font-semibold text-brand-bright">{row.roundsLost}</span>
                </div>
                <div>
                  <span className="label block">PF/PA</span>
                  <span className="font-semibold text-ink">
                    {row.scoreFor}/{row.scoreAgainst}
                  </span>
                </div>
                <div>
                  <span className="label block">Diff</span>
                  <span className="font-semibold text-ink">
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-lg border border-line-subtle md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line-subtle bg-surface-2 text-xs font-extrabold uppercase tracking-wider text-ink-subtle">
              <th className="px-3.5 py-3">#</th>
              <th className="px-3.5 py-3">Team</th>
              <th className="px-3.5 py-3 text-center">P</th>
              <th className="px-3.5 py-3 text-center">W</th>
              <th className="px-3.5 py-3 text-center">L</th>
              <th
                className="px-3.5 py-3 text-center text-brand-bright"
                title="Total Rounds Lost (Tie-breaker: team with more lost rounds stays at bottom)"
              >
                R. LOST
              </th>
              <th className="px-3.5 py-3 text-center">PF</th>
              <th className="px-3.5 py-3 text-center">PA</th>
              <th className="px-3.5 py-3 text-center">DIFF</th>
              <th className="px-3.5 py-3 text-center">PTS</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((row) => {
              const complete = row.played >= matchesPerTeam
              return (
                <tr
                  key={row.teamId}
                  className={`border-t border-line-subtle text-sm transition-colors hover:bg-surface ${
                    row.rank === 1
                      ? 'bg-brand-muted'
                      : row.rank === 2
                        ? 'bg-surface-2'
                        : row.rank === 3
                          ? 'bg-brand-muted'
                          : ''
                  }`}
                >
                  <td className="px-3.5 py-3">
                    <span className="inline-flex items-center gap-1.5 font-display text-base font-extrabold text-ink">
                      {row.rank === 1 ? (
                        <Crown size={15} className="text-brand-bright" />
                      ) : row.rank <= 3 ? (
                        <Medal size={15} className="text-ink-muted" />
                      ) : null}
                      {String(row.rank).padStart(2, '0')}
                    </span>
                  </td>
                  <td className="px-3.5 py-3">
                    <div className="flex items-center gap-2.5">
                      <span className="max-w-[280px] truncate text-sm font-bold text-ink sm:text-base">
                        {row.teamName}
                      </span>
                      {complete && <span className="badge">Done</span>}
                    </div>
                  </td>
                  <td className="px-3.5 py-3 text-center font-medium text-ink-muted">{row.played}</td>
                  <td className="px-3.5 py-3 text-center font-bold text-ink">{row.wins}</td>
                  <td className="px-3.5 py-3 text-center font-medium text-brand-bright">{row.losses}</td>
                  <td className="px-3.5 py-3 text-center font-mono font-bold text-brand-bright">
                    {row.roundsLost}
                  </td>
                  <td className="px-3.5 py-3 text-center text-ink-muted">{row.scoreFor}</td>
                  <td className="px-3.5 py-3 text-center text-ink-muted">{row.scoreAgainst}</td>
                  <td className="px-3.5 py-3 text-center font-medium text-ink">
                    {row.diff > 0 ? `+${row.diff}` : row.diff}
                  </td>
                  <td className="px-3.5 py-3 text-center font-display text-lg font-extrabold text-brand-bright">
                    {row.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
