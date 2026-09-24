'use client'

import { useState } from 'react'
import { X, Shield, CheckCircle2, AlertTriangle, Users, User, Phone, Gamepad } from 'lucide-react'
import { Tournament } from '../../lib/types'
import { registerTournamentTeam } from '../../lib/supabase'

interface TournamentRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament | null
  onSuccess: () => void
}

export function TournamentRegisterModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
}: TournamentRegisterModalProps) {
  const [captainName, setCaptainName] = useState('')
  const [captainUid, setCaptainUid] = useState('')
  const [phone, setPhone] = useState('')
  const [teamName, setTeamName] = useState('')
  
  // Teammates for Squad
  const [tm1Name, setTm1Name] = useState('')
  const [tm1Uid, setTm1Uid] = useState('')
  const [tm2Name, setTm2Name] = useState('')
  const [tm2Uid, setTm2Uid] = useState('')
  const [tm3Name, setTm3Name] = useState('')
  const [tm3Uid, setTm3Uid] = useState('')

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen || !tournament) return null

  const isSquad = tournament.entry_type === 'SQUAD' || tournament.game_mode?.toUpperCase().includes('SQUAD')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    if (!captainName || !captainUid || !phone) {
      setErrorMsg('Please fill in all required captain details.')
      return
    }

    // Client-side Duplicate UID check across inputs
    const uids = [captainUid.trim()]
    if (isSquad) {
      if (tm1Uid.trim()) uids.push(tm1Uid.trim())
      if (tm2Uid.trim()) uids.push(tm2Uid.trim())
      if (tm3Uid.trim()) uids.push(tm3Uid.trim())
    }

    const uniqueUids = new Set(uids)
    if (uniqueUids.size < uids.length) {
      setErrorMsg('Duplicate Free Fire UIDs detected within your team submission!')
      return
    }

    setLoading(true)

    const teammateNames = isSquad ? [tm1Name, tm2Name, tm3Name].filter(Boolean) : []
    const teammateUids = isSquad ? [tm1Uid, tm2Uid, tm3Uid].filter(Boolean) : []

    const res = await registerTournamentTeam({
      tournamentId: tournament.id,
      captainName,
      captainUid,
      phone,
      teamName: isSquad ? teamName || captainName : captainName,
      teammateNames,
      teammateUids,
    })

    setLoading(false)

    if (res.success) {
      setSuccessMsg(res.message || 'Successfully registered for the tournament!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 2000)
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check for duplicate UIDs.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-auto w-full max-w-xl border border-red-800/60 bg-[#0c0c0e] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white"
        >
          <X size={20} />
        </button>

        <div className="mb-5 sm:mb-6 flex items-center gap-3">
          <Shield className="text-red-500 shrink-0" size={30} />
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-red-500 uppercase">
              {tournament.entry_type} REGISTRATION
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-black uppercase text-white">
              {tournament.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-white/50">
              PRIZE POOL: {tournament.prize_pool} • MAP: {tournament.map}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="border border-white/10 bg-white/5 p-3.5 sm:p-4 space-y-3">
            <h4 className="eyebrow text-red-500">CAPTAIN / PLAYER INTEL *</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">
                  CAPTAIN GAMER NAME (IGN) *
                </label>
                <input
                  type="text"
                  required
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="e.g. ELITE_RAHUL"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">
                  FREE FIRE UID *
                </label>
                <input
                  type="text"
                  required
                  value={captainUid}
                  onChange={(e) => setCaptainUid(e.target.value)}
                  placeholder="e.g. 1928374650"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-white/60">
                PHONE NUMBER / WHATSAPP *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:border-red-500 focus:outline-none"
              />
            </div>

            {isSquad && (
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">
                  TEAM / SQUAD NAME *
                </label>
                <input
                  type="text"
                  required={isSquad}
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. RED WARRIORS"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {isSquad && (
            <div className="border border-white/10 bg-white/5 p-3.5 sm:p-4 space-y-3">
              <h4 className="eyebrow text-amber-400">SQUAD TEAMMATES (NO DUPLICATE UIDs)</h4>
              
              {/* Teammate 1 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Teammate 1 Name"
                  value={tm1Name}
                  onChange={(e) => setTm1Name(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Teammate 1 Free Fire UID"
                  value={tm1Uid}
                  onChange={(e) => setTm1Uid(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
              </div>

              {/* Teammate 2 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Teammate 2 Name"
                  value={tm2Name}
                  onChange={(e) => setTm2Name(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Teammate 2 Free Fire UID"
                  value={tm2Uid}
                  onChange={(e) => setTm2Uid(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
              </div>

              {/* Teammate 3 */}
              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  placeholder="Teammate 3 Name"
                  value={tm3Name}
                  onChange={(e) => setTm3Name(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Teammate 3 Free Fire UID"
                  value={tm3Uid}
                  onChange={(e) => setTm3Uid(e.target.value)}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-base sm:text-xs text-white focus:outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cut-button mt-4 w-full bg-red-600 py-3 font-display text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'VALIDATING & REGISTERING...' : 'CONFIRM TOURNAMENT REGISTRATION'}
          </button>
        </form>
      </div>
    </div>
  )
}
