'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Dices,
  Lock,
  Maximize2,
  Minimize2,
  RefreshCw,
  ShieldX,
  Sparkles,
  X,
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
  const [isFullscreen, setIsFullscreen] = useState(false)

  const pendingRef = useRef<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFullscreen])

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
    <div className="space-y-5">
      {/* Control Toolbar */}
      <div className="flex flex-col gap-3.5 border border-line-subtle bg-surface-2 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between shadow-md">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <span className="inline-flex items-center gap-2 text-sm sm:text-base font-extrabold uppercase tracking-wider text-ink">
            <Dices size={18} className="text-brand-bright" /> Spin Wheel
          </span>

          <label className="flex items-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-ink-subtle">
            Round
            <select
              value={currentRound}
              onChange={(event) => handleRoundChange(event.target.value)}
              disabled={roundBusy || busy}
              className="border border-line bg-surface px-3 py-1.5 text-xs sm:text-sm font-bold text-ink focus:border-brand focus:outline-none"
            >
              {Array.from({ length: lastRound }, (_, index) => index + 1).map((round) => (
                <option key={round} value={round}>
                  {round} / {lastRound}
                </option>
              ))}
            </select>
          </label>

          <span className="inline-flex items-center gap-1.5 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-bright">
            <Lock size={12} /> {lockedCount}/{roundActive.length} locked
          </span>
          <span className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
            {pool.length} pairings left
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Fullscreen Button */}
          <button
            onClick={() => setIsFullscreen(true)}
            className="btn-secondary btn-sm"
            title="Open fullscreen wheel"
          >
            <Maximize2 size={15} /> Fullscreen wheel
          </button>

          <button
            onClick={handleNextRound}
            disabled={roundBusy || busy || currentRound >= lastRound}
            className="btn-secondary btn-sm"
          >
            Next round <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Main Wheel Grid */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="card flex flex-col items-center justify-center p-5 sm:p-8">
          <div className="w-full flex justify-end mb-2">
            <button
              onClick={() => setIsFullscreen(true)}
              className="text-ink-subtle hover:text-ink flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider p-1 transition"
              title="Expand to Fullscreen"
            >
              <Maximize2 size={13} /> Fullscreen
            </button>
          </div>

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
            className="btn-primary mt-6 w-full max-w-[340px] px-8 py-3.5 text-sm sm:py-4 sm:text-base"
          >
            {spinning ? (
              <>
                <RefreshCw size={17} className="animate-spin" /> Spinning…
              </>
            ) : (
              <>
                <Sparkles size={17} /> {revealed ? 'Spin again' : 'Spin the wheel'}
              </>
            )}
          </button>

          {pool.length === 0 && (
            <p className="mt-4 max-w-sm text-center text-xs leading-5 text-ink-subtle">
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

        {/* Spin Result Column */}
        <div className="border border-line-subtle bg-surface-2 p-5 sm:p-6 shadow-xl flex flex-col justify-between">
          <div>
            <p className="eyebrow mb-4">Spin Result</p>

            {!revealed && !spinning && (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                <Dices size={46} className="mb-4 text-ink-subtle" />
                <p className="max-w-xs text-xs sm:text-sm leading-relaxed text-ink-subtle">
                  The schedule is already generated. The wheel only decides which pre-made pairing is revealed next —
                  it can never create a duplicate or a new opponent.
                </p>
              </div>
            )}

            {spinning && (
              <div className="flex h-full min-h-[260px] flex-col items-center justify-center text-center">
                <div className="mb-4 h-14 w-14 animate-pulse rounded-full border-2 border-brand" />
                <p className="font-display text-base sm:text-lg font-extrabold uppercase tracking-widest text-brand-bright">
                  Drawing a pairing…
                </p>
              </div>
            )}

            {revealed && !spinning && (
              <div className="space-y-5">
                <div className="border border-brand bg-brand-muted p-5 text-center">
                  <p className="mb-2.5 font-mono text-xs tracking-widest text-brand-bright">{revealed.label}</p>
                  <div className="flex items-center justify-center gap-3">
                    <span className="min-w-0 flex-1 truncate text-right font-display text-base sm:text-lg font-extrabold uppercase text-brand-bright">
                      {teamName(revealed.team_a_id)}
                    </span>
                    <span className="shrink-0 border border-brand bg-brand-muted px-2.5 py-1 text-xs font-extrabold tracking-widest text-brand-bright">
                      VS
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left font-display text-base sm:text-lg font-extrabold uppercase text-ink">
                      {teamName(revealed.team_b_id)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                    Round {revealed.round_number} · Match {revealed.match_number}
                  </p>
                </div>

                <div className="flex flex-col gap-2.5">
                  <button
                    onClick={() => setLockTarget(revealed)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 bg-surface-3 px-5 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink transition hover:bg-surface-3 disabled:opacity-50 shadow-md"
                  >
                    <CheckCircle2 size={16} /> Confirm &amp; Lock
                  </button>
                  <button
                    onClick={handleReSpin}
                    disabled={busy || pool.length < 2}
                    className="inline-flex items-center justify-center gap-2 border border-line bg-surface-2 px-5 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-wider text-ink transition hover:bg-surface-3 disabled:opacity-40"
                  >
                    <RefreshCw size={14} /> Re-spin
                  </button>
                  <button
                    onClick={() => handleRemovePairing(revealed)}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 border border-brand-border bg-brand-muted px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-bright transition hover:bg-brand hover:text-ink disabled:opacity-40"
                  >
                    <ShieldX size={14} /> Team Absent — Remove Pairing
                  </button>
                </div>

                <p className="flex items-start gap-1.5 text-xs sm:text-xs leading-4 text-ink-subtle">
                  <AlertCircle size={13} className="mt-0.5 shrink-0" />
                  Removing a pairing keeps both teams in the season so they can be scheduled again.
                </p>
              </div>
            )}
          </div>

          {pool.length > 12 && (
            <p className="mt-4 border-t border-line-subtle pt-3 text-xs leading-4 text-ink-subtle">
              {pool.length} pairings are in this round. The wheel is numbered — check the schedule list below for the full names.
            </p>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FULLSCREEN BIG SPIN WHEEL OVERLAY */}
      {/* ========================================================================= */}
      {isFullscreen && (
        <div className="fixed inset-0 z-[100] flex flex-col overflow-y-auto bg-canvas">
          {/* Top Bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-3.5 sm:px-8 sm:py-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-muted sm:h-12 sm:w-12">
                <Dices className="text-brand-bright" size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                  <p className="eyebrow !text-xs !tracking-[0.25em] text-brand-bright">
                    {season.name} • LIVE DRAW ARENA
                  </p>
                </div>
                <h2 className="font-display text-lg sm:text-2xl font-extrabold uppercase text-ink tracking-wide truncate">
                  TOURNAMENT MATCH WHEEL
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden lg:flex items-center gap-3 border border-line-subtle bg-canvas/50 px-4 py-2 text-xs">
                <span className="font-bold uppercase text-ink-subtle">Round</span>
                <span className="font-display text-sm font-extrabold text-brand-bright">{currentRound} / {lastRound}</span>
                <span className="text-ink-subtle">|</span>
                <span className="font-bold uppercase text-ink-subtle">Locked:</span>
                <span className="font-mono text-sm font-bold text-ink">{lockedCount}/{roundActive.length}</span>
                <span className="text-ink-subtle">|</span>
                <span className="font-bold uppercase text-ink-subtle">Pool:</span>
                <span className="font-mono text-sm font-bold text-brand-bright">{pool.length}</span>
              </div>

              <button
                onClick={() => setIsFullscreen(false)}
                className="btn-secondary btn-sm shrink-0"
                title="Exit fullscreen (or press ESC)"
              >
                <Minimize2 size={15} />
                <span className="hidden sm:inline">Exit fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Arena Layout */}
          <div className="flex-1 flex flex-col xl:flex-row items-center justify-center p-4 sm:p-8 lg:p-12 gap-8 lg:gap-14 max-w-[1700px] w-full mx-auto">
            {/* Center Big Wheel */}
            <div className="flex flex-col items-center justify-center w-full max-w-[720px]">
              <div className="relative p-2 sm:p-6 w-full flex justify-center">
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
                  isFullscreen={true}
                />
              </div>

              <button
                onClick={() => spin()}
                disabled={spinning || busy || pool.length === 0}
                className="btn-primary mt-6 w-full max-w-[460px] px-8 py-4 text-sm sm:mt-8 sm:px-12 sm:py-5 sm:text-base"
              >
                {spinning ? (
                  <>
                    <RefreshCw size={20} className="animate-spin" /> Spinning arena wheel…
                  </>
                ) : (
                  <>
                    <Sparkles size={20} /> {revealed ? 'Spin again' : 'Spin the wheel'}
                  </>
                )}
              </button>

              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-ink-subtle text-center">
                Tip: Press ESC key anytime to exit fullscreen
              </p>
            </div>

            {/* Matchup Announcement Panel */}
            <div className="w-full max-w-[560px]">
              {!revealed && !spinning && (
                <div className="card p-6 text-center sm:p-10">
                  <Dices size={42} className="mx-auto text-brand-bright" />
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold uppercase text-ink tracking-wide">
                    ROUND {currentRound} DRAW READY
                  </h3>
                  <p className="text-sm leading-relaxed text-ink-subtle max-w-md mx-auto">
                    Click &quot;SPIN THE WHEEL&quot; to pick the next pre-scheduled tournament matchup live on stream.
                  </p>
                  <div className="pt-4 border-t border-line-subtle grid grid-cols-2 gap-4 text-center">
                    <div className="bg-canvas/40 p-3.5 border border-line-subtle">
                      <span className="block text-xs uppercase font-bold text-ink-subtle">Pairings in Pool</span>
                      <span className="font-display text-2xl font-extrabold text-brand-bright">{pool.length}</span>
                    </div>
                    <div className="bg-canvas/40 p-3.5 border border-line-subtle">
                      <span className="block text-xs uppercase font-bold text-ink-subtle">Matches Locked</span>
                      <span className="font-display text-2xl font-extrabold text-ink">{lockedCount}</span>
                    </div>
                  </div>
                </div>
              )}

              {spinning && (
                <div className="card border-brand-border p-6 text-center sm:p-10">
                  <div className="mx-auto h-14 w-14 animate-spin rounded-full border-4 border-brand border-t-transparent" />
                  <p className="mt-4 text-lg font-semibold tracking-tight text-ink sm:text-xl">
                    Drawing pairing…
                  </p>
                  <p className="text-sm text-ink-subtle">Selecting a match from Round {currentRound} pool</p>
                </div>
              )}

              {revealed && !spinning && (
                <div className="card border-brand-border space-y-6 p-5 sm:p-7">
                  <div className="text-center">
                    <span className="inline-block border border-brand bg-brand-muted px-4 py-1.5 font-mono text-xs sm:text-sm font-extrabold tracking-widest text-brand-bright uppercase shadow-md mb-4">
                      {revealed.label || `Round ${revealed.round_number} · Match ${revealed.match_number}`}
                    </span>
                    <p className="eyebrow !text-xs mb-3 text-brand-bright">OFFICIAL MATCHUP DRAWN</p>
                    
                    <div className="space-y-3.5 my-4">
                      <div className="p-4 bg-canvas/60 border border-line-subtle shadow-inner">
                        <span className="text-xs sm:text-xs font-bold uppercase tracking-widest text-ink-subtle block mb-1">TEAM A</span>
                        <h4 className="font-display text-xl sm:text-3xl font-extrabold uppercase text-brand-bright truncate">
                          {teamName(revealed.team_a_id)}
                        </h4>
                      </div>

                      <div className="flex items-center justify-center">
                        <span className="border-2 border-brand bg-brand-muted px-5 py-1 font-display text-base sm:text-lg font-extrabold tracking-widest text-ink shadow-lg">
                          VS
                        </span>
                      </div>

                      <div className="p-4 bg-canvas/60 border border-line-subtle shadow-inner">
                        <span className="text-xs sm:text-xs font-bold uppercase tracking-widest text-ink-subtle block mb-1">TEAM B</span>
                        <h4 className="font-display text-xl sm:text-3xl font-extrabold uppercase text-ink truncate">
                          {teamName(revealed.team_b_id)}
                        </h4>
                      </div>
                    </div>

                    <p className="font-bold text-xs uppercase tracking-widest text-ink-subtle">
                      Round {revealed.round_number} &bull; Match {revealed.match_number}
                    </p>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => setLockTarget(revealed)}
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2.5 bg-surface-3 hover:bg-surface-3 px-6 py-4 text-sm sm:text-base font-extrabold uppercase tracking-widest text-ink transition shadow-lg hover:shadow-black/20"
                    >
                      <CheckCircle2 size={18} /> CONFIRM &amp; LOCK PAIRING
                    </button>
                    <button
                      onClick={handleReSpin}
                      disabled={busy || pool.length < 2}
                      className="w-full inline-flex items-center justify-center gap-2 border border-line bg-surface-2 hover:bg-surface-3 px-5 py-3 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-ink transition"
                    >
                      <RefreshCw size={15} /> RE-SPIN
                    </button>
                    <button
                      onClick={() => handleRemovePairing(revealed)}
                      disabled={busy}
                      className="w-full inline-flex items-center justify-center gap-2 border border-brand-border bg-brand-muted hover:bg-brand hover:text-ink px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-brand-bright transition"
                    >
                      <ShieldX size={14} /> Team Absent — Remove Pairing
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
