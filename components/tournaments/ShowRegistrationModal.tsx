'use client'

import { useState, useEffect } from 'react'
import {
  X,
  Shield,
  CheckCircle2,
  Users,
  User,
  Phone,
  Search,
  Calendar,
  Clock,
  Sparkles,
  Gamepad2,
} from 'lucide-react'
import { Tournament, TournamentRegistration } from '../../lib/types'
import { fetchTournamentRegistrationsForAdmin } from '../../lib/supabase'
import { UserAvatar } from '../ui/UserAvatar'

interface ShowRegistrationModalProps {
  isOpen: boolean
  onClose: () => void
  tournament: Tournament | null
  userRegistration: TournamentRegistration | null
  avatarMap?: Map<string, string>
}

export function ShowRegistrationModal({
  isOpen,
  onClose,
  tournament,
  userRegistration,
  avatarMap = new Map(),
}: ShowRegistrationModalProps) {
  const [activeTab, setActiveTab] = useState<'MY_TEAM' | 'ALL_TEAMS'>('MY_TEAM')
  const [allRegistrations, setAllRegistrations] = useState<TournamentRegistration[]>([])
  const [loadingAll, setLoadingAll] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (isOpen && tournament) {
      loadAllTeams(tournament.id)
    }
  }, [isOpen, tournament])

  async function loadAllTeams(tournamentId: string) {
    setLoadingAll(true)
    const regs = await fetchTournamentRegistrationsForAdmin(tournamentId)
    setAllRegistrations(regs)
    setLoadingAll(false)
  }

  if (!isOpen || !tournament) return null

  const isSquad =
    tournament.entry_type === 'SQUAD' ||
    tournament.game_mode?.toUpperCase().includes('SQUAD') ||
    (userRegistration?.teammate_names && userRegistration.teammate_names.length > 0)

  const filteredTeams = allRegistrations.filter((r) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase().trim()
    const teamNameMatch = r.team_name?.toLowerCase().includes(q)
    const captainMatch = r.captain_name?.toLowerCase().includes(q)
    const captainUidMatch = r.captain_free_fire_uid?.includes(q)
    const teammateNameMatch = r.teammate_names?.some((name) => name?.toLowerCase().includes(q))
    const teammateUidMatch = r.teammate_uids?.some((uid) => uid?.includes(q))
    return teamNameMatch || captainMatch || captainUidMatch || teammateNameMatch || teammateUidMatch
  })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3 sm:p-4 backdrop-blur-md overflow-y-auto neu-theme">
      <div className="relative my-auto w-full max-w-3xl modal-panel p-5 sm:p-7 flex flex-col text-ink">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="neu-circle absolute right-4 top-4 h-8 w-8 text-ink-muted hover:text-ink transition"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Modal Header */}
        <div className="border-b border-line-subtle pb-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-line-strong bg-surface-3 text-ink shrink-0">
                <Shield size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded bg-surface-3 border border-line-strong px-2 py-0.5 text-xs font-extrabold uppercase text-ink tracking-wider">
                    <CheckCircle2 size={11} /> REGISTERED CONFIRMED
                  </span>
                  <span className="text-xs font-bold text-ink-subtle uppercase tracking-widest">
                    {tournament.game_mode}
                  </span>
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-extrabold uppercase text-ink tracking-wide mt-0.5">
                  {tournament.title}
                </h3>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs font-bold text-ink-subtle block">PRIZE POOL</span>
              <span className="font-display text-lg font-extrabold text-brand-bright">
                {tournament.prize_pool || '₹10,000'}
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex flex-wrap sm:flex-nowrap gap-1.5 sm:gap-2 mt-4 sm:mt-5">
            <button
              onClick={() => setActiveTab('MY_TEAM')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-xs font-extrabold tracking-wider sm:tracking-widest uppercase transition ${
                activeTab === 'MY_TEAM'
                  ? 'border-b-2 border-line-strong bg-surface-2 text-ink'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <User size={13} /> YOUR SQUAD
            </button>
            <button
              onClick={() => setActiveTab('ALL_TEAMS')}
              className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-xs font-extrabold tracking-wider sm:tracking-widest uppercase transition ${
                activeTab === 'ALL_TEAMS'
                  ? 'border-b-2 border-line-strong bg-surface-2 text-ink'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              <Users size={13} /> ALL SQUADS ({allRegistrations.length})
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-5 pr-1 no-scrollbar">
          {activeTab === 'MY_TEAM' ? (
            <div className="space-y-5">
              {userRegistration ? (
                <>
                  {/* Team Card Banner */}
                  <div className="border border-line-strong bg-gradient-to-r from-surface-2 via-surface to-canvas p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-xs font-bold text-ink tracking-widest uppercase">
                          SQUAD / TEAM NAME
                        </span>
                        <h4 className="font-display text-2xl font-extrabold text-ink uppercase tracking-wide">
                          {userRegistration.team_name || userRegistration.captain_name || 'REGISTERED TEAM'}
                        </h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-line-strong bg-surface-3 px-3 py-1 text-xs font-bold text-ink">
                          <CheckCircle2 size={13} /> Slot Confirmed
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Captain Information */}
                  <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 space-y-3">
                    <h5 className="eyebrow text-ink flex items-center gap-2">
                      <Sparkles size={14} /> CAPTAIN / LEADER INTEL
                    </h5>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="bg-canvas/40 border border-line-subtle p-3">
                        <span className="text-xs font-bold text-ink-subtle block">GAMER NAME (IGN)</span>
                        <span className="font-display text-base font-bold text-ink">
                          {userRegistration.captain_name}
                        </span>
                      </div>
                      <div className="bg-canvas/40 border border-line-subtle p-3">
                        <span className="text-xs font-bold text-ink block">FREE FIRE UID</span>
                        <span className="font-mono text-base font-bold text-ink">
                          {userRegistration.captain_free_fire_uid || 'N/A'}
                        </span>
                      </div>
                      <div className="bg-canvas/40 border border-line-subtle p-3">
                        <span className="text-xs font-bold text-ink-subtle block">WHATSAPP / PHONE</span>
                        <span className="text-sm font-bold text-ink">
                          {userRegistration.phone_number || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Teammates Section */}
                  {isSquad && (
                    <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 space-y-3">
                      <h5 className="eyebrow text-brand-bright flex items-center gap-2">
                        <Gamepad2 size={14} /> REGISTERED SQUAD TEAMMATES
                      </h5>
                      <div className="grid gap-3 sm:grid-cols-3">
                        {[0, 1, 2].map((idx) => {
                          const name = userRegistration.teammate_names?.[idx] || `Teammate ${idx + 2}`
                          const uid = userRegistration.teammate_uids?.[idx] || 'N/A'
                          return (
                            <div key={idx} className="bg-canvas/40 border border-line-subtle p-3.5 space-y-1">
                              <span className="text-xs font-bold text-ink-subtle block">
                                PLAYER {idx + 2}
                              </span>
                              <p className="font-display text-sm font-bold text-ink truncate">
                                {name}
                              </p>
                              <div className="flex items-center gap-1.5 pt-1 border-t border-line-subtle">
                                <span className="text-xs font-bold text-brand-bright">UID:</span>
                                <span className="font-mono text-xs font-bold text-brand-bright">
                                  {uid}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Match Day Advisory */}
                  <div className="border border-brand bg-brand-muted p-4 text-xs text-brand-bright leading-relaxed space-y-1">
                    <p className="font-bold flex items-center gap-1.5 text-brand-bright uppercase tracking-wide">
                      <Clock size={14} /> Match Day Check-In Protocol
                    </p>
                    <p className="text-xs text-ink-muted">
                      Room ID & Password will be provided to the captain 15 minutes before the match start time. Ensure all players join with their verified Free Fire UIDs.
                    </p>
                  </div>
                </>
              ) : (
                <div className="border border-line-subtle bg-surface-2 p-8 text-center text-sm text-ink-subtle">
                  You are not currently registered for this tournament.
                </div>
              )}
            </div>
          ) : (
            /* ALL TEAMS TAB */
            <div className="space-y-4">
              {/* Search Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs font-bold text-ink-muted">
                  TOTAL REGISTERED TEAMS: <strong className="text-ink">{allRegistrations.length}</strong> / {tournament.max_slots}
                </span>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 text-ink-subtle" size={14} />
                  <input
                    type="text"
                    placeholder="Search team, captain or UID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full border border-line bg-canvas/60 py-1.5 pl-9 pr-3 text-xs text-ink placeholder-ink-subtle focus:border-line-strong focus:outline-none"
                  />
                </div>
              </div>

              {loadingAll ? (
                <div className="border border-line-subtle p-8 text-center text-xs text-ink-subtle animate-pulse">
                  Loading registered tournament teams...
                </div>
              ) : filteredTeams.length === 0 ? (
                <div className="border border-line-subtle p-8 text-center text-xs text-ink-subtle">
                  {searchQuery ? 'No registered teams match your search.' : 'No teams registered yet for this tournament.'}
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {filteredTeams.map((reg, idx) => {
                    const isMyTeam =
                      userRegistration &&
                      (userRegistration.id === reg.id ||
                        userRegistration.captain_free_fire_uid === reg.captain_free_fire_uid)

                    return (
                      <div
                        key={reg.id || idx}
                        className={`p-4 border transition ${
                          isMyTeam
                            ? 'border-line-strong bg-surface-3'
                            : 'border-line-subtle bg-surface-2 hover:bg-ink/[0.08]'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-line-subtle pb-2.5 mb-2.5">
                          <div className="flex items-center gap-2.5">
                            <span className="font-display text-base font-extrabold text-brand-bright">
                              #{idx + 1}
                            </span>
                            <h5 className="font-display text-lg font-extrabold uppercase text-ink tracking-wide">
                              {reg.team_name || reg.captain_name || `Team ${idx + 1}`}
                            </h5>
                            {isMyTeam && (
                              <span className="rounded bg-surface-3 px-2 py-0.5 text-xs font-extrabold uppercase text-ink">
                                YOUR TEAM
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-bold text-ink flex items-center gap-1">
                            <CheckCircle2 size={12} /> CONFIRMED
                          </span>
                        </div>

                        {/* Players Grid */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                          {/* Captain */}
                          <div className="bg-canvas/50 p-2 border border-line-subtle rounded">
                            <span className="text-xs font-bold text-ink block">👑 CAPTAIN</span>
                            <span className="font-bold text-ink block truncate">{reg.captain_name}</span>
                            <span className="font-mono text-xs text-ink-subtle block">UID: {reg.captain_free_fire_uid || 'N/A'}</span>
                          </div>

                          {/* Teammates */}
                          {[0, 1, 2].map((pIdx) => {
                            const tmName = reg.teammate_names?.[pIdx] || 'Teammate'
                            const tmUid = reg.teammate_uids?.[pIdx] || 'N/A'
                            return (
                              <div key={pIdx} className="bg-canvas/30 p-2 border border-line-subtle rounded">
                                <span className="text-xs font-bold text-ink-subtle block">PLAYER {pIdx + 2}</span>
                                <span className="font-bold text-ink block truncate">{tmName}</span>
                                <span className="font-mono text-xs text-ink-subtle block">UID: {tmUid}</span>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="border-t border-line-subtle pt-4 flex justify-end">
          <button
            onClick={onClose}
            className="cut-button bg-surface-3 px-6 py-2.5 text-xs font-extrabold tracking-widest text-ink hover:bg-surface-3 transition"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  )
}
