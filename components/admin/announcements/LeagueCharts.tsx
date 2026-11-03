'use client'

import { useMemo } from 'react'
import { BarChart3, TrendingUp } from 'lucide-react'
import type { LeagueMatchResult, LeaguePairing, LeagueStanding } from '../../../lib/types'

interface LeagueChartsProps {
  standings: LeagueStanding[]
  pairings: LeaguePairing[]
  results: LeagueMatchResult[]
  maxRound: number
  winPoints: number
}

// Red and neutral only, with enough contrast to distinguish series.
const COLORS = [
  '#FF5A57',
  '#F5F7FA',
  '#D3100E',
  '#A0A7B3',
  '#FF8A88',
  '#7B8494',
  '#8F0B0A',
  '#C7CDD6',
]

export function LeagueCharts({ standings, pairings, results, maxRound, winPoints }: LeagueChartsProps) {
  const maxPoints = Math.max(...standings.map((row) => row.points), 1)

  const progression = useMemo(() => {
    const resultByPairing = new Map(results.map((result) => [result.pairing_id, result]))
    const rounds = Array.from({ length: Math.max(maxRound, 1) }, (_, index) => index + 1)

    const cumulative = new Map<string, number[]>()
    for (const row of standings) cumulative.set(row.teamId, rounds.map(() => 0))

    for (const pairing of pairings) {
      if (pairing.status !== 'completed') continue
      const result = resultByPairing.get(pairing.id)
      if (!result) continue
      const index = rounds.indexOf(pairing.round_number)
      if (index < 0) continue

      const winner = result.winner_id === pairing.team_a_id ? pairing.team_a_id : pairing.team_b_id
      const series = cumulative.get(winner)
      if (!series) continue
      series[index] += winPoints
    }

    // Convert to cumulative totals and only keep the top 8 teams.
    const withTotals = standings.slice(0, 8).map((row, index) => {
      const raw = cumulative.get(row.teamId) || rounds.map(() => 0)
      let running = 0
      const values = raw.map((value) => {
        running += value
        return running
      })
      return {
        teamId: row.teamId,
        name: row.teamName,
        color: COLORS[index % COLORS.length],
        values,
        total: running,
      }
    })

    return { rounds, series: withTotals }
  }, [standings, pairings, results, maxRound, winPoints])

  if (standings.length === 0) {
    return null
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="rounded-lg border border-line-subtle bg-surface-2 p-4">
        <p className="mb-4 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-ink-subtle">
          <BarChart3 size={13} className="text-brand-bright" /> Points by team
        </p>

        <div className="space-y-2">
          {standings.map((row) => (
            <div key={row.teamId} className="flex items-center gap-2 sm:gap-3">
              <span className="w-5 shrink-0 text-right font-mono text-xs text-ink-subtle">{row.rank}</span>
              <span className="w-24 shrink-0 truncate text-xs font-bold text-ink-muted sm:w-44">{row.teamName}</span>
              <div className="h-4 min-w-0 flex-1 rounded-sm bg-canvas/70">
                <div
                  className="h-full transition-[width] duration-500"
                  style={{
                    width: `${Math.max((row.points / maxPoints) * 100, row.points > 0 ? 4 : 0)}%`,
                    backgroundColor:
                      row.rank === 1
                        ? '#FF5A57'
                        : row.rank === 2
                          ? '#F5F7FA'
                          : row.rank === 3
                            ? '#D3100E'
                            : '#343A45',
                    opacity: row.rank <= 3 ? 1 : 0.8,
                  }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-display text-xs font-extrabold text-ink">{row.points}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-line-subtle bg-surface-2 p-4">
        <p className="mb-2 flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-ink-subtle">
          <TrendingUp size={13} className="text-brand-bright" /> Points progression (top 8)
        </p>

        {progression.series.every((team) => team.total === 0) ? (
          <div className="flex h-[240px] items-center justify-center text-center text-xs text-ink-subtle">
            Enter match results to see the progression graph.
          </div>
        ) : (
          <>
            <ProgressionChart rounds={progression.rounds} series={progression.series} />
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {progression.series.map((team) => (
                <span key={team.teamId} className="inline-flex max-w-[180px] items-center gap-1.5 text-xs text-ink-subtle">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
                  <span className="truncate">{team.name}</span>
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function ProgressionChart({
  rounds,
  series,
}: {
  rounds: number[]
  series: Array<{ teamId: string; name: string; color: string; values: number[]; total: number }>
}) {
  const width = 640
  const height = 260
  const padLeft = 34
  const padRight = 14
  const padTop = 12
  const padBottom = 26

  const yMax = Math.max(...series.flatMap((team) => team.values), 1)
  const innerWidth = width - padLeft - padRight
  const innerHeight = height - padTop - padBottom

  const x = (index: number) =>
    rounds.length <= 1
      ? padLeft + innerWidth / 2
      : padLeft + (index / (rounds.length - 1)) * innerWidth
  const y = (value: number) => padTop + innerHeight - (value / yMax) * innerHeight

  const gridValues = Array.from(
    new Set(Array.from({ length: 5 }, (_, index) => Math.round((yMax / 4) * index)))
  )

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Points progression chart">
      {gridValues.map((value) => (
        <g key={value}>
          <line
            x1={padLeft}
            x2={width - padRight}
            y1={y(value)}
            y2={y(value)}
            stroke="rgba(255,255,255,0.08)"
            strokeDasharray="3 4"
          />
          <text x={padLeft - 6} y={y(value) + 3} textAnchor="end" fill="#7B8494" fontSize="10">
            {value}
          </text>
        </g>
      ))}

      {rounds.map((round, index) => (
        <text
          key={round}
          x={x(index)}
          y={height - 8}
          textAnchor="middle"
          fill="#7B8494"
          fontSize="10"
          fontWeight="600"
        >
          R{round}
        </text>
      ))}

      {series.map((team) => (
        <g key={team.teamId}>
          <polyline
            fill="none"
            stroke={team.color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={team.values.map((value, index) => `${x(index)},${y(value)}`).join(' ')}
            opacity="0.9"
          />
          {team.values.map((value, index) => (
            <circle key={index} cx={x(index)} cy={y(value)} r="2.5" fill={team.color} />
          ))}
        </g>
      ))}
    </svg>
  )
}
