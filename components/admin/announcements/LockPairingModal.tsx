'use client'

import { Lock, ShieldCheck, X } from 'lucide-react'
import type { LeaguePairing, LeagueSeason } from '../../../lib/types'

interface LockPairingModalProps {
  isOpen: boolean
  season: LeagueSeason
  pairing: LeaguePairing | null
  teamAName: string
  teamBName: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function LockPairingModal({
  isOpen,
  season,
  pairing,
  teamAName,
  teamBName,
  busy,
  onCancel,
  onConfirm,
}: LockPairingModalProps) {
  if (!isOpen || !pairing) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md border border-red-700/60 bg-[#0c0c0e] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-red-500" size={18} />
            <h3 className="font-display text-sm font-black uppercase tracking-widest text-white">
              Confirm &amp; Lock Pairing
            </h3>
          </div>
          <button onClick={onCancel} className="text-white/40 transition hover:text-white" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="border border-white/10 bg-white/5 p-4 text-center">
            <p className="eyebrow mb-3">
              {season.name} · Round {pairing.round_number} · Match {pairing.match_number}
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="min-w-0 flex-1 truncate text-right font-display text-base font-black uppercase text-white">
                {teamAName}
              </span>
              <span className="shrink-0 border border-red-600/60 bg-red-950/50 px-2.5 py-1 text-[10px] font-black tracking-widest text-red-400">
                VS
              </span>
              <span className="min-w-0 flex-1 truncate text-left font-display text-base font-black uppercase text-white">
                {teamBName}
              </span>
            </div>
            <p className="mt-3 font-mono text-[11px] tracking-widest text-amber-400">{pairing.label || '—'}</p>
          </div>

          <p className="text-xs leading-5 text-white/55">
            Locking writes the label <span className="font-mono text-amber-400">{pairing.label || '—'}</span> to the
            database and removes these two teams from this round&apos;s wheel. You can unlock or delete the pairing
            later.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              disabled={busy}
              className="flex-1 border border-white/15 bg-white/5 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white/70 transition hover:bg-white/10 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={busy}
              className="flex flex-1 items-center justify-center gap-2 bg-red-600 px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              <Lock size={13} /> {busy ? 'Locking…' : 'Lock Pairing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
