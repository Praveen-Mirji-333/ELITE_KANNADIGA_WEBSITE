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
      <div className="border border-white/10 p-6 text-center text-xs text-white/40">
        No teams in this season yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto border border-white/10">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <thead>
          <tr className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/40">
            <th className="px-3 py-2.5">#</th>
            <th className="px-3 py-2.5">Team</th>
            <th className="px-3 py-2.5 text-center">P</th>
            <th className="px-3 py-2.5 text-center">W</th>
            <th className="px-3 py-2.5 text-center">L</th>
            <th className="px-3 py-2.5 text-center">PF</th>
            <th className="px-3 py-2.5 text-center">PA</th>
            <th className="px-3 py-2.5 text-center">DIFF</th>
            <th className="px-3 py-2.5 text-center">PTS</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row) => {
            const complete = row.played >= matchesPerTeam
            return (
              <tr
                key={row.teamId}
                className={`border-t border-white/5 text-xs ${
                  row.rank === 1
                    ? 'bg-amber-950/20'
                    : row.rank === 2
                      ? 'bg-slate-800/20'
                      : row.rank === 3
                        ? 'bg-orange-950/15'
                        : ''
                }`}
              >
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-1 font-display text-sm font-black text-white/70">
                    {row.rank === 1 ? (
                      <Crown size={13} className="text-amber-400" />
                    ) : row.rank <= 3 ? (
                      <Medal size={13} className="text-white/50" />
                    ) : null}
                    {String(row.rank).padStart(2, '0')}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="max-w-[260px] truncate font-bold text-white">{row.teamName}</span>
                    {complete && (
                      <span className="border border-emerald-500/30 bg-emerald-950/30 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-emerald-400">
                        Done
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-center text-white/60">{row.played}</td>
                <td className="px-3 py-2.5 text-center font-bold text-emerald-400">{row.wins}</td>
                <td className="px-3 py-2.5 text-center text-red-400/80">{row.losses}</td>
                <td className="px-3 py-2.5 text-center text-white/60">{row.scoreFor}</td>
                <td className="px-3 py-2.5 text-center text-white/60">{row.scoreAgainst}</td>
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
  )
}
