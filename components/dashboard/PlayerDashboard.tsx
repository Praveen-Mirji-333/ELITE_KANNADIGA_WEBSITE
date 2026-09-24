'use client'

import { useState, useEffect } from 'react'
import {
  Flame,
  Swords,
  X,
  LogOut,
  Save,
  Camera,
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
} from '../../lib/supabase'

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
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SETTINGS'>('OVERVIEW')
  const [registrations, setRegistrations] = useState<TournamentRegistration[]>([])

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
      free_fire_uid: editUid,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
      <div className="relative flex h-[90vh] w-full max-w-4xl flex-col border border-red-800/60 bg-[#0c0c0e] shadow-2xl overflow-hidden">
        {/* Header - Profile Photo positioned at top right corner */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#120607] px-6 py-4">
          {/* Left Side: User Info */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <h3 className="font-display text-2xl font-black uppercase text-white">{profile.ign}</h3>
              <span className="border border-red-600/40 bg-red-950/60 px-2.5 py-0.5 text-[10px] font-bold text-red-400">
                {profile.player_id}
              </span>
              {profile.role === 'admin' && (
                <span className="border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[9px] font-black tracking-widest text-amber-400">
                  ADMIN
                </span>
              )}
            </div>
            <p className="text-xs text-white/60">
              UID: <span className="font-mono font-bold text-white/90">{profile.free_fire_uid || 'Not Set'}</span> &bull; LEVEL {profile.level} WARRIOR
            </p>
          </div>

          {/* Right Side: Profile Photo on Right Corner & Controls */}
          <div className="flex items-center gap-4">
            <div className="relative group shrink-0" title="Click to upload new profile photo">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.ign}
                  className="h-14 w-14 rounded-full border-2 border-red-600 object-cover shadow-md shadow-red-950/60"
                />
              ) : (
                <div className="h-14 w-14 rounded-full border-2 border-red-600 bg-red-700 flex items-center justify-center shadow-md shadow-red-950/60">
                  <span className="text-base font-black text-white">
                    {(profile.ign || profile.username || 'P').slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              <label
                className="absolute inset-0 flex items-center justify-center bg-black/70 opacity-0 group-hover:opacity-100 rounded-full cursor-pointer transition"
                title="Upload Profile Photo"
              >
                <Camera size={18} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                  disabled={uploadingAvatar}
                />
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 border border-red-900/60 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-600 hover:text-white"
              >
                <LogOut size={14} /> LOGOUT
              </button>
              <button onClick={onClose} className="p-1 text-white/60 hover:text-white transition">
                <X size={22} />
              </button>
            </div>
          </div>
        </div>

        {/* Level XP Bar */}
        <div className="border-b border-white/10 bg-[#08080a] px-6 py-3">
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-bold tracking-widest text-white/70">
              LEVEL {profile.level} PROGRESS
            </span>
            <span className="font-display font-bold text-red-500">
              {profile.total_xp.toLocaleString()} / {nextLevelXp.toLocaleString()} TOTAL XP ({progressPercent}%)
            </span>
          </div>
          <div className="h-2.5 w-full bg-white/10">
            <div
              className="h-full bg-gradient-to-r from-red-800 via-red-600 to-amber-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Navigation Tabs (Only OVERVIEW and SETTINGS) */}
        <div className="flex border-b border-white/10 bg-[#050505] px-6">
          {(['OVERVIEW', 'SETTINGS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3.5 text-xs font-black tracking-widest transition ${activeTab === tab
                  ? 'border-b-2 border-red-600 text-white'
                  : 'text-white/40 hover:text-white'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-6">
              {/* Daily Streak Box */}
              <div className="flex flex-col items-start justify-between gap-4 border border-red-900/60 bg-gradient-to-r from-red-950/40 via-[#120607] to-black p-5 sm:flex-row sm:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <Flame className="text-amber-500" size={24} />
                    <h4 className="font-display text-lg font-black text-white">DAILY LOGIN STREAK</h4>
                  </div>
                  <p className="mt-1 text-xs text-white/60">
                    Current Streak: <strong className="text-amber-400">{profile.login_streak} Days</strong> (Longest: {profile.longest_login_streak} Days)
                  </p>
                  {claimStatus && <p className="mt-2 text-xs font-bold text-emerald-400">{claimStatus}</p>}
                </div>
                <button
                  onClick={handleDailyClaim}
                  disabled={claiming}
                  className="cut-button bg-red-600 px-5 py-3 text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  {claiming ? 'CLAIMING...' : 'CLAIM TODAY +10 XP'}
                </button>
              </div>

              {/* User Specific Stats Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-white/40">TOTAL XP</p>
                  <p className="font-display mt-1 text-2xl font-black text-red-500">
                    {profile.total_xp.toLocaleString()}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-white">
                    PLAYER LEVEL
                  </p>
                  <p className="font-display mt-1 text-2xl font-black text-white">
                    LVL {profile.level}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-white/40">MY REGISTRATIONS</p>
                  <p className="font-display mt-1 text-2xl font-black text-white">
                    {registrations.length}
                  </p>
                </div>
                <div className="border border-white/10 bg-white/5 p-4">
                  <p className="text-[10px] font-bold tracking-widest text-white/40">LOGIN STREAK</p>
                  <p className="font-display mt-1 text-2xl font-black text-amber-400">
                    {profile.login_streak} DAYS
                  </p>
                </div>
              </div>

              {/* Warrior Bio */}
              <div className="border border-white/10 bg-white/5 p-5">
                <h4 className="eyebrow mb-2">WARRIOR BIO</h4>
                <p className="text-sm leading-relaxed text-white/70">
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
                        className="flex flex-col sm:flex-row sm:items-center justify-between border border-white/10 bg-white/5 p-4 gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-widest text-red-500 uppercase">
                              {reg.tournaments?.game_mode || reg.tournaments?.tournament_type || 'FREE FIRE'}
                            </span>
                            {reg.tournaments?.status === 'completed' && (
                              <span className="border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[9px] font-bold text-amber-400">
                                COMPLETED
                              </span>
                            )}
                          </div>
                          <h5 className="font-display text-lg font-black text-amber-400">
                            {reg.tournaments?.title || 'ELITE TOURNAMENT'}
                          </h5>
                          <div className="mt-2 space-y-1 text-xs">
                            <p className="font-bold text-white">Team Name: <span className="text-amber-300">{reg.team_name || reg.captain_name}</span></p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] bg-black/40 p-2 border border-white/10 rounded mt-1">
                              <div className="text-white/80">
                                👑 Leader: <strong className="text-white">{reg.captain_name}</strong>
                                <span className="block font-mono text-[10px] text-amber-300">UID: {reg.captain_free_fire_uid || 'N/A'}</span>
                              </div>
                              <div className="text-white/80">
                                🎮 2nd Player: <strong className="text-white">{reg.teammate_names?.[0] || 'N/A'}</strong>
                                <span className="block font-mono text-[10px] text-amber-300/80">UID: {reg.teammate_uids?.[0] || 'N/A'}</span>
                              </div>
                              <div className="text-white/80">
                                🎮 3rd Player: <strong className="text-white">{reg.teammate_names?.[1] || 'N/A'}</strong>
                                <span className="block font-mono text-[10px] text-amber-300/80">UID: {reg.teammate_uids?.[1] || 'N/A'}</span>
                              </div>
                              <div className="text-white/80">
                                🎮 4th Player: <strong className="text-white">{reg.teammate_names?.[2] || 'N/A'}</strong>
                                <span className="block font-mono text-[10px] text-amber-300/80">UID: {reg.teammate_uids?.[2] || 'N/A'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right flex items-center sm:flex-col justify-between sm:justify-center gap-2">
                          <span className="border border-emerald-500/40 bg-emerald-950/40 px-3 py-1 text-[10px] font-bold uppercase text-emerald-400">
                            {reg.registration_status}
                          </span>
                          {reg.placement ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                              <span>
                                {reg.placement === 1 ? '🥇 1st Place Winner' : reg.placement === 2 ? '🥈 2nd Place Runner Up' : reg.placement === 3 ? '🥉 3rd Place' : `Rank #${reg.placement}`}
                              </span>
                              <span className="text-red-400">({reg.kills || 0} Kills)</span>
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

          {activeTab === 'SETTINGS' && (
            <div className="max-w-xl space-y-6">
              {/* Profile Photo Upload Section */}
              <div className="border border-white/10 bg-white/5 p-4 space-y-3">
                <h4 className="eyebrow flex items-center gap-2">
                  <Camera size={14} /> PROFILE PHOTO (STORED IN SUPABASE)
                </h4>
                <div className="flex items-center gap-4">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.ign}
                      className="h-16 w-16 rounded-full border-2 border-red-600 object-cover shrink-0"
                    />
                  ) : (
                    <div className="h-16 w-16 rounded-full border-2 border-red-600 bg-red-700 flex items-center justify-center shrink-0">
                      <span className="text-lg font-black text-white">
                        {(profile.ign || profile.username || 'P').slice(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="cut-button inline-flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-black tracking-widest text-white cursor-pointer transition">
                      <Camera size={14} /> {uploadingAvatar ? 'UPLOADING...' : 'UPLOAD NEW PHOTO'}
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        className="hidden"
                        disabled={uploadingAvatar}
                      />
                    </label>
                    <p className="text-[10px] text-white/50">Supported formats: JPG, PNG, WEBP. Uploads directly to Supabase storage.</p>
                    {avatarMsg && <p className="text-xs font-bold text-emerald-400">{avatarMsg}</p>}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h4 className="eyebrow">EDIT PROFILE DETAILS</h4>
                {saveMsg && (
                  <div className="border border-white/10 bg-white/5 p-3 text-xs text-emerald-400">
                    {saveMsg}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
                    IN-GAME NAME (IGN)
                  </label>
                  <input
                    type="text"
                    value={editIgn}
                    onChange={(e) => setEditIgn(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
                    FREE FIRE UID
                  </label>
                  <input
                    type="text"
                    value={editUid}
                    onChange={(e) => setEditUid(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold tracking-widest text-white/60">
                    WARRIOR BIO
                  </label>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="cut-button flex items-center gap-2 bg-red-600 px-6 py-3 text-xs font-black tracking-widest text-white transition hover:bg-red-500 disabled:opacity-50"
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
