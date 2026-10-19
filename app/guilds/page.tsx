'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '../../components/Navbar'
import { Footer } from '../../components/Footer'
import { Shield, Plus, Edit2, Trash2, X, ShieldCheck, Swords, Search, CheckCircle2, AlertCircle, Crown } from 'lucide-react'
import {
  fetchEliteArmyGuild,
  fetchSiteSetting,
  getUserProfile,
  fetchRegisteredPlayers,
  addGuildMember,
  updateGuildMemberDetails,
  deleteGuildMember,
  findPlayerProfileByUid,
  GUILD_ROLES,
  normalizeGuildRole,
} from '../../lib/supabase'
import { UserAvatar } from '../../components/ui/UserAvatar'
import { Profile, GuildMember } from '../../lib/types'

export default function GuildsPage() {
  const [guildInfo, setGuildInfo] = useState<{ guild: any; members: GuildMember[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGuildSection, setShowGuildSection] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [registeredPlayers, setRegisteredPlayers] = useState<Profile[]>([])
  const [ownerProfile, setOwnerProfile] = useState<{ ign?: string; avatar_url?: string | null; level?: number; player_id?: string } | null>(null)

  // Admin Modals & Controls State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<GuildMember | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [newRanking, setNewRanking] = useState('1')
  const [newKills, setNewKills] = useState('0')
  const [newGlory, setNewGlory] = useState('1000')
  const [newRole, setNewRole] = useState<string>('👤 Member')
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 4000)
  }

  async function load() {
    try {
      const [isVisible, prof, data, players, owner] = await Promise.all([
        fetchSiteSetting('show_guild_section', 'true'),
        getUserProfile(),
        fetchEliteArmyGuild(),
        fetchRegisteredPlayers(),
        findPlayerProfileByUid('1969913248'),
      ])
      setShowGuildSection(isVisible)
      setIsAdmin(prof?.role === 'admin')
      setGuildInfo(data as any)
      setRegisteredPlayers(players || [])
      setOwnerProfile(owner)
      setNewRanking(String((data?.members?.length || 0) + 1))
      setLoading(false)
    } catch (err) {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()

    const handleUpdate = () => {
      load()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_updated', handleUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_updated', handleUpdate)
      }
    }
  }, [])

  // Admin: Add Guild Member Handler
  const handleAddGuildPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlayerId || !guildInfo?.guild) {
      showNotification('Please select a registered player from the list!', 'error')
      return
    }

    setSubmitting(true)
    const selectedPlayer = registeredPlayers.find((p) => p.id === selectedPlayerId)
    const res = await addGuildMember({
      guildId: guildInfo.guild.id,
      userId: selectedPlayerId,
      role: newRole,
      glory: parseInt(newGlory) || 1000,
      ranking: parseInt(newRanking) || ((guildInfo.members?.length || 0) + 1),
      kills: parseInt(newKills) || 0,
    })
    setSubmitting(false)

    if (res.success) {
      showNotification(`Player ${selectedPlayer?.ign || selectedPlayer?.username || 'Member'} added to ELITE ARMY!`)
      setIsAddModalOpen(false)
      setSelectedPlayerId('')
      setPlayerSearchQuery('')
      setNewKills('0')
      setNewGlory('1000')
      load()
    } else {
      showNotification(res.error || 'Failed to add player to guild', 'error')
    }
  }

  // Admin: Save Edited Guild Member Handler
  const handleSaveEditedMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    setSubmitting(true)
    const res = await updateGuildMemberDetails(editingMember.id, {
      role: editingMember.guild_role,
      glory: parseInt(String(editingMember.glory_contributed)) || 0,
      ranking: parseInt(String(editingMember.ranking)) || 1,
      kills: parseInt(String(editingMember.kills)) || 0,
      userId: editingMember.user_id,
    })
    setSubmitting(false)

    if (res.success) {
      showNotification('Guild member details updated successfully!')
      setEditingMember(null)
      load()
    } else {
      showNotification(res.error || 'Failed to update member', 'error')
    }
  }

  // Admin: Delete Guild Member Handler
  const handleDeleteGuildPlayer = async (memberId: string, userId?: string) => {
    if (!confirm('Are you sure you want to remove this player from the official ELITE ARMY roster?')) return
    const res = await deleteGuildMember(memberId, userId)
    if (res.success) {
      showNotification('Player removed from ELITE ARMY.', 'success')
      load()
    } else {
      showNotification(res.error || 'Failed to remove player', 'error')
    }
  }

  if (!loading && !showGuildSection && !isAdmin) {
    return (
      <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
        <div className="noise" />
        <Navbar />
        <div className="mx-auto max-w-[1440px] px-5 pt-40 pb-24 lg:px-10 flex flex-col items-center justify-center text-center">
          <div className="angular-panel border border-red-900/60 bg-gradient-to-b from-red-950/40 to-black p-12 max-w-xl w-full">
            <Shield className="mx-auto text-red-500 mb-4" size={56} />
            <h1 className="font-display text-3xl font-black uppercase text-white mb-2">
              GUILD SECTION OFFLINE
            </h1>
            <p className="text-sm text-white/60 mb-6">
              The Guild section is currently hidden by the site administrator. Please check back later.
            </p>
            <a
              href="/"
              className="inline-block cut-button bg-red-600 px-6 py-3 text-xs font-black tracking-widest text-white transition hover:bg-red-500"
            >
              RETURN TO HOME
            </a>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  const filteredPlayers = registeredPlayers.filter((p) => {
    if (!playerSearchQuery.trim()) return true
    const q = playerSearchQuery.toLowerCase()
    return (
      (p.ign && p.ign.toLowerCase().includes(q)) ||
      (p.username && p.username.toLowerCase().includes(q)) ||
      (p.player_id && p.player_id.toLowerCase().includes(q)) ||
      (p.free_fire_uid && p.free_fire_uid.toLowerCase().includes(q))
    )
  })

  return (
    <main className="min-h-screen bg-[#050505] text-[#f5f5f5]">
      <div className="noise" />
      <Navbar />

      {/* Floating Notification */}
      {notification && (
        <div className="fixed top-20 right-4 z-50 animate-bounce">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded border text-xs font-black uppercase tracking-wider shadow-2xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-300'
                : 'bg-red-950/90 border-red-500 text-red-300'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.text}
          </div>
        </div>
      )}

      <div className="site-container pt-24 sm:pt-32 pb-20 sm:pb-28">
        {/* Page Header */}
        <div className="mb-8 sm:mb-12 border-b border-white/10 pb-6 sm:pb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="eyebrow mb-2 sm:mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-red-600" /> OFFICIAL COMPETITIVE GUILD
            </p>
            <h1 className="font-display text-3xl font-black uppercase text-white sm:text-5xl lg:text-6xl 2xl:text-7xl tracking-tight">
              ELITE <span className="text-metallic">ARMY</span>
            </h1>
            <p className="mt-3 sm:mt-4 max-w-2xl text-xs leading-relaxed text-white/60 sm:text-sm 2xl:text-base">
              The single official competitive Free Fire squad of ELITE Kannada. Members are ranked by squad ranking with verified kills and glory contributions.
            </p>
          </div>

          {/* Admin Guild Quick Action */}
          {isAdmin && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setNewRanking(String((guildInfo?.members?.length || 0) + 1))
                  setIsAddModalOpen(true)
                }}
                className="cut-button flex items-center gap-2 bg-red-600 px-5 py-3 text-xs font-black tracking-widest text-white transition hover:bg-red-500 shadow-xl"
              >
                <Plus size={16} /> ADD GUILD MEMBER
              </button>
            </div>
          )}
        </div>

        {/* Guild Owner Showcase Card (Replacing horizontal large text card) */}
        <div className="angular-panel border border-amber-500/60 bg-gradient-to-r from-amber-950/50 via-[#180d08] to-black p-5 sm:p-7 mb-8 sm:mb-12 relative overflow-hidden shadow-[0_0_35px_rgba(245,158,11,0.18)]">
          {/* Ambient lighting effects */}
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-red-600/10 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-70" />

          <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            {/* Left: Guild Owner Identity & Unranked Status */}
            <div className="flex items-center gap-4 sm:gap-6 min-w-0">
              <div className="relative shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-xl border-2 border-amber-400 bg-black/90 p-1 shadow-[0_0_25px_rgba(245,158,11,0.4)] flex items-center justify-center overflow-hidden">
                  {ownerProfile?.avatar_url ? (
                    <img
                      src={ownerProfile.avatar_url}
                      alt="ELITE ಕನ್ನಡಿಗ"
                      className="h-full w-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-br from-amber-600 via-red-700 to-black rounded-lg flex items-center justify-center font-display font-black text-white text-xl sm:text-2xl">
                      👑
                    </div>
                  )}
                </div>
                <div className="absolute -top-2.5 -right-2 bg-gradient-to-r from-amber-400 to-yellow-500 text-black px-1.5 py-0.5 rounded-full shadow-lg border border-black flex items-center gap-0.5">
                  <Crown size={12} className="fill-black stroke-black" />
                </div>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="border border-amber-500/70 bg-gradient-to-r from-amber-500/25 to-yellow-500/15 px-3 py-0.5 text-[9px] sm:text-[10px] font-black tracking-widest text-amber-300 uppercase rounded inline-flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                    <Crown size={13} className="text-amber-400 fill-amber-400" /> GUILD OWNER
                  </span>
                  <span className="border border-white/10 bg-white/5 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-bold text-white/50 uppercase rounded tracking-wider">
                    FOUNDER • UNRANKED
                  </span>
                </div>

                <h2 className="font-display text-2xl sm:text-3xl lg:text-4xl font-black text-white mt-1.5 tracking-tight flex items-center gap-2">
                  <span>ELITE <span className="text-amber-400">ಕನ್ನಡಿಗ</span></span>
                </h2>

                <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-xs font-bold text-white/60 mt-1">
                  <span className="inline-flex items-center gap-1.5 text-amber-300 bg-amber-950/60 border border-amber-500/40 px-2.5 py-0.5 rounded text-[11px] sm:text-xs font-mono font-bold tracking-wide">
                    UID: <strong className="text-white tracking-widest font-black">1969913248</strong>
                  </span>
                  <span className="text-white/30 hidden sm:inline">•</span>
                  <span className="text-[11px] sm:text-xs text-white/70 uppercase tracking-wider font-extrabold">
                    OFFICIAL GUILD LEADER
                  </span>
                  {ownerProfile?.level && (
                    <>
                      <span className="text-white/30 hidden sm:inline">•</span>
                      <span className="text-[11px] sm:text-xs text-white/50">
                        LVL {ownerProfile.level}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Guild Stats (Squad Kills & Guild Glory) */}
            <div className="flex items-center gap-6 sm:gap-8 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-8 w-full lg:w-auto justify-between lg:justify-end shrink-0">
              <div>
                <p className="label text-[10px] sm:text-xs text-white/50 uppercase font-black tracking-wider">TOTAL SQUAD KILLS</p>
                <p className="font-display text-2xl sm:text-3xl font-black text-amber-400 mt-0.5 sm:mt-1">
                  {guildInfo?.members
                    ? guildInfo.members.reduce((acc, m) => acc + (m.kills || 0), 0).toLocaleString()
                    : '0'}{' '}
                  KILLS
                </p>
              </div>
              <div className="border-l border-white/10 pl-6 sm:pl-8">
                <p className="label text-[10px] sm:text-xs text-white/50 uppercase font-black tracking-wider">TOTAL GUILD GLORY</p>
                <p className="font-display text-2xl sm:text-3xl font-black text-red-500 mt-0.5 sm:mt-1">
                  {guildInfo?.guild?.glory_points?.toLocaleString() || '250,000'} GP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Player Roster Section */}
        {(() => {
          const rankedMembers = (guildInfo?.members || []).filter(
            (m) =>
              m.profiles?.free_fire_uid !== '1969913248' &&
              m.player_name !== 'ELITE ಕನ್ನಡಿಗ' &&
              m.profiles?.ign !== 'ELITE ಕನ್ನಡಿಗ'
          )

          return (
            <div>
              <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="eyebrow flex items-center gap-2">
                    <Swords size={14} className="text-red-500" /> ELITE ARMY SQUAD ROSTER
                  </p>
                  <h3 className="font-display text-xl sm:text-2xl font-black text-white">
                    OFFICIAL COMPETITIVE RANKINGS & KILLS
                  </h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] sm:text-xs font-bold text-white/50 shrink-0">
                    {rankedMembers.length} MEMBERS ACTIVE
                  </span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setNewRanking(String((guildInfo?.members?.length || 0) + 1))
                        setIsAddModalOpen(true)
                      }}
                      className="sm:hidden flex items-center gap-1.5 bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase text-white tracking-wider"
                    >
                      <Plus size={13} /> ADD MEMBER
                    </button>
                  )}
                </div>
              </div>

              <div className="divide-y divide-white/10 border border-white/10 bg-white/5">
                {rankedMembers.length === 0 ? (
                  <div className="p-12 text-center text-white/50 space-y-3">
                    <ShieldCheck className="mx-auto text-white/30" size={48} />
                    <p className="font-display text-base font-black uppercase text-white/70">
                      NO GUILD MEMBERS REGISTERED YET
                    </p>
                    <p className="text-xs text-white/40 max-w-sm mx-auto">
                      {isAdmin
                        ? 'Click the button below to add your first member by selecting from registered players.'
                        : 'The official roster is currently being updated. Please check back soon.'}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewRanking('1')
                          setIsAddModalOpen(true)
                        }}
                        className="mt-2 inline-flex items-center gap-2 bg-red-600 px-4 py-2 text-xs font-black tracking-widest text-white uppercase hover:bg-red-500"
                      >
                        <Plus size={14} /> ADD FIRST GUILD MEMBER
                      </button>
                    )}
                  </div>
                ) : (
                  rankedMembers.map((m: any, index: number) => {
                const assignedRank = m.ranking ?? (index + 1)
                return (
                  <div
                    key={m.id || index}
                    className="p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-white/5"
                  >
                    {/* Left: Rank, Avatar, IGN, Role, ID */}
                    <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                      <span
                        className={`font-display text-lg sm:text-2xl font-black w-7 sm:w-10 shrink-0 ${
                          assignedRank === 1
                            ? 'text-red-500'
                            : assignedRank === 2
                            ? 'text-amber-400'
                            : assignedRank === 3
                            ? 'text-slate-300'
                            : 'text-white/40'
                        }`}
                      >
                        #{assignedRank}
                      </span>

                      <div className="shrink-0">
                        <UserAvatar
                          src={m.profiles?.avatar_url}
                          name={m.profiles?.ign || m.player_name}
                          size="md"
                          className="border border-white/20 h-10 w-10 sm:h-12 sm:w-12"
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          <h4 className="font-display text-sm sm:text-lg font-black text-white truncate">
                            {m.profiles?.ign || m.player_name || 'ELITE PLAYER'}
                          </h4>
                          <span className={`border px-2 py-0.5 text-[9px] sm:text-[10px] font-black tracking-wide rounded ${
                            (m.guild_role || '').includes('Leader')
                              ? 'border-amber-500/50 bg-amber-500/15 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                              : (m.guild_role || '').includes('Commander')
                              ? 'border-purple-500/50 bg-purple-500/15 text-purple-300'
                              : (m.guild_role || '').includes('Officer')
                              ? 'border-blue-500/50 bg-blue-500/15 text-blue-300'
                              : (m.guild_role || '').includes('Elder')
                              ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                              : 'border-white/15 bg-white/5 text-white/80'
                          }`}>
                            {normalizeGuildRole(m.guild_role)}
                          </span>
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-bold text-white/40 truncate mt-0.5">
                          ID: {m.profiles?.player_id || 'N/A'} • UID: {m.profiles?.free_fire_uid || 'N/A'} • LVL {m.profiles?.level || 1}
                        </p>
                      </div>
                    </div>

                    {/* Right: Kills, Glory Points, Admin Controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                      {/* Player Kills badge */}
                      <div className="text-left sm:text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-red-950/60 border border-red-600/40 text-red-400 font-display font-black text-xs sm:text-sm tracking-wide">
                          ⚔️ {(m.kills || 0).toLocaleString()} KILLS
                        </span>
                        <p className="text-[10px] font-bold text-white/50 mt-0.5 hidden sm:block">
                          VERIFIED KILLS
                        </p>
                      </div>

                      {/* Glory Points */}
                      <div className="text-right">
                        <p className="font-display text-sm sm:text-base font-black text-amber-400">
                          {(m.glory_contributed || 1000).toLocaleString()} GP
                        </p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-white/40 hidden sm:block">
                          GLORY
                        </p>
                      </div>

                      {/* Admin inline actions */}
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                          <button
                            type="button"
                            onClick={() => setEditingMember(m)}
                            className="p-1.5 rounded text-white/50 hover:text-amber-400 hover:bg-white/5 transition"
                            title="Edit Ranking, Kills & Role"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuildPlayer(m.id, m.user_id)}
                            className="p-1.5 rounded text-white/50 hover:text-red-500 hover:bg-white/5 transition"
                            title="Remove Member from Guild"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )
    })()}
  </div>

      {/* Admin: Add Guild Member Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg border border-red-600/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 text-white">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display text-xl font-black uppercase text-red-500 flex items-center gap-2">
                <Plus size={20} /> ADD GUILD MEMBER
              </h3>
              <p className="text-xs text-white/60">
                Select a registered player from the list and assign their ranking and verified kills.
              </p>
            </div>

            <form onSubmit={handleAddGuildPlayer} className="space-y-4">
              {/* Registered Player Selection */}
              <div className="space-y-2 border border-white/10 bg-white/5 p-3.5 rounded">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                    1. SELECT REGISTERED PLAYER *
                  </label>
                  <span className="text-[10px] text-white/50">
                    {registeredPlayers.length} Registered
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by IGN, Player ID or Free Fire UID..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-white placeholder-white/30 focus:border-red-500 focus:outline-none"
                  />
                </div>

                <select
                  required
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="w-full border border-white/20 bg-[#121214] px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="">-- Choose from Registered Players List --</option>
                  {filteredPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ign || p.username} ({p.player_id || 'ID N/A'} • UID: {p.free_fire_uid || 'N/A'})
                    </option>
                  ))}
                </select>

                {/* Preview Selected Player */}
                {selectedPlayerId && (() => {
                  const sel = registeredPlayers.find((p) => p.id === selectedPlayerId)
                  if (!sel) return null
                  return (
                    <div className="flex items-center gap-3 pt-2 border-t border-white/10 mt-2">
                      <UserAvatar src={sel.avatar_url} name={sel.ign || sel.username} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-white">{sel.ign || sel.username}</p>
                        <p className="text-[10px] text-white/50">
                          ID: {sel.player_id || 'N/A'} • UID: {sel.free_fire_uid || 'N/A'} • Level {sel.level || 1}
                        </p>
                      </div>
                    </div>
                  )
                })()}
              </div>

              {/* Ranking & Kills */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-amber-400 uppercase">
                    2. ASSIGN RANKING *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 1"
                    value={newRanking}
                    onChange={(e) => setNewRanking(e.target.value)}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-amber-400 font-bold focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-white/40">Roster position (#1, #2...)</span>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-red-400 uppercase">
                    3. PLAYER KILLS *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 250"
                    value={newKills}
                    onChange={(e) => setNewKills(e.target.value)}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-red-400 font-bold focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-white/40">Total kills to showcase</span>
                </div>
              </div>

              {/* Glory & Guild Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/60 uppercase">
                    4. GLORY POINTS *
                  </label>
                  <input
                    type="number"
                    required
                    value={newGlory}
                    onChange={(e) => setNewGlory(e.target.value)}
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-white/40">Initial GP contribution</span>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/60 uppercase">
                    5. GUILD ROLE
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  >
                    {GUILD_ROLES.map((r) => (
                      <option key={r.rank} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 py-3 text-xs font-black tracking-widest text-white uppercase hover:bg-red-500 transition shadow-lg disabled:opacity-50"
              >
                {submitting ? 'ADDING MEMBER...' : 'ADD PLAYER TO ELITE ARMY'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Edit Guild Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <div className="relative w-full max-w-md border border-red-600/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 text-white">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="border-b border-white/10 pb-3 flex items-center gap-3">
              <UserAvatar
                src={editingMember.profiles?.avatar_url}
                name={editingMember.player_name || editingMember.profiles?.ign}
                size="md"
              />
              <div>
                <h3 className="font-display text-lg font-black uppercase text-red-500">
                  EDIT GUILD PLAYER
                </h3>
                <p className="text-xs text-white/80 font-bold">
                  {editingMember.player_name || editingMember.profiles?.ign || 'ELITE PLAYER'}
                </p>
                <p className="text-[10px] text-white/40">
                  ID: {editingMember.profiles?.player_id || 'N/A'} • UID: {editingMember.profiles?.free_fire_uid || 'N/A'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-amber-400">
                    ASSIGN RANKING *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingMember.ranking ?? 1}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, ranking: parseInt(e.target.value) || 1 })
                    }
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-amber-400 font-bold focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-white/40">Roster position</span>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-red-400">
                    PLAYER KILLS *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={editingMember.kills ?? 0}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, kills: parseInt(e.target.value) || 0 })
                    }
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-red-400 font-bold focus:border-red-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-white/40">Total kills display</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-white/60">
                    GLORY POINTS
                  </label>
                  <input
                    type="number"
                    required
                    value={editingMember.glory_contributed ?? 1000}
                    onChange={(e) =>
                      setEditingMember({
                        ...editingMember,
                        glory_contributed: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full border border-white/15 bg-black px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase text-white/60">
                    GUILD ROLE
                  </label>
                  <select
                    value={normalizeGuildRole(editingMember.guild_role)}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, guild_role: e.target.value })
                    }
                    className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  >
                    {GUILD_ROLES.map((r) => (
                      <option key={r.rank} value={r.name}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-red-600 py-3 text-xs font-black tracking-widest text-white uppercase hover:bg-red-500 transition shadow-lg disabled:opacity-50"
              >
                {submitting ? 'SAVING CHANGES...' : 'SAVE PLAYER DETAILS'}
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </main>
  )
}
