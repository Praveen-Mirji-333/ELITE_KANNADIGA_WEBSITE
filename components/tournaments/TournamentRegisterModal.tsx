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

  const isAdmin = currentUserProfile?.role === 'admin'
  const isClosed =
    tournament?.status !== 'registration_open' ||
    (tournament?.max_slots > 0 && (tournament?.slots_filled || 0) >= tournament?.max_slots) ||
    (tournament?.registration_end ? new Date(tournament.registration_end) < new Date() : false)

  if (!isOpen || !tournament) return null

  const isSquad =
    tournament.entry_type === 'SQUAD' ||
    tournament.game_mode?.toUpperCase().includes('SQUAD') ||
    tournament.game_mode?.toUpperCase().includes('CS') ||
    tournament.entry_type === 'GUILD'

  const handleResetForNewTeam = () => {
    setCaptainName('')
    setCaptainUid('')
    setPhone('')
    setTeamName('')
    setTm1Name('')
    setTm1Uid('')
    setTm2Name('')
    setTm2Uid('')
    setTm3Name('')
    setTm3Uid('')
    setErrorMsg('')
    setSuccessMsg('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')

    // Regular users cannot register if registrations are closed
    if (isClosed && !isAdmin) {
      setErrorMsg('Registrations for this tournament are currently closed.')
      return
    }

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
    if (!cleanPhone && !isAdmin) {
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
    if (!isAdmin) {
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
    }

    const teammateNames = isSquad ? [cleanTm1Name, cleanTm2Name, cleanTm3Name] : []
    const teammateUids = isSquad ? [cleanTm1Uid, cleanTm2Uid, cleanTm3Uid] : []

    const res = await registerTournamentTeam({
      tournamentId: tournament.id,
      captainName: cleanCaptainName,
      captainUid: cleanCaptainUid,
      phone: cleanPhone || '+91 9000000000',
      teamName: isSquad ? cleanTeamName : cleanCaptainName,
      teammateNames,
      teammateUids,
      isAdmin,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-md overflow-y-auto neu-theme">
      <div className="relative my-auto w-full max-w-xl modal-panel p-5 sm:p-6 max-h-[92vh] overflow-y-auto no-scrollbar">
        <button
          onClick={onClose}
          className="neu-circle absolute right-4 top-4 h-8 w-8 text-ink-muted hover:text-ink transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="mb-5 sm:mb-6 flex items-center gap-3">
          <Shield className="text-brand-bright shrink-0" size={30} />
          <div>
            <span className="text-xs sm:text-xs font-bold tracking-widest text-brand-bright uppercase">
              {tournament.entry_type} TOURNAMENT REGISTRATION
            </span>
            <h3 className="font-display text-xl sm:text-2xl font-extrabold uppercase text-ink">
              {tournament.title}
            </h3>
            <p className="text-xs sm:text-xs text-ink-subtle">
              PRIZE POOL: {tournament.prize_pool} • MAP: {tournament.map} • SLOTS: {tournament.slots_filled || 0}/{tournament.max_slots}
            </p>
          </div>
        </div>

        {isClosed && !isAdmin && (
          <div className="mb-4 flex items-center gap-2 border border-brand bg-brand-muted p-3 text-xs text-brand-bright">
            <AlertTriangle size={16} className="shrink-0 text-brand-bright" />
            <span>Registrations for this tournament are currently closed or full.</span>
          </div>
        )}

        {isClosed && isAdmin && (
          <div className="mb-4 flex items-center gap-2 border border-line-strong bg-surface-3 p-3 text-xs text-ink">
            <Shield size={16} className="shrink-0 text-ink" />
            <span>
              <strong>ADMIN OVERRIDE ACTIVE:</strong> Tournament registrations are closed ({tournament.status.toUpperCase()}), but you can register any team as Admin.
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 border border-brand bg-brand-muted p-3 text-xs text-brand-bright">
            <AlertTriangle size={16} className="shrink-0 text-brand-bright" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-center gap-2 border border-line-strong bg-surface-3 p-3 text-xs text-ink">
            <CheckCircle2 size={16} className="shrink-0 text-ink" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Captain Intel Section */}
          <div className="border border-line-subtle bg-surface-2 p-3.5 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="eyebrow text-brand-bright">
                CAPTAIN / LEADER INTEL *
              </h4>
              {isAdmin && (
                <button
                  type="button"
                  onClick={handleResetForNewTeam}
                  className="text-xs font-bold text-brand-bright hover:text-ink underline uppercase"
                >
                  Clear / Enter Other Team
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted">
                  CAPTAIN GAMER NAME (IGN) *
                </label>
                <input
                  type="text"
                  required
                  value={captainName}
                  onChange={(e) => setCaptainName(e.target.value)}
                  placeholder="e.g. ELITE_RAHUL"
                  className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted">
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
                  className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none placeholder-ink-subtle"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-ink-muted">
                PHONE NUMBER / WHATSAPP *
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
              />
            </div>

            {isSquad && (
              <div>
                <label className="mb-1 block text-xs font-bold text-ink-muted">
                  TEAM / SQUAD NAME *
                </label>
                <input
                  type="text"
                  required
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="e.g. RED WARRIORS"
                  className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
                />
              </div>
            )}
          </div>

          {/* Squad Teammates Section */}
          {isSquad && (
            <div className="border border-line-subtle bg-surface-2 p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="eyebrow text-brand-bright">SQUAD TEAMMATES (ALL FIELDS MANDATORY)</h4>
                <span className="text-xs font-bold text-brand-bright">NUMERIC UIDs ONLY</span>
              </div>
              <p className="text-xs text-ink-subtle">
                Every squad member must be entered with a valid name and unique numeric Free Fire UID. Players cannot be registered in more than one team.
              </p>

              {/* Teammate 1 */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink-muted">PLAYER 2 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 1 Name *"
                    value={tm1Name}
                    onChange={(e) => setTm1Name(e.target.value)}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 1 UID (Numbers only) *"
                    value={tm1Uid}
                    onChange={(e) => setTm1Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                </div>
              </div>

              {/* Teammate 2 */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink-muted">PLAYER 3 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 2 Name *"
                    value={tm2Name}
                    onChange={(e) => setTm2Name(e.target.value)}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 2 UID (Numbers only) *"
                    value={tm2Uid}
                    onChange={(e) => setTm2Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                </div>
              </div>

              {/* Teammate 3 */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-ink-muted">PLAYER 4 *</label>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input
                    type="text"
                    required
                    placeholder="Teammate 3 Name *"
                    value={tm3Name}
                    onChange={(e) => setTm3Name(e.target.value)}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    placeholder="Teammate 3 UID (Numbers only) *"
                    value={tm3Uid}
                    onChange={(e) => setTm3Uid(e.target.value.replace(/\D/g, ''))}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink font-mono focus:border-brand focus:outline-none placeholder-ink-subtle"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || (isClosed && !isAdmin)}
            className={`cut-button mt-4 w-full py-3 font-display text-xs font-extrabold tracking-widest text-ink transition disabled:opacity-50 ${
              isClosed && !isAdmin
                ? 'bg-surface-2 cursor-not-allowed text-ink-subtle'
                : isClosed && isAdmin
                ? 'bg-surface-3 hover:bg-surface-3 shadow-lg shadow-black/20'
                : 'bg-brand hover:bg-brand shadow-lg shadow-brand/20'
            }`}
          >
            {loading
              ? 'VALIDATING UIDs & REGISTERING...'
              : isClosed && !isAdmin
              ? 'REGISTRATIONS CLOSED'
              : isClosed && isAdmin
              ? 'CONFIRM TEAM REGISTRATION (ADMIN OVERRIDE)'
              : 'CONFIRM TOURNAMENT REGISTRATION'}
          </button>
        </form>
      </div>
    </div>
  )
}
