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
  scheduled: 'border-line bg-surface-2 text-ink-subtle',
  locked: 'border-brand bg-brand-muted text-brand-bright',
  completed: 'border-line-strong bg-surface-3 text-ink',
  cancelled: 'border-brand-border bg-brand-muted text-brand-bright',
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
    <div className="space-y-5">
      <div className="flex flex-col gap-3.5 border border-line-subtle bg-surface-2 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <ArrowLeftRight size={18} className="text-brand-bright" />
          <span className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-ink">
            Schedule &amp; Locked Pairings ({pairings.length})
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center gap-2 border border-line bg-surface-2 px-3.5 py-2 text-xs font-extrabold uppercase tracking-wider text-ink transition hover:bg-surface-3"
          >
            <ChevronDown size={14} /> {showAll ? 'Current Round Only' : 'Show All Rounds'}
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
            className="inline-flex items-center gap-2 border border-brand bg-brand px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-ink transition hover:bg-brand disabled:opacity-40 shadow-sm"
          >
            <Plus size={14} /> Add Pairing
          </button>
        </div>
      </div>

      {visibleRounds.map((round) => {
        const roundPairings = pairings
          .filter((pairing) => pairing.round_number === round)
          .sort((a, b) => a.match_number - b.match_number)

        return (
          <div key={round} className="space-y-3">
            <div className="flex items-center justify-between border-b border-line-subtle pb-2.5">
              <p className="eyebrow !text-xs">Round {round}</p>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-subtle">
                {roundPairings.filter((p) => p.status === 'locked' || p.status === 'completed').length}/
                {roundPairings.filter((p) => p.status !== 'cancelled').length} locked
              </p>
            </div>

            {roundPairings.length === 0 && (
              <p className="border border-line-subtle p-5 text-center text-sm text-ink-subtle">
                No pairings scheduled for this round.
              </p>
            )}

            {roundPairings.map((pairing) => {
              const result = resultByPairing.get(pairing.id)
              return (
                <div
                  key={pairing.id}
                  className={`flex flex-col gap-3.5 border p-3.5 sm:flex-row sm:items-center sm:justify-between transition-colors ${
                    pairing.status === 'completed'
                      ? 'border-line-strong bg-surface-3'
                      : pairing.status === 'locked'
                        ? 'border-brand bg-brand-muted'
                        : pairing.status === 'cancelled'
                          ? 'border-brand-border bg-brand-muted opacity-70'
                          : 'border-line-subtle bg-surface-2 hover:bg-ink/[0.05]'
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="shrink-0 font-mono text-xs font-bold tracking-wider text-brand-bright">
                      {pairing.label || `R${pairing.round_number}-M${pairing.match_number}`}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-right text-xs sm:text-sm font-bold text-brand-bright">
                      {teamName(pairing.team_a_id)}
                    </span>
                    <div className="shrink-0 flex flex-col items-center px-1">
                      <span className="font-display text-xs sm:text-sm font-extrabold text-ink-muted">
                        {result ? `${result.team_a_score} – ${result.team_b_score}` : 'VS'}
                      </span>
                      {result &&
                        ((result.team_a_rounds_lost ?? 0) > 0 || (result.team_b_rounds_lost ?? 0) > 0) && (
                          <span className="text-xs font-mono text-brand-bright">
                            Lost: {result.team_a_rounds_lost ?? 0}–{result.team_b_rounds_lost ?? 0}
                          </span>
                        )}
                    </div>
                    <span className="min-w-0 flex-1 truncate text-left text-xs sm:text-sm font-bold text-ink">
                      {teamName(pairing.team_b_id)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span
                      className={`inline-flex items-center gap-1.5 border px-2.5 py-1 text-xs sm:text-xs font-extrabold uppercase tracking-wider ${
                        STATUS_STYLES[pairing.status]
                      }`}
                    >
                      {pairing.status === 'locked' && <Lock size={11} />}
                      {pairing.status === 'completed' && <CheckCircle2 size={11} />}
                      {pairing.status}
                    </span>

                    {pairing.status === 'scheduled' && (
                      <button
                        onClick={() => handleCancelPairing(pairing)}
                        className="border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-brand hover:text-brand-bright"
                        title="Remove from the wheel"
                      >
                        Remove
                      </button>
                    )}

                    {pairing.status === 'locked' && (
                      <button
                        onClick={() => handleRestore(pairing)}
                        className="inline-flex items-center gap-1 border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-brand hover:text-brand-bright"
                        title="Return to the wheel"
                      >
                        <Unlock size={11} /> Unlock
                      </button>
                    )}

                    {pairing.status === 'cancelled' && (
                      <button
                        onClick={() => handleRestore(pairing)}
                        className="inline-flex items-center gap-1 border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-line-strong hover:text-ink"
                      >
                        <RotateCcw size={11} /> Restore
                      </button>
                    )}

                    {pairing.status === 'completed' && result && (
                      <button
                        onClick={() => handleDeleteResult(pairing)}
                        className="border border-line px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-ink-muted transition hover:border-brand hover:text-brand-bright"
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
                        className="border border-line-subtle p-1 text-ink-subtle transition hover:border-brand hover:text-brand-bright"
                        title="Edit pairing"
                      >
                        <Edit2 size={11} />
                      </button>
                    )}

                    <button
                      onClick={() => handleDeletePairing(pairing)}
                      className="border border-line-subtle p-1 text-ink-subtle transition hover:border-brand hover:text-brand-bright"
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
        <div className="modal-overlay">
          <div className="modal-panel max-w-md">
            <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4">
              <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-ink">
                {editor.mode === 'add' ? 'Add Pairing' : 'Edit Pairing'}
              </h3>
              <button
                onClick={() => setEditor(null)}
                className="text-ink-subtle transition hover:text-ink"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 p-5">
              {editorError && (
                <div className="flex items-start gap-2 rounded-md border border-brand bg-brand-muted p-3 text-xs text-brand-bright">
                  <AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{editorError}</span>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-subtle">Round</label>
                <select
                  value={editor.round}
                  onChange={(event) => setEditor({ ...editor, round: event.target.value })}
                  className="field h-10 text-sm"
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-subtle">
                    Team A
                  </label>
                  <select
                    value={editor.teamA}
                    onChange={(event) => setEditor({ ...editor, teamA: event.target.value })}
                    className="field h-10 text-sm"
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
                  <label className="mb-1 block text-xs font-bold uppercase tracking-widest text-ink-subtle">
                    Team B
                  </label>
                  <select
                    value={editor.teamB}
                    onChange={(event) => setEditor({ ...editor, teamB: event.target.value })}
                    className="field h-10 text-sm"
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

              <p className="text-xs leading-5 text-ink-subtle">
                The same two teams can only meet once per season, and a team can only appear once per round.
              </p>

              <div className="grid grid-cols-1 gap-2 pt-1 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditor(null)}
                  disabled={saving}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !editor.teamA || !editor.teamB}
                  className="btn-primary w-full whitespace-nowrap"
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
