'use client'

import { useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  Edit2,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  Unlock,
  X,
} from 'lucide-react'
import type { LeagueMatchResult, LeaguePairing, LeagueSeason, LeagueSeasonTeam } from '../../../lib/types'
import { usedRounds, validatePairing } from '../../../lib/league'
import {
  cancelPairing,
  createPairing,
  deleteMatchResult,
  deletePairing,
  restorePairing,
  updatePairing,
} from '../../../lib/league-service'

interface PairingsListProps {
  season: LeagueSeason
  teams: LeagueSeasonTeam[]
  pairings: LeaguePairing[]
  results: LeagueMatchResult[]
  busy?: boolean
  onRefresh: () => Promise<void> | void
  notify: (text: string, type?: 'success' | 'error') => void
}

interface EditorState {
  mode: 'add' | 'edit'
  pairing?: LeaguePairing
  round: string
  teamA: string
  teamB: string
}

const STATUS_STYLES: Record<string, string> = {
  scheduled: 'border-white/15 bg-white/5 text-white/50',
  locked: 'border-amber-500/40 bg-amber-950/40 text-amber-400',
  completed: 'border-emerald-500/40 bg-emerald-950/30 text-emerald-400',
  cancelled: 'border-red-900/40 bg-red-950/20 text-red-400/70',
}

