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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl border border-amber-500/40 bg-[#0d0d10] p-6 shadow-2xl shadow-amber-950/40 text-white space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400">
              <Trophy size={24} />
            </div>
            <div>
              <p className="eyebrow text-amber-400">Final Stage Confirmation</p>
              <h3 className="font-display text-xl font-black uppercase tracking-wide text-white">
                Finalize Tournament &amp; Lock Top 6
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-white/40 hover:text-white transition rounded hover:bg-white/5"
          >
            <X size={20} />
          </button>
        </div>

        {/* Warning / Notice */}
        <div className="flex items-start gap-3 border border-amber-500/30 bg-amber-950/20 p-3.5 text-xs text-amber-200">
          <AlertTriangle size={18} className="shrink-0 text-amber-400 mt-0.5" />
          <p className="leading-relaxed">
            All league spins and round matches have completed. Finalizing will lock the{' '}
            <strong className="text-white">Top 6 Teams</strong> from the points table into the official{' '}
            <strong className="text-amber-400">IPL-Style Knockout Bracket</strong>.
          </p>
        </div>

        {/* Top 6 Teams Preview */}
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
            Qualifying Teams (Seeded 1 to 6 from Points Table)
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {top6.map((team, idx) => (
              <div
                key={team.teamId}
                className={`flex items-center justify-between p-2.5 border text-xs ${
                  idx < 2
                    ? 'border-amber-500/40 bg-amber-950/30 text-amber-200'
                    : idx < 4
                      ? 'border-blue-500/30 bg-blue-950/20 text-white'
                      : 'border-white/10 bg-white/5 text-white/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`font-display font-black text-xs px-1.5 py-0.5 rounded ${
                      idx < 2
                        ? 'bg-amber-500 text-black'
                        : idx < 4
                          ? 'bg-blue-600 text-white'
                          : 'bg-white/20 text-white'
                    }`}
                  >
                    #{idx + 1}
                  </span>
                  <span className="font-bold truncate">{team.teamName}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-amber-400">{team.points} pts</span>
                  <span className="text-[9px] text-white/40 block">
                    {idx < 2 ? 'Qualifier 1' : idx < 4 ? 'Eliminator 1' : 'Eliminator 2'}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {top6.length < 6 && (
            <p className="text-[11px] text-amber-400/80 italic">
              Notice: Only {top6.length} teams found in standings. Remaining slot(s) will be marked as TBD.
            </p>
          )}
        </div>

        {/* Bracket Rules Summary */}
        <div className="border border-white/10 bg-white/[0.02] p-3 text-[11px] space-y-1.5 text-white/70">
          <p className="font-bold text-white uppercase text-[10px] tracking-wider flex items-center gap-1.5">
            <Flame size={12} className="text-red-500" /> IPL Playoff Structure:
          </p>
          <ul className="space-y-1 list-disc list-inside text-white/60">
            <li>
              <strong className="text-amber-300">Match 1 (Qualifier 1):</strong> Seed #1 vs Seed #2 (Winner → Grand
              Finale, Loser → Semi-Final)
            </li>
            <li>
              <strong className="text-white">Match 2 &amp; 3 (Eliminators):</strong> Seed #3 vs #4 and #5 vs #6 (Winners
              → Quarter-Final, Losers Disqualified)
            </li>
            <li>
              <strong className="text-white">Match 4 (Quarter-Final):</strong> Winner M2 vs Winner M3 (Winner →
              Semi-Final)
            </li>
            <li>
              <strong className="text-amber-300">Match 5 (Semi-Final):</strong> Loser M1 vs Winner M4 (Winner → Grand
              Finale)
            </li>
            <li>
              <strong className="text-amber-400">Match 6 (Grand Finale):</strong> Winner M1 vs Winner M5 (CHAMPION 🏆)
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 border border-white/15 bg-white/5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/10 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 border border-amber-500 bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-black uppercase tracking-widest text-black transition shadow-lg shadow-amber-950/50"
          >
            <Check size={14} />
            {isSubmitting ? 'Finalizing Bracket…' : 'Confirm & Open Playoffs'}
          </button>
        </div>
      </div>
    </div>
  )
}
