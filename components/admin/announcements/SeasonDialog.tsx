'use client'

import { useEffect, useState } from 'react'
import { AlertCircle, Calendar, CheckCircle2, Plus, Users, X } from 'lucide-react'
import type { Tournament } from '../../../lib/types'
import { createLeagueSeason, fetchTournamentTeamCount } from '../../../lib/league-service'

interface SeasonDialogProps {
  isOpen: boolean
  tournament: Tournament | null
  nextSeasonNumber: number
  onClose: () => void
  onCreated: (payload: { seasonId: string; message: string }) => void
}

export function SeasonDialog({ isOpen, tournament, nextSeasonNumber, onClose, onCreated }: SeasonDialogProps) {
  const [name, setName] = useState('')
  const [matchesPerTeam, setMatchesPerTeam] = useState('5')
  const [winPoints, setWinPoints] = useState('3')
  const [teamCount, setTeamCount] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [created, setCreated] = useState<{
    summary: string
    warnings: string[]
  } | null>(null)

  useEffect(() => {
    if (!isOpen) {
      setCreated(null)
      return
    }
    // Keep the success panel visible while the parent refreshes the season
    // list (which changes nextSeasonNumber right after a season is created).
    if (!tournament || created) return

    setName(`Season ${nextSeasonNumber}`)
    setMatchesPerTeam('5')
    setWinPoints('3')
    setError('')
    setTeamCount(null)

    let active = true
    fetchTournamentTeamCount(tournament.id).then((count) => {
      if (active) setTeamCount(count)
    })
    return () => {
      active = false
    }
  }, [isOpen, tournament, nextSeasonNumber, created])

  if (!isOpen || !tournament) return null

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setBusy(true)

    const target = Math.max(1, parseInt(matchesPerTeam, 10) || 5)
    const points = Math.max(1, parseInt(winPoints, 10) || 3)

    const result = await createLeagueSeason({
      tournamentId: tournament.id,
      seasonNumber: nextSeasonNumber,
      name: name.trim() || `Season ${nextSeasonNumber}`,
      matchesPerTeam: target,
      winPoints: points,
    })

    setBusy(false)

    if (!result.success || !result.data?.season) {
      setError(result.error || 'Could not create the season.')
      return
    }

    const warnings: string[] = result.data.warnings || []
    const summary = `${result.data.season.name}: ${result.data.teamCount} teams, ${result.data.matchCount} matches, ${result.data.roundCount} rounds.`

    setCreated({ summary, warnings })
    onCreated({ seasonId: result.data.season.id, message: summary })
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg border border-red-700/60 bg-[#0c0c0e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-red-500" size={17} />
            <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">Create New Season</h3>
          </div>
          <button onClick={onClose} className="text-white/40 transition hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {created ? (
          <div className="space-y-4 p-5">
            <div className="border border-emerald-500/40 bg-emerald-950/20 p-4">
              <p className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-emerald-400">
                <CheckCircle2 size={17} /> Season Created
              </p>
              <p className="mt-2 text-xs leading-5 text-white/60">{created.summary}</p>
              {created.warnings.length > 0 && (
                <div className="mt-3 space-y-1.5 border-t border-emerald-500/20 pt-3">
                  {created.warnings.map((warning) => (
                    <p
                      key={warning}
                      className="flex items-start gap-1.5 text-[11px] leading-5 text-amber-300/90"
                    >
                      <AlertCircle size={12} className="mt-0.5 shrink-0" /> {warning}
                    </p>
                  ))}
                </div>
              )}
            </div>

            <p className="text-[11px] leading-5 text-white/40">
              The full schedule is already generated and waiting in the pairings list. Open the season to review it.
            </p>

            <button
              onClick={onClose}
              className="w-full bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500"
            >
              Open Season
            </button>
          </div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="border border-white/10 bg-white/5 p-3 text-xs text-white/60">
            <span className="font-bold uppercase tracking-widest text-white/40">Tournament:</span>{' '}
            <span className="font-display font-black text-white">{tournament.title}</span>
            <span className="ml-3 inline-flex items-center gap-1 text-[11px] text-amber-400">
              <Users size={12} /> {teamCount === null ? 'counting…' : `${teamCount} registered teams`}
            </span>
          </div>

          {error && (
            <div className="flex items-start gap-2 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">Season Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="w-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
              placeholder={`Season ${nextSeasonNumber}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">
                Matches Per Team
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={matchesPerTeam}
                onChange={(event) => setMatchesPerTeam(event.target.value)}
                className="w-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-white/50">
                Points Per Win
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={winPoints}
                onChange={(event) => setWinPoints(event.target.value)}
                className="w-full border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
              />
            </div>
          </div>

          <p className="text-[11px] leading-5 text-white/45">
            The full schedule is generated up-front: every team gets {matchesPerTeam || 0} unique opponents, no pair
            meets twice, and no team plays twice in one round. Team counts that are even produce an exact schedule;
            odd counts get a catch-up round.
          </p>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || (teamCount !== null && teamCount < 2)}
              className="flex flex-1 items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              <Plus size={13} /> {busy ? 'Generating…' : 'Create & Generate'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  )
}