export function PairingsList({
  season,
  teams,
  pairings,
  results,
  busy,
  onRefresh,
  notify,
}: PairingsListProps) {
  const [showAll, setShowAll] = useState(false)
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [editorError, setEditorError] = useState('')
  const [saving, setSaving] = useState(false)

  const activeTeams = teams.filter((team) => team.status === 'active')
  const maxRound = Math.max(season.matches_per_team + 1, ...pairings.map((pairing) => pairing.round_number), 1)
  const resultByPairing = useMemo(
    () => new Map(results.map((result) => [result.pairing_id, result])),
    [results]
  )

  const rounds = useMemo(() => {
    const all = usedRounds(pairings)
    if (!all.includes(season.current_round)) all.push(season.current_round)
    return all.sort((a, b) => a - b)
  }, [pairings, season.current_round])

  const visibleRounds = showAll ? rounds : [season.current_round]

  const teamName = (id: string) => teams.find((team) => team.registration_id === id)?.team_name || 'Unknown Team'

  const openEditor = (state: EditorState) => {
    setEditorError('')
    setEditor(state)
  }

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editor) return

    const round = parseInt(editor.round, 10)
    const validation = validatePairing({
      teamAId: editor.teamA,
      teamBId: editor.teamB,
      round,
      pairings,
      matchesPerTeam: season.matches_per_team,
      maxRound,
      excludeId: editor.pairing?.id,
    })

    if (!validation.ok) {
      setEditorError(validation.error || 'Invalid pairing.')
      return
    }

    setSaving(true)
    const result =
      editor.mode === 'add'
        ? await createPairing({
            seasonId: season.id,
            round,
            teamAId: editor.teamA,
            teamBId: editor.teamB,
          })
        : await updatePairing({
            pairingId: editor.pairing!.id,
            round,
            teamAId: editor.teamA,
            teamBId: editor.teamB,
          })
    setSaving(false)

    if (!result.success) {
      setEditorError(result.error || 'Could not save the pairing.')
      return
    }

    notify(editor.mode === 'add' ? 'Pairing added to the schedule.' : 'Pairing updated.')
    setEditor(null)
    await onRefresh()
  }

  const handleCancelPairing = async (pairing: LeaguePairing) => {
    if (!window.confirm(`Remove ${teamName(pairing.team_a_id)} vs ${teamName(pairing.team_b_id)} from the wheel?`)) {
      return
    }
    const result = await cancelPairing(pairing.id)
    if (!result.success) return notify(result.error || 'Could not remove the pairing.', 'error')
    notify('Pairing removed from the wheel.')
    await onRefresh()
  }

  const handleRestore = async (pairing: LeaguePairing) => {
    const result = await restorePairing(pairing.id)
    if (!result.success) return notify(result.error || 'Could not restore the pairing.', 'error')
    notify('Pairing restored to the wheel.')
    await onRefresh()
  }

  const handleDeleteResult = async (pairing: LeaguePairing) => {
    if (!window.confirm('Delete this result? The pairing will return to LOCKED.')) return
    const result = await deleteMatchResult(pairing.id)
    if (!result.success) return notify(result.error || 'Could not delete the result.', 'error')
    notify('Result deleted.')
    await onRefresh()
  }

  const handleDeletePairing = async (pairing: LeaguePairing) => {
    const hasResult = Boolean(resultByPairing.get(pairing.id))
    const warning = hasResult
      ? 'This pairing has a result. Deleting it also deletes the result and removes both teams from this round. Continue?'
      : 'Delete this pairing permanently?'
    if (!window.confirm(warning)) return

    const result = await deletePairing(pairing.id)
    if (!result.success) return notify(result.error || 'Could not delete the pairing.', 'error')
    notify('Pairing deleted.')
    await onRefresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ArrowLeftRight size={15} className="text-red-500" />
          <span className="text-xs font-black uppercase tracking-widest text-white">
            Schedule &amp; Locked Pairings ({pairings.length})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10"
          >
            <ChevronDown size={12} /> {showAll ? 'Current Round Only' : 'Show All Rounds'}
          </button>
          <button
            onClick={() =>
              openEditor({
                mode: 'add',
                round: String(season.current_round),
                teamA: '',
                teamB: '',
              })
            }
            disabled={busy || activeTeams.length < 2}
            className="inline-flex items-center gap-1.5 border border-red-600 bg-red-600 px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-40"
          >
            <Plus size={12} /> Add Pairing
          </button>
        </div>
      </div>

      {visibleRounds.map((round) => {
        const roundPairings = pairings
          .filter((pairing) => pairing.round_number === round)
          .sort((a, b) => a.match_number - b.match_number)

        return (
          <div key={round} className="space-y-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <p className="eyebrow">Round {round}</p>
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                {roundPairings.filter((p) => p.status === 'locked' || p.status === 'completed').length}/
                {roundPairings.filter((p) => p.status !== 'cancelled').length} locked
              </p>
            </div>

            {roundPairings.length === 0 && (
              <p className="border border-white/10 p-4 text-center text-xs text-white/35">
                No pairings scheduled for this round.
              </p>
            )}

            {roundPairings.map((pairing) => {
              const result = resultByPairing.get(pairing.id)
              return (
                <div
                  key={pairing.id}
                  className={`flex flex-col gap-3 border p-3 sm:flex-row sm:items-center sm:justify-between ${
                    pairing.status === 'completed'
                      ? 'border-emerald-500/20 bg-emerald-950/10'
                      : pairing.status === 'locked'
                        ? 'border-amber-500/20 bg-amber-950/10'
                        : pairing.status === 'cancelled'
                          ? 'border-red-900/20 bg-red-950/10 opacity-70'
                          : 'border-white/10 bg-white/[0.03]'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="shrink-0 font-mono text-[10px] font-bold tracking-wider text-amber-400/80">
                      {pairing.label || `R${pairing.round_number}-M${pairing.match_number}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-right text-xs font-bold text-white">
                      {teamName(pairing.team_a_id)}
                    </span>
                    <div className="shrink-0 flex flex-col items-center">
                      <span className="font-display text-[10px] font-black text-white/50">
                        {result ? `${result.team_a_score} – ${result.team_b_score}` : 'VS'}
                      </span>
                      {result &&
                        ((result.team_a_rounds_lost ?? 0) > 0 || (result.team_b_rounds_lost ?? 0) > 0) && (
                          <span className="text-[8px] font-mono text-amber-300/80">
                            Lost: {result.team_a_rounds_lost ?? 0}–{result.team_b_rounds_lost ?? 0}
                          </span>
                        )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-left text-xs font-bold text-white">
                      {teamName(pairing.team_b_id)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1 border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        STATUS_STYLES[pairing.status]
                      }`}
                    >
                      {pairing.status === 'locked' && <Lock size={9} />}
                      {pairing.status === 'completed' && <CheckCircle2 size={9} />}
                      {pairing.status}
                    </span>

                    {pairing.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancelPairing(pairing)}
                        className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:border-red-600 hover:text-red-400"
                        title="Remove from the wheel"
                      >
                        Remove
                      </button>
                    )}

                    {pairing.status === 'locked' && (
                      <button
                        onClick={() => handleRestore(pairing)}
                        className="inline-flex items-center gap-1 border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/60 transition hover:border-amber-500 hover:text-amber-400"
                        title="Return to the wheel"
                      >
                        <Unlock size={9} /> Unlock
                      </button>
                    )}

                    {pairing.status === 'cancelled' && (
                      <button
                        onClick={() => handleRestore(pairing)}
                        className="inline-flex items-center gap-1 border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/60 transition hover:border-emerald-500 hover:text-emerald-400"
                      >
                        <RotateCcw size={9} /> Restore
                      </button>
                    )}

                    {pairing.status === 'completed' && result && (
                      <button
                        onClick={() => handleDeleteResult(pairing)}
                        className="border border-white/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-white/50 transition hover:border-red-600 hover:text-red-400"
                      >
                        Delete Result
                      </button>
                    )}

                    {(pairing.status === 'scheduled' || pairing.status === 'locked') && (
                      <button
                        onClick={() =>
                          openEditor({
                            mode: 'edit',
                            pairing,
                            round: String(pairing.round_number),
                            teamA: pairing.team_a_id,
                            teamB: pairing.team_b_id,
                          })
                        }
                        className="border border-white/10 p-1 text-white/45 transition hover:border-amber-500 hover:text-amber-400"
                        title="Edit pairing"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeletePairing(pairing)}
                      className="border border-white/10 p-1 text-white/45 transition hover:border-red-600 hover:text-red-400"
                      title="Delete pairing"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )
      })}

      {editor && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md border border-red-700/60 bg-[#0c0c0e] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">
                {editor.mode === 'add' ? 'Add Pairing' : 'Edit Pairing'}
              </h3>
              <button
                onClick={() => setEditor(null)}
                className="text-white/40 transition hover:text-white"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              {editorError && (
                <div className="flex items-start gap-2 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{editorError}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">Round</label>
                <select
                  value={editor.round}
                  onChange={(event) => setEditor({ ...editor, round: event.target.value })}
                  className="w-full border border-white/15 bg-[#111] px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                >
                  {Array.from({ length: maxRound }, (_, index) => index + 1).map((round) => (
                    <option key={round} value={round}>
                      Round {round}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Team A
                  </label>
                  <select
                    value={editor.teamA}
                    onChange={(event) => setEditor({ ...editor, teamA: event.target.value })}
                    className="w-full border border-white/15 bg-[#111] px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Select team…</option>
                    {activeTeams.map((team) => (
                      <option key={team.registration_id} value={team.registration_id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">
                    Team B
                  </label>
                  <select
                    value={editor.teamB}
                    onChange={(event) => setEditor({ ...editor, teamB: event.target.value })}
                    className="w-full border border-white/15 bg-[#111] px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                  >
                    <option value="">Select team…</option>
                    {activeTeams.map((team) => (
                      <option key={team.registration_id} value={team.registration_id}>
                        {team.team_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <p className="text-[11px] leading-5 text-white/40">
                The same two teams can only meet once per season, and a team can only appear once per round.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={saving}
                  className="flex-1 border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editor.teamA || !editor.teamB}
                  className="flex-1 bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save Pairing'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
