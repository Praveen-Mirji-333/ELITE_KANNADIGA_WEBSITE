'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Flame,
  Swords,
  X,
  LogOut,
  Save,
  Camera,
  Radio,
} from 'lucide-react'
import {
  Profile,
  TournamentRegistration,
} from '../../lib/types'
import {
  supabase,
  claimDailyLoginReward,
  fetchUserRegistrations,
  updateUserProfile,
  uploadAvatarToSupabase,
  fetchSiteSetting,
} from '../../lib/supabase'
import { LiveTournamentSection } from './LiveTournamentSection'

interface PlayerDashboardProps {
  isOpen: boolean
  onClose: () => void
  profile: Profile | null
  onProfileUpdated: () => void
}

export function PlayerDashboard({
  isOpen,
  onClose,
  profile,
  onProfileUpdated,
}: PlayerDashboardProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'LIVE' | 'SETTINGS'>('OVERVIEW')
  const [showLiveSection, setShowLiveSection] = useState(false)
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])

  const loadLiveSetting = useCallback(async () => {
    const enabled = await fetchSiteSetting('show_user_dashboard_live_section', 'false')
    setShowLiveSection(enabled)
  }, [])

  useEffect(() => {
    loadLiveSetting()
    const handleSettingsUpdate = () => {
      loadLiveSetting()
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('site_settings_updated', handleSettingsUpdate)
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('site_settings_updated', handleSettingsUpdate)
      }
    }
  }, [loadLiveSetting])

  useEffect(() => {
    if (!showLiveSection && activeTab === 'LIVE') {
      setActiveTab('OVERVIEW')
    }
  }, [showLiveSection, activeTab])

  const [claiming, setClaiming] = useState(false)
  const [claimStatus, setClaimStatus] = useState('')

  // Edit State
  const [editIgn, setEditIgn] = useState('')
  const [editUid, setEditUid] = useState('')
  const [editBio, setEditBio] = useState('')
  const [savingEdit, setSavingEdit] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarMsg, setAvatarMsg] = useState('')

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploadingAvatar(true)
    setAvatarMsg('')
    const res = await uploadAvatarToSupabase(file, profile.id)
    setUploadingAvatar(false)
    if (res.success) {
      setAvatarMsg('Profile photo updated successfully!')
      onProfileUpdated()
    } else {
      setAvatarMsg(res.error || 'Failed to upload profile photo.')
    }
  }

  useEffect(() => {
    if (profile) {
      setEditIgn(profile.ign || '')
      setEditUid(profile.free_fire_uid || '')
      setEditBio(profile.bio || '')
      loadUserData()
    }
  }, [profile])

  async function loadUserData() {
    if (!profile) return
    const regs = await fetchUserRegistrations(profile.id)
    setRegistrations(regs)
  }

  if (!isOpen || !profile) return null

  const handleDailyClaim = async () => {
    setClaiming(true)
    setClaimStatus('')
    const res = await claimDailyLoginReward()
    setClaiming(false)
    if (res.success) {
      setClaimStatus(`+${res.xp_earned || 10} XP Claimed! Current streak: ${res.streak || 1} Days`)
      onProfileUpdated()
      loadUserData()
    } else {
      setClaimStatus(res.message || 'Already claimed today!')
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEdit(true)
    setSaveMsg('')

    const res = await updateUserProfile({
      ign: editIgn,
      ...(profile.free_fire_uid ? {} : { free_fire_uid: editUid }),
      bio: editBio,
    })

    setSavingEdit(false)
    if (res.success) {
      setSaveMsg('Profile updated successfully!')
      onProfileUpdated()
    } else {
      setSaveMsg(res.error || 'Failed to update profile')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onProfileUpdated()
    onClose()
  }

  // Level progress math
  const nextLevelXp = Math.pow(profile.level, 2) * 100
  const prevLevelXp = Math.pow(profile.level - 1, 2) * 100
  const xpCurrentRange = profile.total_xp - prevLevelXp
  const xpNeededRange = nextLevelXp - prevLevelXp
  const progressPercent = Math.min(100, Math.max(0, Math.floor((xpCurrentRange / xpNeededRange) * 100)))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-2 sm:p-4 backdrop-blur-md player-dashboard-root neu-theme">
      <div className="relative flex h-[94vh] sm:h-[90vh] w-full max-w-5xl 2xl:max-w-6xl 3xl:max-w-7xl flex-col modal-panel overflow-hidden">
        {/* Header - Profile Photo positioned at top right corner */}
        <div className="flex items-center justify-between border-b border-line-subtle bg-surface px-5 sm:px-8 py-4 sm:py-5 gap-3">
          {/* Left Side: User Info */}
          <div className="flex flex-col gap-1 min-w-0">
            <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
              <h3 className="font-display text-xl sm:text-3xl font-extrabold uppercase text-ink truncate max-w-[200px] sm:max-w-none">{profile.ign}</h3>
              <span className="border border-brand bg-brand-muted px-2.5 sm:px-3 py-1 text-xs font-bold text-brand-bright">
                {profile.player_id}
              </span>
              {profile.role === 'admin' && (
                <span className="border border-brand bg-brand-muted px-2.5 py-1 text-xs font-extrabold tracking-widest text-brand-bright">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-ink-muted truncate">
              UID: <span className="font-mono font-bold text-ink">{profile.free_fire_uid || 'Not Set'}</span> &bull; LEVEL {profile.level} WARRIOR
            </p>
          </div>

          {/* Right Side: Profile Photo on Right Corner & Controls */}
          <div className="flex items-center gap-3 sm:gap-5 shrink-0">
            <div className="relative group shrink-0" title="Click to upload new profile photo">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.ign}
                  className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-brand object-cover shadow-md shadow-brand/20"
                />
              ) : (
                <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-full border-2 border-brand bg-brand flex items-center justify-center shadow-md shadow-brand/20">
                  <span className="text-sm sm:text-lg font-extrabold text-ink">
                    {(profile.ign || profile.username || 'P').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <label
                className="absolute inset-0 flex items-center justify-center bg-canvas/70 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition"
                title="Upload Profile Photo"
              >
                <Camera size={18} className="text-ink" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 border border-brand-border bg-brand-muted px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold text-brand-bright transition hover:bg-brand hover:text-ink"
              >
                <LogOut size={14} /> <span className="hidden xs:inline">LOGOUT</span>
              </button>
              <button onClick={onClose} className="p-1.5 text-ink-muted hover:text-ink transition">
                <X size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="border-b border-line-subtle bg-surface px-5 sm:px-8 py-3 sm:py-3.5">
          <div className="mb-1.5 flex items-center justify-between text-xs sm:text-sm">
            <span className="font-bold tracking-widest text-ink">
              LEVEL {profile.level} PROGRESS
            </span>
            <span className="font-display font-bold text-brand-bright">
              {profile.total_xp.toLocaleString()} / {nextLevelXp.toLocaleString()} XP ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 sm:h-3 w-full bg-surface-3">
            <div
              className="h-full bg-gradient-to-r from-brand-muted via-brand to-brand transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-line-subtle bg-canvas px-5 sm:px-8 overflow-x-auto no-scrollbar">
          {[
            { id: 'OVERVIEW', label: 'OVERVIEW' },
            ...(showLiveSection
              ? [{ id: 'LIVE', label: 'LIVE ARENA', isLive: true }]
              : []),
            { id: 'SETTINGS', label: 'SETTINGS' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'OVERVIEW' | 'LIVE' | 'SETTINGS')}
              className={`flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-4 text-xs sm:text-sm font-extrabold tracking-widest transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-brand bg-brand-muted text-ink'
                  : 'text-ink-subtle hover:text-ink'
              }`}
            >
              {tab.isLive ? (
                <span className="flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand" />
                  </span>
                  <span className="text-brand-bright font-extrabold">LIVE ARENA</span>
                </span>
              ) : (
                tab.label
              )}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Daily Streak Box */}
              <div className="flex flex-col items-start justify-between gap-4 sm:gap-5 border border-brand-border bg-gradient-to-r from-brand-muted via-surface to-canvas p-5 sm:p-6 sm:flex-row sm:items-center shadow-lg">
                <div className="w-full sm:w-auto">
                  <div className="flex items-center gap-2.5">
                    <Flame className="text-brand-bright" size={26} />
                    <h4 className="font-display text-lg sm:text-xl font-extrabold text-ink">DAILY LOGIN STREAK</h4>
                  </div>
                  <p className="mt-1.5 text-xs sm:text-sm text-ink-muted">
                    Current Streak: <strong className="text-brand-bright">{profile.login_streak} Days</strong> (Longest: {profile.longest_login_streak} Days)
                  </p>
                  {claimStatus && <p className="mt-2 text-xs sm:text-sm font-bold text-ink">{claimStatus}</p>}
                </div>
                <button
                  onClick={handleDailyClaim}
                  disabled={claiming}
                  className="w-full sm:w-auto text-center cut-button bg-brand px-6 sm:px-8 py-3 sm:py-3.5 text-xs sm:text-sm font-extrabold tracking-widest text-ink transition hover:bg-brand disabled:opacity-50 shrink-0 shadow-lg"
                >
                  {claiming ? 'CLAIMING...' : 'CLAIM TODAY +10 XP'}
                </button>
              </div>

              {/* User Specific Stats Grid */}
              <div className="grid grid-cols-2 gap-3 sm:gap-5 sm:grid-cols-4">
                <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 min-w-0 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-ink-subtle truncate">TOTAL XP</p>
                  <p className="font-display mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-bright truncate">
                    {profile.total_xp.toLocaleString()}
                  </p>
                </div>
                <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 min-w-0 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-ink truncate">
                    PLAYER LEVEL
                  </p>
                  <p className="font-display mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink truncate">
                    LVL {profile.level}
                  </p>
                </div>
                <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 min-w-0 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-ink-subtle truncate">REGISTRATIONS</p>
                  <p className="font-display mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-ink truncate">
                    {registrations.length}
                  </p>
                </div>
                <div className="border border-line-subtle bg-surface-2 p-4 sm:p-5 min-w-0 shadow-sm">
                  <p className="text-xs font-bold tracking-wider text-ink-subtle truncate">LOGIN STREAK</p>
                  <p className="font-display mt-1 text-2xl sm:text-3xl lg:text-4xl font-extrabold text-brand-bright truncate">
                    {profile.login_streak} DAYS
                  </p>
                </div>
              </div>

              {/* Warrior Bio */}
              <div className="border border-line-subtle bg-surface-2 p-5">
                <h4 className="eyebrow mb-2">WARRIOR BIO</h4>
                <p className="text-sm leading-relaxed text-ink-muted">
                  {profile.bio || 'No warrior bio written yet.'}
                </p>
              </div>

              {/* User Specific Tournament Registrations */}
              {registrations.length > 0 && (
                <div className="space-y-4 pt-2">
                  <h4 className="eyebrow flex items-center gap-2">
                    <Swords size={16} /> YOUR TOURNAMENT REGISTRATIONS
                  </h4>
                  <div className="space-y-3">
                    {registrations.map((reg) => (
                      <div
                        key={reg.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between border border-line-subtle bg-surface-2 p-4 gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold tracking-widest text-brand-bright uppercase">
                              {reg.tournaments?.game_mode || reg.tournaments?.tournament_type || 'FREE FIRE'}
                            </span>
                            {reg.tournaments?.status === 'completed' && (
                              <span className="border border-brand bg-brand-muted px-2 py-0.5 text-xs font-bold text-brand-bright">
                                COMPLETED
                              </span>
                            )}
                          </div>
                          <h5 className="font-display text-lg font-extrabold text-brand-bright">
                            {reg.tournaments?.title || 'ELITE TOURNAMENT'}
                          </h5>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="font-bold text-ink">Team Name: <span className="text-brand-bright">{reg.team_name || reg.captain_name}</span></p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs bg-canvas/40 p-2 border border-line-subtle rounded mt-1">
                              <div className="text-ink">
                                👑 Leader: <strong className="text-ink">{reg.captain_name}</strong>
                                <span className="block font-mono text-xs text-brand-bright">UID: {reg.captain_free_fire_uid || 'N/A'}</span>
                              </div>
                              <div className="text-ink">
                                🎮 2nd Player: <strong className="text-ink">{reg.teammate_names?.[0] || 'N/A'}</strong>
                                <span className="block font-mono text-xs text-brand-bright">UID: {reg.teammate_uids?.[0] || 'N/A'}</span>
                              </div>
                              <div className="text-ink">
                                🎮 3rd Player: <strong className="text-ink">{reg.teammate_names?.[1] || 'N/A'}</strong>
                                <span className="block font-mono text-xs text-brand-bright">UID: {reg.teammate_uids?.[1] || 'N/A'}</span>
                              </div>
                              <div className="text-ink">
                                🎮 4th Player: <strong className="text-ink">{reg.teammate_names?.[2] || 'N/A'}</strong>
                                <span className="block font-mono text-xs text-brand-bright">UID: {reg.teammate_uids?.[2] || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center sm:flex-col justify-between sm:justify-center gap-2">
                          <span className="border border-line-strong bg-surface-3 px-3 py-1 text-xs font-bold uppercase text-ink">
                            {reg.registration_status}
                          </span>
                          {reg.placement ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-brand-bright">
                              <span>
                                {reg.placement === 1 ? '🥇 1st Place Winner' : reg.placement === 2 ? '🥈 2nd Place Runner Up' : reg.placement === 3 ? '🥉 3rd Place' : `Rank #${reg.placement}`}
                              </span>
                              <span className="text-brand-bright">({reg.kills || 0} Kills)</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'LIVE' && showLiveSection && (
            <LiveTournamentSection
              currentUserProfile={profile}
              onProfileUpdated={() => {
                onProfileUpdated()
                loadUserData()
              }}
            />
          )}

          {activeTab === 'SETTINGS' && (
            <div className="max-w-xl space-y-6">
              {/* Profile Photo Upload Section */}
              <div className="border border-line-subtle bg-surface-2 p-4 space-y-3">
                <h4 className="eyebrow flex items-center gap-2">
                  <Camera size={14} /> PROFILE PHOTO (STORED IN SUPABASE)
                </h4>
                <div className="flex items-center gap-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.ign}
                      className="h-16 w-16 rounded-full border-2 border-brand object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-brand bg-brand flex items-center justify-center shrink-0">
                      <span className="text-lg font-extrabold text-ink">
                        {(profile.ign || profile.username || 'P').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="cut-button inline-flex items-center gap-2 bg-brand hover:bg-brand px-4 py-2 text-xs font-extrabold tracking-widest text-ink cursor-pointer transition">
                      <Camera size={14} /> {uploadingAvatar ? 'UPLOADING...' : 'UPLOAD NEW PHOTO'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                    <p className="text-xs text-ink-subtle">Supported formats: JPG, PNG, WEBP. Uploads directly to Supabase storage.</p>
                    {avatarMsg && <p className="text-xs font-bold text-ink">{avatarMsg}</p>}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h4 className="eyebrow">EDIT PROFILE DETAILS</h4>
                {saveMsg && (
                  <div className="border border-line-subtle bg-surface-2 p-3 text-xs text-ink">
                    {saveMsg}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
                    IN-GAME NAME (IGN)
                  </label>
                  <input
                    type="text"
                    value={editIgn}
                    onChange={(e) => setEditIgn(e.target.value)}
                    className="w-full border border-line bg-surface-2 px-4 py-2.5 text-base sm:text-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
                {profile.email && (
                  <div>
                    <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
                      REGISTERED EMAIL (UNIQUE KEY)
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      readOnly
                      disabled
                      className="w-full cursor-not-allowed border border-line bg-surface-2/60 px-4 py-2.5 text-base sm:text-sm text-ink-muted focus:outline-none"
                    />
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
                    FREE FIRE UID {profile.free_fire_uid ? '(BOUND UNIQUE KEY)' : ''}
                  </label>
                  <input
                    type="text"
                    value={editUid}
                    onChange={(e) => setEditUid(e.target.value)}
                    readOnly={Boolean(profile.free_fire_uid)}
                    disabled={Boolean(profile.free_fire_uid)}
                    className={`w-full border border-line px-4 py-2.5 text-base sm:text-sm focus:outline-none ${
                      profile.free_fire_uid
                        ? 'cursor-not-allowed bg-surface-2/60 text-ink-muted'
                        : 'bg-surface-2 text-ink focus:border-brand'
                    }`}
                  />
                  {profile.free_fire_uid && (
                    <p className="mt-1 text-[11px] text-ink-subtle">
                      Permanently bound to your registered email (unique key).
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold tracking-widest text-ink-muted">
                    WARRIOR BIO
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full border border-line bg-surface-2 px-4 py-2.5 text-base sm:text-sm text-ink focus:border-brand focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="cut-button flex items-center gap-2 bg-brand px-6 py-3 text-xs font-extrabold tracking-widest text-ink transition hover:bg-brand disabled:opacity-50"
                >
                  <Save size={15} /> {savingEdit ? 'SAVING...' : 'SAVE CHANGES'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
