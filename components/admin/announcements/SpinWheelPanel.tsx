'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Dices,
  Lock,
  RefreshCw,
  ShieldX,
  Sparkles,
} from 'lucide-react'
import type { LeaguePairing, LeagueSeason, LeagueSeasonTeam } from '../../../lib/types'
import { randomIndex } from '../../../lib/league'
import { cancelPairing, lockPairing, updateLeagueSeason } from '../../../lib/league-service'
import { Wheel } from './Wheel'
import { LockPairingModal } from './LockPairingModal'

interface SpinWheelPanelProps {
  season: LeagueSeason
  teams: LeagueSeasonTeam[]
  pairings: LeaguePairing[]
  busy?: boolean
  onRefresh: () => Promise<void> | void
  notify: (text: string, type?: 'success' | 'error') => void
}

export function SpinWheelPanel({ season, teams, pairings, busy, onRefresh, notify }: SpinWheelPanelProps) {
  const [spinning, setSpinning] = useState(false)
  const [targetIndex, setTargetIndex] = useState<number | null>(null)
  const [revealedId, setRevealedId] = useState<string | null>(null)
  const [lockTarget, setLockTarget] = useState<LeaguePairing | null>(null)
  const [lockBusy, setLockBusy] = useState(false)
  const [roundBusy, setRoundBusy] = useState(false)

  const pendingRef = useRef<string | null>(null)

  const activeIds = useMemo(
    () => new Set(teams.filter((team) => team.status === 'active').map((team) => team.registration_id)),
    [teams]
  )

  const lastRound = Math.max(season.matches_per_team, ...pairings.map((pairing) => pairing.round_number), 1)
  const currentRound = Math.min(season.current_round, lastRound)

  const roundPairings = useMemo(
    () => pairings.filter((pairing) => pairing.round_number === currentRound),
    [pairings, currentRound]
  )

  const roundActive = useMemo(
    () => roundPairings.filter((pairing) => pairing.status !== 'cancelled'),
    [roundPairings]
  )

  const pool = useMemo(
    () =>
      roundPairings.filter(
        (pairing) =>
          pairing.status === 'scheduled' && activeIds.has(pairing.team_a_id) && activeIds.has(pairing.team_b_id)
      ),
    [roundPairings, activeIds]
  )

  const lockedCount = roundActive.filter(
    (pairing) => pairing.status === 'locked' || pairing.status === 'completed'
  ).length

  const revealed = revealedId
    ? roundPairings.find(
        (pairing) => pairing.id === revealedId && pairing.status === 'scheduled'
      ) || null
    : null

  const teamName = (id: string) => teams.find((team) => team.registration_id === id)?.team_name || 'Unknown Team'

  const segments = useMemo(
    () =>
      pool.map((pairing) => ({
        id: pairing.id,
        label: `${shortName(teamName(pairing.team_a_id))} vs ${shortName(teamName(pairing.team_b_id))}`,
      })),
    // teamName is derived from `teams`; the pairings already change with it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pool, teams]
  )

  const spin = (excludeId?: string) => {
    if (spinning || pool.length === 0) return

    const candidates = excludeId ? pool.filter((pairing) => pairing.id !== excludeId) : pool
    if (candidates.length === 0) return

    const chosen = candidates[randomIndex(candidates.length)]
    const index = pool.findIndex((pairing) => pairing.id === chosen.id)
    if (index < 0) return

    pendingRef.current = chosen.id
    setRevealedId(null)
    setTargetIndex(index)
    setSpinning(true)
  }

  const handleSpinEnd = useCallback(() => {
    setSpinning(false)
    setRevealedId(pendingRef.current)
  }, [])

  const handleReSpin = () => {
    const previous = revealedId
    setRevealedId(null)
    setTargetIndex(null)
    window.setTimeout(() => spin(previous || undefined), 30)
  }

  const handleConfirmLock = async () => {
    if (!lockTarget) return
    setLockBusy(true)
    const result = await lockPairing(lockTarget.id)
    setLockBusy(false)

    if (!result.success) {
      notify(result.error || 'Could not lock the pairing.', 'error')
      return
    }

    notify(`Pairing locked: ${lockTarget.label || 'match'} — ${teamName(lockTarget.team_a_id)} vs ${teamName(lockTarget.team_b_id)}`)
    setLockTarget(null)
    setRevealedId(null)
    setTargetIndex(null)
    pendingRef.current = null
    await onRefresh()
  }

  const handleRemovePairing = async (pairing: LeaguePairing) => {
    if (!window.confirm('Remove this pairing from the wheel? The teams stay in the season and can be paired again later.')) {
      return
    }
    const result = await cancelPairing(pairing.id)
    if (!result.success) {
      notify(result.error || 'Could not remove the pairing.', 'error')
      return
    }
    notify('Pairing removed from the wheel.')
    setRevealedId(null)
    setTargetIndex(null)
    pendingRef.current = null
    await onRefresh()
  }

  const handleRoundChange = async (value: string) => {
    const round = parseInt(value, 10)
    if (!Number.isFinite(round) || round === currentRound) return
    setRoundBusy(true)
    const result = await updateLeagueSeason(season.id, { current_round: round })
    setRoundBusy(false)
    if (!result.success) {
      notify(result.error || 'Could not switch round.', 'error')
      return
    }
    setRevealedId(null)
    setTargetIndex(null)
    await onRefresh()
  }

  const handleNextRound = async () => {
    if (currentRound >= lastRound) return
    if (
      pool.length > 0 &&
      !window.confirm(
        `Round ${currentRound} still has ${pool.length} scheduled pairing(s). Advance to round ${currentRound + 1} anyway?`
      )
    ) {
      return
    }
    setRoundBusy(true)
    const result = await updateLeagueSeason(season.id, { current_round: currentRound + 1 })
    setRoundBusy(false)
    if (!result.success) {
      notify(result.error || 'Could not advance the round.', 'error')
      return
    }
    setRevealedId(null)
    setTargetIndex(null)
    await onRefresh()
  }

  const roundDone = pool.length === 0
  const seasonDone =
    pairings.length > 0 && pairings.every((pairing) => pairing.status === 'completed' || pairing.status === 'cancelled')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-white">
            <Dices size={15} className="text-red-500" /> Spin Wheel
          </span>

          <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
            Round
            <select
              value={currentRound}
              onChange={(event) => handleRoundChange(event.target.value)}
              disabled={roundBusy || busy}
              className="border border-white/15 bg-[#111] px-2 py-1 text-[11px] font-bold text-white focus:border-red-500 focus:outline-none"
            >
              {Array.from({ length: lastRound }, (_, index) => index + 1).map((round) => (
                <option key={round} value={round}>
                  {round} / {lastRound}
                </option>
              ))}
            </select>
          </label>

          <span className="inline-flex items-center gap-1 border border-amber-500/30 bg-amber-950/30 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-400">
            <Lock size={10} /> {lockedCount}/{roundActive.length} locked
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-white/35">
            {pool.length} pairings left in this round
          </span>
        </div>

        <button
          onClick={handleNextRound}
          disabled={roundBusy || busy || currentRound >= lastRound}
          className="inline-flex items-center justify-center gap-1.5 border border-white/15 bg-white/5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-40"
        >
          Next Round <ArrowRight size={12} />
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="flex flex-col items-center justify-center border border-white/10 bg-gradient-to-b from-[#120607] via-[#0b0b0d] to-black p-4 sm:p-6">
          <Wheel
            segments={segments}
            targetIndex={
              spinning
                ? targetIndex
                : revealed
                  ? pool.findIndex((pairing) => pairing.id === revealed.id)
                  : null
            }
            spinning={spinning}
            onSpinEnd={handleSpinEnd}
          />

          <button
            onClick={() => spin()}
            disabled={spinning || busy || pool.length === 0}
            className="mt-5 inline-flex w-full max-w-[280px] items-center justify-center gap-2 bg-red-600 px-6 py-3 font-display text-xs font-black uppercase tracking-[0.2em] text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {spinning ? (
              <>
                <RefreshCw size={14} className="animate-spin" /> Spinning…
              </>
            ) : (
              <>
                <Sparkles size={14} /> {revealed ? 'Spin Again' : 'Spin the Wheel'}
              </>
            )}
          </button>

          {pool.length === 0 && (
            <p className="mt-3 max-w-sm text-center text-[11px] leading-5 text-white/40">
              {seasonDone
                ? 'Every match has a result. Check the Results & Standings tab.'
                : roundDone && currentRound < lastRound
                  ? `Round ${currentRound} is complete. Start round ${currentRound + 1}.`
                  : roundDone
                    ? 'All rounds are complete. Enter the remaining results in Results & Standings.'
                    : roundPairings.length === 0
                      ? 'No pairings were generated for this round.'
                      : 'No eligible pairings left in this round.'}
            </p>
          )}
        </div>

        <div className="border border-white/10 bg-white/[0.03] p-4 sm:p-5">
          <p className="eyebrow mb-3">Spin Result</p>

          {!revealed && !spinning && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <Dices size={38} className="mb-3 text-white/15" />
              <p className="max-w-xs text-xs leading-5 text-white/40">
                The schedule is already generated. The wheel only decides which pre-made pairing is revealed next —
                it can never create a duplicate or a new opponent.
              </p>
            </div>
          )}

          {spinning && (
            <div className="flex h-full min-h-[220px] flex-col items-center justify-center text-center">
              <div className="mb-3 h-12 w-12 animate-pulse rounded-full border-2 border-red-600/50" />
              <p className="font-display text-sm font-black uppercase tracking-widest text-red-400">
                Drawing a pairing…
              </p>
            </div>
          )}

          {revealed && !spinning && (
            <div className="space-y-4">
              <div className="border border-amber-500/30 bg-amber-950/10 p-4 text-center">
                <p className="mb-2 font-mono text-[10px] tracking-widest text-amber-400">{revealed.label}</p>
                <div className="flex items-center justify-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-right font-display text-sm font-black uppercase text-white">
                    {teamName(revealed.team_a_id)}
                  </span>
                  <span className="shrink-0 border border-red-600/60 bg-red-950/50 px-2 py-0.5 text-[9px] font-black tracking-widest text-red-400">
                    VS
                  </span>
                  <span className="min-w-0 flex-1 truncate text-left font-display text-sm font-black uppercase text-white">
                    {teamName(revealed.team_b_id)}
                  </span>
                </div>
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-white/35">
                  Round {revealed.round_number} · Match {revealed.match_number}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setLockTarget(revealed)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  <CheckCircle2 size={14} /> Confirm &amp; Lock
                </button>
                <button
                  onClick={handleReSpin}
                  disabled={busy || pool.length < 2}
                  className="inline-flex items-center justify-center gap-2 border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-40"
                >
                  <RefreshCw size={13} /> Re-spin
                </button>
                <button
                  onClick={() => handleRemovePairing(revealed)}
                  disabled={busy}
                  className="inline-flex items-center justify-center gap-2 border border-red-800/60 bg-red-950/30 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white disabled:opacity-40"
                >
                  <ShieldX size={13} /> Team Absent — Remove Pairing
                </button>
              </div>

              <p className="flex items-start gap-1.5 text-[10px] leading-4 text-white/35">
                <AlertCircle size={11} className="mt-0.5 shrink-0" />
                Removing a pairing keeps both teams in the season so they can be scheduled again. To drop an absent
                team from every round, use the X on its chip in the team pool above.
              </p>
            </div>
          )}

          {pool.length > 12 && (
            <p className="mt-4 border-t border-white/10 pt-3 text-[10px] leading-4 text-white/35">
              {pool.length} pairings are in this round. The wheel is numbered — check the schedule list below for
              the full names.
            </p>
          )}
        </div>
      </div>

      <LockPairingModal
        isOpen={Boolean(lockTarget)}
        season={season}
        pairing={lockTarget}
        teamAName={lockTarget ? teamName(lockTarget.team_a_id) : ''}
        teamBName={lockTarget ? teamName(lockTarget.team_b_id) : ''}
        busy={lockBusy}
        onCancel={() => setLockTarget(null)}
        onConfirm={handleConfirmLock}
      />
    </div>
  )
}

function shortName(value: string): string {
  const trimmed = value.trim()
  return trimmed.length > 14 ? `${trimmed.slice(0, 13)}…` : trimmed
}
