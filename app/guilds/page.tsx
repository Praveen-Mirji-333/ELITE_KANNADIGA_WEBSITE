'use client'

import { useState, useEffect } from 'react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
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
      <SitePage>
        <div className="site-container flex min-h-[70vh] flex-col items-center justify-center py-24 text-center">
          <div className="card max-w-xl p-8 sm:p-10">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-line bg-surface-2 text-ink-subtle">
              <Shield size={28} />
            </span>
            <h1 className="mt-5 text-2xl font-bold tracking-tight text-ink">
              Guild section offline
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              The guild section is currently hidden by the site administrator.
              Please check back later.
            </p>
            <a href="/" className="btn-primary mt-6">
              Return home
            </a>
          </div>
        </div>
      </SitePage>
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
    <SitePage>
      {notification && (
        <div className="fixed right-4 top-20 z-[95] animate-fade-up">
          <div
            className={`flex items-center gap-2.5 rounded-lg border px-4 py-3 text-xs font-semibold shadow-xl ${
              notification.type === 'success'
                ? 'border-line-strong bg-surface-3 text-ink'
                : 'border-brand-border bg-brand-muted text-brand-bright'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {notification.text}
          </div>
        </div>
      )}

      <div className="site-container pb-20 pt-16 sm:pt-20 lg:pb-28">
        <PageHeader
          kicker="Official competitive guild"
          title={
            <>
              ELITE <span className="text-brand-bright">ARMY</span>
            </>
          }
          description="The official competitive Free Fire squad of ELITE ಕನ್ನಡಿಗ. Members are ranked by squad position with verified kills and glory contributions."
          meta={
            <>
              <span className="badge">{guildInfo?.members?.length || 0} members</span>
              <span className="badge">Official roster</span>
              <span className="badge">Verified stats</span>
            </>
          }
          actions={
            isAdmin ? (
              <button
                type="button"
                onClick={() => {
                  setNewRanking(String((guildInfo?.members?.length || 0) + 1))
                  setIsAddModalOpen(true)
                }}
                className="btn-primary"
              >
                <Plus size={16} />
                Add member
              </button>
            ) : undefined
          }
        />

        {/* Guild owner */}
        <div className="card mb-8 sm:mb-10">
          <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg border border-brand-border bg-surface-2 sm:h-20 sm:w-20">
                {ownerProfile?.avatar_url ? (
                  <img
                    src={ownerProfile.avatar_url}
                    alt="ELITE ಕನ್ನಡಿಗ"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Crown size={28} className="text-brand-bright" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-brand">
                    <Crown size={12} />
                    Guild owner
                  </span>
                  <span className="badge">Founder</span>
                </div>

                <h2 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                  ELITE <span className="font-kannada text-brand-bright">ಕನ್ನಡಿಗ</span>
                </h2>

                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-subtle">
                  <span className="font-mono text-brand-bright">UID 1969913248</span>
                  <span aria-hidden="true">·</span>
                  <span>Official guild leader</span>
                  {ownerProfile?.level && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span>Level {ownerProfile.level}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-6 border-t border-line-subtle pt-5 lg:w-auto lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div>
                <p className="label">Total squad kills</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
                  {guildInfo?.members
                    ? guildInfo.members
                        .reduce((acc, m) => acc + (m.kills || 0), 0)
                        .toLocaleString()
                    : '0'}
                </p>
              </div>
              <div>
                <p className="label">Guild glory</p>
                <p className="mt-1 text-2xl font-bold tracking-tight text-ink">
                  {guildInfo?.guild?.glory_points?.toLocaleString() || '250,000'}
                  <span className="ml-1 text-xs font-medium text-ink-subtle">GP</span>
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
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="kicker">
                    <span className="kicker-line" aria-hidden="true" />
                    Official roster
                  </p>
                  <h2 className="display-section mt-2">Competitive rankings</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="badge">{rankedMembers.length} active</span>
                  {isAdmin && (
                    <div className="sm:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setNewRanking(String((guildInfo?.members?.length || 0) + 1))
                          setIsAddModalOpen(true)
                        }}
                        className="btn-secondary btn-sm"
                      >
                        <Plus size={14} />
                        Add
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="card divide-y divide-line-subtle overflow-hidden">
                {rankedMembers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                    <span className="grid h-12 w-12 place-items-center rounded-lg border border-line bg-surface-2 text-ink-subtle">
                      <ShieldCheck size={22} />
                    </span>
                    <p className="mt-4 text-sm font-semibold text-ink">
                      No guild members yet
                    </p>
                    <p className="mt-1 max-w-sm text-xs text-ink-subtle">
                      {isAdmin
                        ? 'Add your first member by selecting from the registered players list.'
                        : 'The official roster is being updated. Please check back soon.'}
                    </p>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setNewRanking('1')
                          setIsAddModalOpen(true)
                        }}
                        className="btn-primary btn-sm mt-5"
                      >
                        <Plus size={14} />
                        Add first member
                      </button>
                    )}
                  </div>
                ) : (
                  rankedMembers.map((m: any, index: number) => {
                    const assignedRank = m.ranking ?? (index + 1)
                    const role =
                      normalizeGuildRole(m.guild_role)
                        .replace(/[^\p{L}\s]/gu, '')
                        .trim() || 'Member'
                    const isLeader = role.toLowerCase().includes('leader')

                    return (
                      <div
                        key={m.id || index}
                        className={`flex flex-col gap-4 px-4 py-4 transition-colors hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${
                          assignedRank === 1 ? 'bg-brand-muted' : ''
                        }`}
                      >
                        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                          <span
                            className={`w-7 shrink-0 text-center text-sm font-bold tabular-nums ${
                              assignedRank === 1
                                ? 'text-brand-bright'
                                : 'text-ink-subtle'
                            }`}
                          >
                            #{assignedRank}
                          </span>

                          <UserAvatar
                            src={m.profiles?.avatar_url}
                            name={m.profiles?.ign || m.player_name}
                            size="md"
                            className="h-10 w-10 shrink-0 border border-line sm:h-11 sm:w-11"
                          />

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <h3 className="truncate text-sm font-semibold text-ink">
                                {m.profiles?.ign || m.player_name || 'ELITE PLAYER'}
                              </h3>
                              <span
                                className={`badge ${
                                  isLeader
                                    ? 'border-brand-border bg-brand-muted text-brand-bright'
                                    : ''
                                }`}
                              >
                                {role}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-xs text-ink-subtle">
                              ID {m.profiles?.player_id || 'N/A'} · UID{' '}
                              {m.profiles?.free_fire_uid || 'N/A'} · Level{' '}
                              {m.profiles?.level || 1}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-4 border-t border-line-subtle pt-3 sm:justify-end sm:border-0 sm:pt-0">
                          <div className="flex items-center gap-4">
                            <div>
                              <p className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                                <Swords size={13} className="text-brand-bright" />
                                {(m.kills || 0).toLocaleString()}
                              </p>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                                Kills
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-ink">
                                {(m.glory_contributed || 1000).toLocaleString()}
                              </p>
                              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                                Glory
                              </p>
                            </div>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center gap-1 border-l border-line-subtle pl-2">
                              <button
                                type="button"
                                onClick={() => setEditingMember(m)}
                                className="grid h-9 w-9 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
                                title="Edit ranking, kills and role"
                                aria-label={`Edit ${m.profiles?.ign || m.player_name}`}
                              >
                                <Edit2 size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteGuildPlayer(m.id, m.user_id)}
                                className="grid h-9 w-9 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-brand-muted hover:text-brand-bright"
                                title="Remove member from guild"
                                aria-label={`Remove ${m.profiles?.ign || m.player_name}`}
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
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Add guild member">
          <div className="modal-panel relative max-w-lg space-y-4 p-5 sm:p-6">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="border-b border-line-subtle pb-3">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <Plus size={19} className="text-brand-bright" />
                Add guild member
              </h3>
              <p className="mt-1 text-xs text-ink-muted">
                Select a registered player and assign their roster position, kills, and role.
              </p>
            </div>

            <form onSubmit={handleAddGuildPlayer} className="space-y-4">
              {/* Registered Player Selection */}
              <div className="space-y-2 rounded-lg border border-line-subtle bg-surface-2 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="label">
                    1. SELECT REGISTERED PLAYER *
                  </label>
                  <span className="text-xs text-ink-subtle">
                    {registeredPlayers.length} Registered
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search by IGN, Player ID or Free Fire UID..."
                    value={playerSearchQuery}
                    onChange={(e) => setPlayerSearchQuery(e.target.value)}
                    className="field h-10"
                  />
                </div>

                <select
                  required
                  value={selectedPlayerId}
                  onChange={(e) => setSelectedPlayerId(e.target.value)}
                  className="field h-10"
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
                    <div className="mt-2 flex items-center gap-3 border-t border-line-subtle pt-2">
                      <UserAvatar src={sel.avatar_url} name={sel.ign || sel.username} size="sm" />
                      <div>
                        <p className="text-xs font-bold text-ink">{sel.ign || sel.username}</p>
                        <p className="text-xs text-ink-subtle">
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
                  <label className="mb-1 block label">
                    2. ASSIGN RANKING *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="e.g. 1"
                    value={newRanking}
                    onChange={(e) => setNewRanking(e.target.value)}
                    className="field h-10 text-brand-bright font-semibold"
                  />
                  <span className="text-xs text-ink-subtle">Roster position (#1, #2...)</span>
                </div>

                <div>
                  <label className="mb-1 block label">
                    3. PLAYER KILLS *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="e.g. 250"
                    value={newKills}
                    onChange={(e) => setNewKills(e.target.value)}
                    className="field h-10 text-brand-bright font-semibold"
                  />
                  <span className="text-xs text-ink-subtle">Total kills to showcase</span>
                </div>
              </div>

              {/* Glory & Guild Role */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block label">
                    4. GLORY POINTS *
                  </label>
                  <input
                    type="number"
                    required
                    value={newGlory}
                    onChange={(e) => setNewGlory(e.target.value)}
                    className="field h-10"
                  />
                  <span className="text-xs text-ink-subtle">Initial GP contribution</span>
                </div>

                <div>
                  <label className="mb-1 block label">
                    5. GUILD ROLE
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="field h-10"
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
                className="btn-primary w-full"
              >
                {submitting ? 'ADDING MEMBER...' : 'ADD PLAYER TO ELITE ARMY'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Admin: Edit Guild Member Modal */}
      {editingMember && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Edit guild member">
          <div className="modal-panel relative max-w-md space-y-4 p-5 sm:p-6">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close"
            >
              <X size={19} />
            </button>

            <div className="flex items-center gap-3 border-b border-line-subtle pb-4">
              <UserAvatar
                src={editingMember.profiles?.avatar_url}
                name={editingMember.player_name || editingMember.profiles?.ign}
                size="md"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-ink">
                  Edit guild player
                </h3>
                <p className="truncate text-sm font-medium text-ink-muted">
                  {editingMember.player_name || editingMember.profiles?.ign || 'ELITE PLAYER'}
                </p>
                <p className="truncate text-xs text-ink-subtle">
                  ID {editingMember.profiles?.player_id || 'N/A'} · UID{' '}
                  {editingMember.profiles?.free_fire_uid || 'N/A'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedMember} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-brand-bright">
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
                    className="field h-10 text-brand-bright font-semibold"
                  />
                  <span className="text-xs text-ink-subtle">Roster position</span>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-brand-bright">
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
                    className="field h-10 text-brand-bright font-semibold"
                  />
                  <span className="text-xs text-ink-subtle">Total kills display</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-ink-muted">
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
                    className="field h-10"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold uppercase text-ink-muted">
                    GUILD ROLE
                  </label>
                  <select
                    value={normalizeGuildRole(editingMember.guild_role)}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, guild_role: e.target.value })
                    }
                    className="field h-10"
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
                className="btn-primary w-full"
              >
                {submitting ? 'SAVING CHANGES...' : 'SAVE PLAYER DETAILS'}
              </button>
            </form>
          </div>
        </div>
      )}

    </SitePage>
  )
}
