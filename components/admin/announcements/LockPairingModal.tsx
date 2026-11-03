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
    <div className="modal-overlay">
      <div className="modal-panel max-w-lg">
        <div className="flex items-center justify-between border-b border-line-subtle px-5 py-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="text-brand-bright" size={22} />
            <h3 className="font-display text-base sm:text-lg font-extrabold uppercase tracking-wider text-ink">
              Confirm &amp; Lock Pairing
            </h3>
          </div>
          <button onClick={onCancel} className="text-ink-subtle transition hover:text-ink p-1" aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5 sm:p-6">
          <div className="rounded-md border border-line-subtle bg-surface-2 p-4 text-center sm:p-5">
            <p className="eyebrow mb-3">
              {season.name} · Round {pairing.round_number} · Match {pairing.match_number}
            </p>
            <div className="flex items-center justify-center gap-3">
              <span className="min-w-0 flex-1 truncate text-right font-display text-lg sm:text-xl font-extrabold uppercase text-brand-bright">
                {teamAName}
              </span>
              <span className="shrink-0 rounded-md border border-brand bg-brand-muted px-3 py-1 text-xs font-extrabold tracking-widest text-brand-bright">
                VS
              </span>
              <span className="min-w-0 flex-1 truncate text-left font-display text-lg sm:text-xl font-extrabold uppercase text-ink">
                {teamBName}
              </span>
            </div>
            <p className="mt-3.5 font-mono text-xs sm:text-sm tracking-widest text-brand-bright">{pairing.label || '—'}</p>
          </div>

          <p className="text-xs sm:text-sm leading-relaxed text-ink-muted">
            Locking writes the label <span className="font-mono font-bold text-brand-bright">{pairing.label || '—'}</span> to the
            database and removes these two teams from this round&apos;s wheel. You can unlock or delete the pairing
            later.
          </p>

          <div className="grid grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
            <button onClick={onCancel} disabled={busy} className="btn-secondary w-full">
              Cancel
            </button>
            <button onClick={onConfirm} disabled={busy} className="btn-primary w-full whitespace-nowrap">
              <Lock size={15} /> {busy ? 'Locking…' : 'Lock Pairing'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
