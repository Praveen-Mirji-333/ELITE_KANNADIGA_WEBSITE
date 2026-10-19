'use client'

import { useState, useEffect } from 'react'
import { X, Shield, CheckCircle2, AlertTriangle, Users, User, Phone, Gamepad } from 'lucide-react'
import { Tournament, Profile } from '../../lib/types'
import { registerTournamentTeam, fetchTournamentRegistrationsForAdmin } from '../../lib/supabase'

interface TournamentRegisterModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament | null
  onSuccess: () => void
  currentUserProfile?: Profile | null
}

export function TournamentRegisterModal({
  isOpen,
  onClose,
  tournament,
  onSuccess,
  currentUserProfile,
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

  // Reset or pre-fill form when modal opens
  useEffect(() => {
    if (isOpen) {
      setErrorMsg('')
      setSuccessMsg('')
      setLoading(false)

      if (currentUserProfile) {
        setCaptainName(currentUserProfile.ign || currentUserProfile.username || '')
        setCaptainUid(currentUserProfile.free_fire_uid || '')
      }
    }
  }, [isOpen, currentUserProfile])

  if (!isOpen || !tournament) return null

  const isSquad =
    tournament.entry_type === 'SQUAD' ||
    tournament.game_mode?.toUpperCase().includes('SQUAD') ||
    tournament.game_mode?.toUpperCase().includes('CS') ||
    tournament.entry_type === 'GUILD'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // 1. Strict Empty Field Validations (Every field must be filled)
    const cleanCaptainName = captainName.trim()
    const cleanCaptainUid = captainUid.trim()
    const cleanPhone = phone.trim()
    const cleanTeamName = teamName.trim()

    if (!cleanCaptainName) {
      setErrorMsg('Captain Gamer Name (IGN) cannot be empty. Please fill in your name.')
      return
    }
    if (!cleanCaptainUid) {
      setErrorMsg('Captain Free Fire UID cannot be empty. Please enter your numeric UID.')
      return
    }
    if (!cleanPhone) {
      setErrorMsg('Phone Number / WhatsApp cannot be empty. Please provide your contact number.')
      return
    }

    // UID must contain only numbers
    if (!/^\d+$/.test(cleanCaptainUid)) {
      setErrorMsg('Captain Free Fire UID must contain numbers only (digits 0-9).')
      return
    }

    const cleanTm1Name = tm1Name.trim()
    const cleanTm1Uid = tm1Uid.trim()
    const cleanTm2Name = tm2Name.trim()
    const cleanTm2Uid = tm2Uid.trim()
    const cleanTm3Name = tm3Name.trim()
    const cleanTm3Uid = tm3Uid.trim()

    if (isSquad) {
      if (!cleanTeamName) {
        setErrorMsg('Team / Squad Name cannot be empty. Every field must be filled.')
        return
      }
      if (!cleanTm1Name || !cleanTm1Uid) {
        setErrorMsg('Teammate 1 Name and Free Fire UID are required. No field can be left empty.')
        return
      }
      if (!cleanTm2Name || !cleanTm2Uid) {
        setErrorMsg('Teammate 2 Name and Free Fire UID are required. No field can be left empty.')
        return
      }
      if (!cleanTm3Name || !cleanTm3Uid) {
        setErrorMsg('Teammate 3 Name and Free Fire UID are required. No field can be left empty.')
        return
      }

      // Ensure all teammate UIDs contain only numbers
      if (!/^\d+$/.test(cleanTm1Uid)) {
        setErrorMsg('Teammate 1 Free Fire UID must contain numbers only (digits 0-9).')
        return
      }
      if (!/^\d+$/.test(cleanTm2Uid)) {
        setErrorMsg('Teammate 2 Free Fire UID must contain numbers only (digits 0-9).')
        return
      }
      if (!/^\d+$/.test(cleanTm3Uid)) {
        setErrorMsg('Teammate 3 Free Fire UID must contain numbers only (digits 0-9).')
        return
      }
    }

    // 2. Internal Duplicate UID Check across team submission
    const teamUids = [cleanCaptainUid]
    if (isSquad) {
      teamUids.push(cleanTm1Uid, cleanTm2Uid, cleanTm3Uid)
    }

    const seenUids = new Set<string>()
    for (const uid of teamUids) {
      if (seenUids.has(uid)) {
        setErrorMsg(`Duplicate Free Fire UID (${uid}) detected inside your team! Each player must have a unique numeric UID.`)
        return
      }
      seenUids.add(uid)
    }

    setLoading(true)

    // 3. Cross-Team Check: If any player is already registered in another team for this tournament, reject
    try {
      const existingRegs = await fetchTournamentRegistrationsForAdmin(tournament.id)
      for (const reg of existingRegs) {
        const teamLabel = reg.team_name || reg.captain_name || 'an existing team'
        const existingUidsInReg = [
          reg.captain_free_fire_uid?.trim(),
          ...(Array.isArray(reg.teammate_uids) ? reg.teammate_uids.map((t: any) => String(t).trim()) : []),
        ].filter(Boolean) as string[]

        for (const uid of teamUids) {
          if (existingUidsInReg.includes(uid)) {
            setErrorMsg(
              `Player with Free Fire UID "${uid}" is already registered in team "${teamLabel}" for this tournament! A player cannot register in a second team.`
            )
            setLoading(false)
            return
          }
        }
      }
    } catch {
      // Continue to backend validation
    }

    const teammateNames = isSquad ? [cleanTm1Name, cleanTm2Name, cleanTm3Name] : []
    const teammateUids = isSquad ? [cleanTm1Uid, cleanTm2Uid, cleanTm3Uid] : []

    const res = await registerTournamentTeam({
      tournamentId: tournament.id,
      captainName: cleanCaptainName,
      captainUid: cleanCaptainUid,
      phone: cleanPhone,
      teamName: isSquad ? cleanTeamName : cleanCaptainName,
      teammateNames,
      teammateUids,
    })

    setLoading(false)

    if (res.success) {
      setSuccessMsg(res.message || 'Successfully registered for the tournament!')
      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } else {
      setErrorMsg(res.error || 'Registration failed. Please check your details.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 sm:p-4 backdrop-blur-md overflow-y-auto">
      <div className="relative my-auto w-full max-w-xl border border-red-800/60 bg-[#0c0c0e] p-5 sm:p-6 shadow-2xl max-h-[92vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-white/60 hover:text-white transition"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="mb-5 sm:mb-6 flex items-center gap-3">
          <Shield className="text-red-500 shrink-0" size={30} />
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-red-500 uppercase">
              {tournament.entry_type} TOURNAMENT REGISTRATION
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-black uppercase text-white">
              {tournament.title}
            </h3>
            <p className="text-[11px] sm:text-xs text-white/50">
              PRIZE POOL: {tournament.prize_pool} • MAP: {tournament.map} • SLOTS: {tournament.slots_filled || 0}/{tournament.max_slots}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 border border-red-600/40 bg-red-950/40 p-3 text-xs text-red-400">
            <AlertTriangle size={16} className="shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 border border-emerald-500/40 bg-emerald-950/40 p-3 text-xs text-emerald-400">
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Captain Intel Section */}
          <div className="border border-white/10 bg-white/5 p-3.5 sm:p-4 space-y-3">
            <h4 className="eyebrow text-red-500 flex items-center justify-between">
              <span>CAPTAIN / LEADER INTEL *</span>
              <span className="text-[9px] font-normal text-white/40">ALL FIELDS REQUIRED</span>
            </h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/70">
                  CAPTAIN GAMER NAME (IGN) *
                </label>
                <input
                  type="text"
                  required
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="e.g. ELITE_RAHUL"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none placeholder-white/30"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/70">
                  FREE FIRE UID (NUMBERS ONLY) *
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  required
                  value={captainUid}
                  onChange={(e) => setCaptainUid(e.target.value.replace(/\D/g, ''))}
                  placeholder="Numbers only e.g. 1928374650"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white font-mono focus:border-red-500 focus:outline-none placeholder-white/30"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[10px] font-bold text-white/70">
                PHONE NUMBER / WHATSAPP *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none placeholder-white/30"
              />
            </div>

            {isSquad && (
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/70">
                  TEAM / SQUAD NAME *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. RED WARRIORS"
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none placeholder-white/30"
                />
              </div>
            )}
          </div>

          {/* Squad Teammates Section */}
          {isSquad && (
            <div className="border border-white/10 bg-white/5 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="eyebrow text-amber-400">SQUAD TEAMMATES (ALL FIELDS MANDATORY)</h4>
                <span className="text-[9px] font-bold text-amber-400/80">NUMERIC UIDs ONLY</span>
              </div>
              <p className="text-[10px] text-white/50">
                Every squad member must be entered with a valid name and unique numeric Free Fire UID. Players cannot be registered in more than one team.
              </p>

              {/* Teammate 1 */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-white/60">PLAYER 2 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 1 Name *"
                    value={tm1Name}
                    onChange={(e) => setTm1Name(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 1 UID (Numbers only) *"
                    value={tm1Uid}
                    onChange={(e) => setTm1Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              {/* Teammate 2 */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-white/60">PLAYER 3 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 2 Name *"
                    value={tm2Name}
                    onChange={(e) => setTm2Name(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 2 UID (Numbers only) *"
                    value={tm2Uid}
                    onChange={(e) => setTm2Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>

              {/* Teammate 3 */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-white/60">PLAYER 4 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 3 Name *"
                    value={tm3Name}
                    onChange={(e) => setTm3Name(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 3 UID (Numbers only) *"
                    value={tm3Uid}
                    onChange={(e) => setTm3Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white font-mono focus:border-amber-400 focus:outline-none placeholder-white/30"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="cut-button mt-4 w-full bg-red-600 py-3 font-display text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            {loading ? 'VALIDATING UIDs & REGISTERING...' : 'CONFIRM TOURNAMENT REGISTRATION'}
          </button>
        </form>
      </div>
    </div>
  )
}
