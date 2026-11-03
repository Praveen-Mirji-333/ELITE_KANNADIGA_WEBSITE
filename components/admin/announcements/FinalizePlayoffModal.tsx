'use client'

import { Trophy, AlertTriangle, ShieldCheck, X, Check, Flame } from 'lucide-react'
import type { LeagueStanding } from '../../../lib/types'

interface FinalizePlayoffModalProps {
  isOpen: boolean
  standings: LeagueStanding[]
  onClose: () => void
  onConfirm: () => void
  isSubmitting?: boolean
}

export function FinalizePlayoffModal({
  isOpen,
  standings,
  onClose,
  onConfirm,
  isSubmitting = false,
}: FinalizePlayoffModalProps) {
  if (!isOpen) return null

  const top6 = standings.slice(0, 6)

  return (
    <div className="modal-overlay">
      <div className="modal-panel relative max-w-xl space-y-5 p-5 text-ink sm:p-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-line-subtle pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-brand/20 border border-brand text-brand-bright">
              <Trophy size={24} />
            </div>
            <div>
              <p className="eyebrow text-brand-bright">Final Stage Confirmation</p>
              <h3 className="font-display text-xl font-extrabold uppercase tracking-wide text-ink">
                Finalize Tournament &amp; Lock Top 6
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-ink-subtle hover:text-ink transition rounded hover:bg-surface-2"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning / Notice */}
        <div className="flex items-start gap-3 border border-brand bg-brand-muted p-3.5 text-xs text-brand-bright">
          <AlertTriangle size={18} className="shrink-0 text-brand-bright mt-0.5" />
          <p className="leading-relaxed">
            All league spins and round matches have completed. Finalizing will lock the{' '}
            <strong className="text-ink">Top 6 Teams</strong> from the points table into the official{' '}
            <strong className="text-brand-bright">IPL-Style Knockout Bracket</strong>.
          </p>
        </div>

        {/* Top 6 Teams Preview */}
        <div className="space-y-2">
          <p className="text-xs font-extrabold uppercase tracking-widest text-ink-subtle">
            Qualifying Teams (Seeded 1 to 6 from Points Table)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {top6.map((team, idx) => (
              <div
                key={team.teamId}
                className={`flex items-center justify-between p-2.5 border text-xs ${
                  idx < 2
                    ? 'border-brand bg-brand-muted text-brand-bright'
                    : idx < 4
                      ? 'border-line bg-surface-3 text-ink'
                      : 'border-line-subtle bg-surface-2 text-ink'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-display font-extrabold text-xs px-1.5 py-0.5 rounded ${
                      idx < 2
                        ? 'bg-brand text-ink'
                        : idx < 4
                          ? 'bg-surface-3 text-ink'
                          : 'bg-surface-3 text-ink'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold truncate">{team.teamName}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-brand-bright">{team.points} pts</span>
                  <span className="text-xs text-ink-subtle block">
                    {idx < 2 ? 'Qualifier 1' : idx < 4 ? 'Eliminator 1' : 'Eliminator 2'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {top6.length < 6 && (
            <p className="text-xs text-brand-bright italic">
              Notice: Only {top6.length} teams found in standings. Remaining slot(s) will be marked as TBD.
            </p>
          )}
        </div>

        {/* Bracket Rules Summary */}
        <div className="border border-line-subtle bg-surface p-3 text-xs space-y-1.5 text-ink-muted">
          <p className="font-bold text-ink uppercase text-xs tracking-wider flex items-center gap-1.5">
            <Flame size={12} className="text-brand-bright" /> IPL Playoff Structure:
          </p>
          <ul className="space-y-1 list-disc list-inside text-ink-muted">
            <li>
              <strong className="text-brand-bright">Match 1 (Qualifier 1):</strong> Seed #1 vs Seed #2 (Winner → Grand
              Finale, Loser → Semi-Final)
            </li>
            <li>
              <strong className="text-ink">Match 2 &amp; 3 (Eliminators):</strong> Seed #3 vs #4 and #5 vs #6 (Winners
              → Quarter-Final, Losers Disqualified)
            </li>
            <li>
              <strong className="text-ink">Match 4 (Quarter-Final):</strong> Winner M2 vs Winner M3 (Winner →
              Semi-Final)
            </li>
            <li>
              <strong className="text-brand-bright">Match 5 (Semi-Final):</strong> Loser M1 vs Winner M4 (Winner → Grand
              Finale)
            </li>
            <li>
              <strong className="text-brand-bright">Match 6 (Grand Finale):</strong> Winner M1 vs Winner M5 (CHAMPION)
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-2 border-t border-line-subtle pt-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="btn-secondary w-full"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="btn-primary w-full whitespace-nowrap"
          >
            <Check size={14} />
            {isSubmitting ? 'Finalizing bracket…' : 'Confirm & open playoffs'}
          </button>
        </div>
      </div>
    </div>
  )
}
