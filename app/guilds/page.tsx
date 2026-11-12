'use client'

import { useState, useEffect } from 'react'
import { SitePage } from '../../components/layout/SitePage'
import { PageHeader } from '../../components/layout/PageHeader'
import { Shield, Plus, Edit2, Trash2, X, ShieldCheck, Swords, Search, CheckCircle2, AlertCircle, Crown, Trophy, Flame } from 'lucide-react'
import {
  fetchEliteArmyGuild,
  fetchSiteSetting,
  getUserProfile,
  fetchRegisteredPlayers,
  addOrRegisterGuildMember,
  updateGuildMemberDetails,
  deleteGuildMember,
  findPlayerProfileByUid,
  fetchGuildChallenges,
  submitGuildChallenge,
  resolveGuildChallenge,
  deleteGuildChallenge,
  GUILD_ROLES,
  normalizeGuildRole,
} from '../../lib/supabase'
import { UserAvatar } from '../../components/ui/UserAvatar'
import { Profile, GuildMember, GuildChallenge, GuildChallengeStatus } from '../../lib/types'
import {
  MIN_CHALLENGE_GLORY,
  GUILD_RANK_TIERS,
  getGuildRoleRank,
  getHighestGloryMember,
  canMemberChallengeTarget,
  getMemberChallengeSummary,
} from '../../lib/guild-challenges'

export default function GuildsPage() {
  const [guildInfo, setGuildInfo] = useState<{ guild: any; members: GuildMember[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [showGuildSection, setShowGuildSection] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null)
  const [registeredPlayers, setRegisteredPlayers] = useState<Profile[]>([])
  const [ownerProfile, setOwnerProfile] = useState<{ ign?: string; avatar_url?: string | null; level?: number; player_id?: string } | null>(null)
  const [challenges, setChallenges] = useState<GuildChallenge[]>([])

  // Admin Modals & Controls State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<GuildMember | null>(null)
  const [selectedPlayerId, setSelectedPlayerId] = useState('')
  const [playerSearchQuery, setPlayerSearchQuery] = useState('')
  const [newUid, setNewUid] = useState('')
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newRanking, setNewRanking] = useState('1')
  const [newGlory, setNewGlory] = useState('1000')
  const [newRole, setNewRole] = useState<string>('👤 Member')
  const [submitting, setSubmitting] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // Guild Challenge Modal & Action State
  const [challengeTarget, setChallengeTarget] = useState<GuildMember | null>(null)
  const [challengeNote, setChallengeNote] = useState('')
  const [submittingChallenge, setSubmittingChallenge] = useState(false)
  const [resolvingChallengeId, setResolvingChallengeId] = useState<string | null>(null)

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
      const challengeList = await fetchGuildChallenges(data?.guild?.id)
      setShowGuildSection(isVisible)
      setCurrentUserProfile(prof)
      setIsAdmin(prof?.role === 'admin')
      setGuildInfo(data as any)
      setRegisteredPlayers(players || [])
      setOwnerProfile(owner)
      setChallenges(challengeList || [])
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

  const handleSelectRegisteredPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId)
    if (!playerId) return
    const sel = registeredPlayers.find((p) => p.id === playerId)
    if (sel) {
      setNewUid(sel.free_fire_uid || '')
      setNewPlayerName(sel.ign || sel.username || '')
    }
  }

  const handleGuildUidChange = (uidVal: string) => {
    const prevSelected = registeredPlayers.find((p) => p.id === selectedPlayerId)
    setNewUid(uidVal)
    const trimmed = uidVal.trim()
    if (!trimmed) {
      if (prevSelected?.free_fire_uid) {
        setSelectedPlayerId('')
      }
      return
    }
    const matched = registeredPlayers.find((p) => p.free_fire_uid?.trim() === trimmed)
    if (matched) {
      setSelectedPlayerId(matched.id)
      if (!newPlayerName.trim() || (prevSelected && newPlayerName.trim() === (prevSelected.ign || prevSelected.username || '').trim())) {
        setNewPlayerName(matched.ign || matched.username || '')
      }
    } else if (prevSelected && prevSelected.free_fire_uid?.trim() && prevSelected.free_fire_uid.trim() !== trimmed) {
      setSelectedPlayerId('')
    }
  }

  // Admin: Add Guild Member Handler
  const handleAddGuildPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guildInfo?.guild) {
      showNotification('Guild record not loaded yet. Please wait.', 'error')
      return
    }
    if (!selectedPlayerId && !newUid.trim()) {
      showNotification('Please select a registered player or enter a Free Fire UID!', 'error')
      return
    }
    if (!newPlayerName.trim()) {
      showNotification('Please enter the Name of the Player!', 'error')
      return
    }

    setSubmitting(true)
    const res = await addOrRegisterGuildMember({
      guildId: guildInfo.guild.id,
      selectedPlayerId,
      uid: newUid,
      playerName: newPlayerName,
      role: newRole,
      glory: parseInt(newGlory) || 1000,
      ranking: parseInt(newRanking) || ((guildInfo.members?.length || 0) + 1),
      kills: 0,
    })
    setSubmitting(false)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        res.wasNewlyRegistered
          ? `UID ${newUid.trim()} automatically registered as ${res.playerName || newPlayerName.trim()} and added to ELITE ARMY!`
          : `Player ${res.playerName || newPlayerName.trim()} added to ELITE ARMY!`
      )
      setIsAddModalOpen(false)
      setSelectedPlayerId('')
      setPlayerSearchQuery('')
      setNewUid('')
      setNewPlayerName('')
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
      playerName: editingMember.player_name,
    })
    setSubmitting(false)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
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
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Player removed from ELITE ARMY.', 'success')
      load()
    } else {
      showNotification(res.error || 'Failed to remove player', 'error')
    }
  }

  // Guild Rank Challenge Handlers
  const handleSubmitChallenge = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!challengeTarget || !myGuildMember || !guildInfo?.guild?.id) return

    setSubmittingChallenge(true)
    const res = await submitGuildChallenge({
      guildId: guildInfo.guild.id,
      challengerMemberId: myGuildMember.id,
      defenderMemberId: challengeTarget.id,
      note: challengeNote,
    })
    setSubmittingChallenge(false)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        `Rank challenge sent to ${challengeTarget.player_name || challengeTarget.profiles?.ign || 'defender'}!`
      )
      setChallengeTarget(null)
      setChallengeNote('')
      load()
    } else {
      showNotification(res.error || 'Failed to submit rank challenge', 'error')
    }
  }

  const handleResolveChallenge = async (challengeId: string, nextStatus: GuildChallengeStatus) => {
    if (
      nextStatus === 'challenger_won' &&
      !confirm('Confirm challenger won this duel? This will swap the ranks of challenger and defender.')
    ) {
      return
    }
    setResolvingChallengeId(challengeId)
    const res = await resolveGuildChallenge(challengeId, nextStatus, {
      swapRanksOnWin: nextStatus === 'challenger_won',
    })
    setResolvingChallengeId(null)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        nextStatus === 'challenger_won'
          ? 'Challenge resolved — ranks swapped successfully!'
          : `Challenge marked as ${nextStatus.replace('_', ' ')}.`
      )
      load()
    } else {
      showNotification(res.error || 'Failed to update challenge', 'error')
    }
  }

  const handleDeleteChallenge = async (challengeId: string) => {
    if (!confirm('Remove this rank challenge record?')) return
    setResolvingChallengeId(challengeId)
    const res = await deleteGuildChallenge(challengeId)
    setResolvingChallengeId(null)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Challenge record removed.')
      load()
    } else {
      showNotification(res.error || 'Failed to remove challenge', 'error')
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

  const rankedMembers = (guildInfo?.members || []).filter(
    (m) =>
      m.profiles?.free_fire_uid !== '1969913248' &&
      m.player_name !== 'ELITE ಕನ್ನಡಿಗ' &&
      m.profiles?.ign !== 'ELITE ಕನ್ನಡಿಗ'
  )

  const hasRosterLeader = rankedMembers.some((m) => getGuildRoleRank(m.guild_role) === 1)

  const myGuildMember = currentUserProfile
    ? rankedMembers.find(
        (m) =>
          (m.user_id && m.user_id === currentUserProfile.id) ||
          (currentUserProfile.free_fire_uid &&
            (m.free_fire_uid === currentUserProfile.free_fire_uid ||
              m.profiles?.free_fire_uid === currentUserProfile.free_fire_uid))
      ) || null
    : null

  const ownerSyntheticLeader: GuildMember | null = !hasRosterLeader
    ? {
        id: 'guild-owner-leader',
        guild_id: guildInfo?.guild?.id || '',
        user_id: '',
        guild_role: '👑 Leader',
        glory_contributed: 1000,
        kills: 0,
        ranking: 1,
        player_name: 'ELITE ಕನ್ನಡಿಗ',
        free_fire_uid: '1969913248',
        joined_at: '',
        status: 'active',
        profiles: {
          id: 'guild-owner-leader',
          ign: 'ELITE ಕನ್ನಡಿಗ',
          avatar_url: ownerProfile?.avatar_url || null,
          free_fire_uid: '1969913248',
          level: ownerProfile?.level || 80,
        } as Profile,
      }
    : null

  const challengeEligibleRoster = ownerSyntheticLeader
    ? [ownerSyntheticLeader, ...rankedMembers]
    : rankedMembers

  const highestGloryMember = getHighestGloryMember(rankedMembers)

  const myChallengeSummary = myGuildMember
    ? getMemberChallengeSummary({
        member: myGuildMember,
        allMembers: challengeEligibleRoster,
        existingChallenges: challenges,
      })
    : null

  const ownerLeaderCheck =
    myGuildMember && ownerSyntheticLeader
      ? canMemberChallengeTarget({
          challenger: myGuildMember,
          target: ownerSyntheticLeader,
          allMembers: challengeEligibleRoster,
          existingChallenges: challenges,
        })
      : null

  const isCurrentUserDefender = (c: GuildChallenge) => {
    if (!currentUserProfile) return false
    if (myGuildMember && c.defender_member_id === myGuildMember.id) return true
    if (
      c.defender_member_id === 'guild-owner-leader' &&
      currentUserProfile.free_fire_uid === '1969913248'
    ) {
      return true
    }
    return false
  }

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

                {!hasRosterLeader && myGuildMember && myChallengeSummary?.myTier === 2 && ownerSyntheticLeader && (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {challenges.some(
                      (c) =>
                        c.status === 'pending' &&
                        c.challenger_member_id === myGuildMember.id &&
                        c.defender_member_id === ownerSyntheticLeader.id
                    ) ? (
                      <span className="badge border-brand-border bg-brand-muted text-brand-bright">
                        <Swords size={12} />
                        Challenge pending
                      </span>
                    ) : ownerLeaderCheck?.allowed ? (
                      <button
                        type="button"
                        onClick={() => {
                          setChallengeNote('')
                          setChallengeTarget(ownerSyntheticLeader)
                        }}
                        className="btn-primary btn-sm"
                      >
                        <Swords size={13} />
                        Challenge Leader
                      </button>
                    ) : (
                      <span
                        title={ownerLeaderCheck?.reason}
                        className="badge text-ink-subtle"
                      >
                        Need {MIN_CHALLENGE_GLORY.toLocaleString()} GP to challenge Leader
                      </span>
                    )}
                  </div>
                )}
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

        {/* Guild Rank Challenge Rules & Eligibility */}
        <div className="card mb-8 p-5 sm:mb-10 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-brand">
                  <Swords size={12} />
                  Rank challenges
                </span>
                <span className="badge">
                  <Flame size={12} />
                  {MIN_CHALLENGE_GLORY.toLocaleString()}+ GP required
                </span>
              </div>
              <h2 className="mt-2.5 text-base font-semibold text-ink sm:text-lg">
                1-Rank-Above Challenge Ladder
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-muted sm:text-sm">
                Players can challenge only <strong className="text-ink">1 rank tier above</strong> their
                current role (only Co-Leaders can challenge the Leader). All challengers must reach{' '}
                <strong className="text-ink">{MIN_CHALLENGE_GLORY.toLocaleString()} Glory Points</strong>, and
                among Members only the{' '}
                <strong className="text-ink">#1 Highest-Glory Member</strong> can challenge an Elder.
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-1.5 text-xs">
                {GUILD_RANK_TIERS.map((tier, idx) => {
                  const isMine = myChallengeSummary?.myTier === tier.rank
                  return (
                    <span key={tier.rank} className="inline-flex items-center gap-1.5">
                      <span
                        className={`rounded-md border px-2 py-0.5 font-medium ${
                          isMine
                            ? 'border-brand-border bg-brand-muted text-brand-bright'
                            : 'border-line bg-surface-2 text-ink-muted'
                        }`}
                      >
                        {tier.label}
                        {tier.rank === 8 ? ' (#1 GP)' : ''}
                      </span>
                      {idx < GUILD_RANK_TIERS.length - 1 && (
                        <span className="text-ink-subtle" aria-hidden="true">
                          ←
                        </span>
                      )}
                    </span>
                  )
                })}
              </div>
            </div>

            <div className="w-full shrink-0 rounded-lg border border-line bg-surface-2 p-4 lg:w-80">
              <p className="label">Your challenge status</p>
              {myGuildMember && myChallengeSummary ? (
                <div className="mt-2 space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-subtle">Role</span>
                    <span className="font-semibold text-ink">
                      {normalizeGuildRole(myGuildMember.guild_role)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-ink-subtle">Glory</span>
                    <span
                      className={`font-semibold tabular-nums ${
                        myChallengeSummary.hasEnoughGlory ? 'text-ink' : 'text-brand-bright'
                      }`}
                    >
                      {myChallengeSummary.myGlory.toLocaleString()} / {MIN_CHALLENGE_GLORY.toLocaleString()} GP
                    </span>
                  </div>
                  <p className="border-t border-line-subtle pt-2 leading-relaxed text-ink-muted">
                    {myChallengeSummary.blockReason}
                  </p>
                </div>
              ) : (
                <p className="mt-2 text-xs leading-relaxed text-ink-muted">
                  Sign in with a registered ELITE ARMY roster UID to issue rank challenges.
                </p>
              )}

              {highestGloryMember && (
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line-subtle pt-2.5 text-xs">
                  <span className="inline-flex items-center gap-1 text-ink-subtle">
                    <Trophy size={12} className="text-brand-bright" />
                    Top Member
                  </span>
                  <span className="truncate font-semibold text-ink">
                    {highestGloryMember.player_name || highestGloryMember.profiles?.ign || 'Player'} (
                    {(highestGloryMember.glory_contributed ?? 0).toLocaleString()} GP)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Player Roster Section */}
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
              rankedMembers.map((m, index) => {
                const assignedRank = m.ranking ?? index + 1
                const roleRank = getGuildRoleRank(m.guild_role)
                const role =
                  normalizeGuildRole(m.guild_role)
                    .replace(/[^\p{L}\-\s]/gu, '')
                    .trim() || 'Member'
                const isLeader = roleRank === 1
                const isTopMember = Boolean(highestGloryMember && highestGloryMember.id === m.id)

                const isTargetNextTier =
                  Boolean(myGuildMember && myChallengeSummary) &&
                  roleRank === (myChallengeSummary?.myTier ?? 99) - 1

                const hasPendingVsTarget = Boolean(
                  myGuildMember &&
                    challenges.some(
                      (c) =>
                        c.status === 'pending' &&
                        c.challenger_member_id === myGuildMember.id &&
                        c.defender_member_id === m.id
                    )
                )

                const targetEligibility =
                  myGuildMember && isTargetNextTier
                    ? canMemberChallengeTarget({
                        challenger: myGuildMember,
                        target: m,
                        allMembers: challengeEligibleRoster,
                        existingChallenges: challenges,
                      })
                    : null

                const blockedTag =
                  targetEligibility && !targetEligibility.allowed
                    ? (myGuildMember?.glory_contributed ?? 0) < MIN_CHALLENGE_GLORY
                      ? `Need ${MIN_CHALLENGE_GLORY} GP`
                      : myChallengeSummary?.myTier === 8 && !myChallengeSummary.isHighestGloryMember
                        ? 'Top Member only'
                        : 'Unavailable'
                    : null

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
                          assignedRank === 1 ? 'text-brand-bright' : 'text-ink-subtle'
                        }`}
                      >
                        #{assignedRank}
                      </span>

                      <UserAvatar
                        src={m.profiles?.avatar_url}
                        name={m.player_name || m.profiles?.ign}
                        size="md"
                        className="h-10 w-10 shrink-0 border border-line sm:h-11 sm:w-11"
                      />

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="truncate text-sm font-semibold text-ink">
                            {m.player_name || m.profiles?.ign || 'ELITE PLAYER'}
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
                          {isTopMember && (
                            <span className="badge border-brand-border bg-brand-muted text-brand-bright">
                              <Trophy size={11} />
                              Top Member
                            </span>
                          )}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink-subtle">
                          ID {m.profiles?.player_id || 'N/A'} · UID{' '}
                          {m.profiles?.free_fire_uid || m.free_fire_uid || 'N/A'} · Level{' '}
                          {m.profiles?.level || 1}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-subtle pt-3 sm:justify-end sm:border-0 sm:pt-0">
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
                            {(m.glory_contributed ?? 0).toLocaleString()}
                          </p>
                          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">
                            Glory
                          </p>
                        </div>
                      </div>

                      {isTargetNextTier && (
                        <div className="flex items-center">
                          {hasPendingVsTarget ? (
                            <span className="badge border-brand-border bg-brand-muted text-brand-bright">
                              <Swords size={11} />
                              Pending
                            </span>
                          ) : targetEligibility?.allowed ? (
                            <button
                              type="button"
                              onClick={() => {
                                setChallengeNote('')
                                setChallengeTarget(m)
                              }}
                              className="btn-primary btn-sm"
                            >
                              <Swords size={13} />
                              Challenge
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title={targetEligibility?.reason}
                              className="btn-secondary btn-sm cursor-not-allowed opacity-60"
                            >
                              <Swords size={13} />
                              {blockedTag}
                            </button>
                          )}
                        </div>
                      )}

                      {isAdmin && (
                        <div className="flex items-center gap-1 border-l border-line-subtle pl-2">
                          <button
                            type="button"
                            onClick={() => setEditingMember(m)}
                            className="grid h-9 w-9 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-surface-3 hover:text-ink"
                            title="Edit ranking, kills and role"
                            aria-label={`Edit ${m.player_name || m.profiles?.ign}`}
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGuildPlayer(m.id, m.user_id)}
                            className="grid h-9 w-9 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-brand-muted hover:text-brand-bright"
                            title="Remove member from guild"
                            aria-label={`Remove ${m.player_name || m.profiles?.ign}`}
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

        {/* Active & Recent Rank Challenges Feed */}
        <div className="mt-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="kicker">
                <span className="kicker-line" aria-hidden="true" />
                Rank duels
              </p>
              <h2 className="display-section mt-2">Active &amp; recent challenges</h2>
            </div>
            <span className="badge">
              {challenges.filter((c) => c.status === 'pending' || c.status === 'accepted').length} active
            </span>
          </div>

          <div className="card divide-y divide-line-subtle overflow-hidden">
            {challenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
                <Swords size={26} className="text-ink-subtle" />
                <p className="mt-2.5 text-sm font-semibold text-ink">
                  No rank challenges issued yet
                </p>
                <p className="mt-1 text-xs text-ink-subtle">
                  Eligible members with {MIN_CHALLENGE_GLORY.toLocaleString()}+ GP can challenge 1 rank tier above.
                </p>
              </div>
            ) : (
              challenges.map((c) => {
                const isBusy = resolvingChallengeId === c.id
                const canRespond = c.status === 'pending' && (isCurrentUserDefender(c) || isAdmin)
                const canFinalize =
                  isAdmin && (c.status === 'pending' || c.status === 'accepted')

                const statusLabel =
                  c.status === 'challenger_won'
                    ? 'Challenger Won'
                    : c.status === 'defender_won'
                      ? 'Defender Won'
                      : c.status === 'accepted'
                        ? 'Accepted'
                        : c.status === 'declined'
                          ? 'Declined'
                          : 'Pending'

                const statusClass =
                  c.status === 'pending' || c.status === 'accepted'
                    ? 'border-brand-border bg-brand-muted text-brand-bright'
                    : ''

                return (
                  <div
                    key={c.id}
                    className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`badge ${statusClass}`}>{statusLabel}</span>
                        <span className="text-xs text-ink-subtle">
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm font-semibold text-ink">
                        <span>{c.challenger_name}</span>{' '}
                        <span className="text-xs font-medium text-ink-muted">
                          ({c.challenger_role} · {c.challenger_glory.toLocaleString()} GP)
                        </span>{' '}
                        <span className="text-brand-bright">→</span>{' '}
                        <span>{c.defender_name}</span>{' '}
                        <span className="text-xs font-medium text-ink-muted">
                          ({c.defender_role})
                        </span>
                      </p>

                      {c.note && (
                        <p className="mt-1 text-xs italic text-ink-subtle">
                          &ldquo;{c.note}&rdquo;
                        </p>
                      )}
                    </div>

                    {(canRespond || canFinalize || isAdmin) && (
                      <div className="flex flex-wrap items-center gap-2">
                        {canRespond && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolveChallenge(c.id, 'accepted')}
                              className="btn-primary btn-sm"
                            >
                              Accept
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolveChallenge(c.id, 'declined')}
                              className="btn-secondary btn-sm"
                            >
                              Decline
                            </button>
                          </>
                        )}

                        {canFinalize && (
                          <>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolveChallenge(c.id, 'challenger_won')}
                              className="btn-primary btn-sm"
                            >
                              Challenger won · Swap ranks
                            </button>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleResolveChallenge(c.id, 'defender_won')}
                              className="btn-secondary btn-sm"
                            >
                              Defender won
                            </button>
                          </>
                        )}

                        {isAdmin && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleDeleteChallenge(c.id)}
                            className="grid h-8 w-8 place-items-center rounded-md text-ink-subtle transition-colors hover:bg-brand-muted hover:text-brand-bright"
                            title="Delete challenge record"
                            aria-label="Delete challenge record"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
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
                Select a registered player or enter a Free Fire UID &amp; player name. Unregistered UIDs will be registered automatically.
              </p>
            </div>

            <form onSubmit={handleAddGuildPlayer} className="space-y-4">
              {/* Registered Player Selection (Optional) + UID & Player Name */}
              <div className="space-y-2.5 rounded-lg border border-line-subtle bg-surface-2 p-3.5">
                <div className="flex items-center justify-between">
                  <label className="label">
                    1. SELECT REGISTERED PLAYER (OPTIONAL)
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
                  value={selectedPlayerId}
                  onChange={(e) => handleSelectRegisteredPlayer(e.target.value)}
                  className="field h-10"
                >
                  <option value="">-- Choose Registered Player (Optional) --</option>
                  {filteredPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.ign || p.username} ({p.player_id || 'ID N/A'} • UID: {p.free_fire_uid || 'N/A'})
                    </option>
                  ))}
                </select>

                {/* Direct UID & Name of the Player Inputs */}
                <div className="grid grid-cols-1 gap-2.5 border-t border-line-subtle pt-2.5 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block label">
                      FREE FIRE UID {!selectedPlayerId ? '*' : ''}
                    </label>
                    <input
                      type="text"
                      required={!selectedPlayerId}
                      placeholder="e.g. 1928374650"
                      value={newUid}
                      onChange={(e) => handleGuildUidChange(e.target.value)}
                      className="field h-10 font-mono"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">
                      NAME OF THE PLAYER *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Enter player name..."
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                </div>

                {/* Preview Selected Player or Auto-Register Notice */}
                {(() => {
                  const sel = selectedPlayerId
                    ? registeredPlayers.find((p) => p.id === selectedPlayerId)
                    : newUid.trim()
                    ? registeredPlayers.find((p) => p.free_fire_uid?.trim() === newUid.trim())
                    : null

                  if (sel) {
                    return (
                      <div className="mt-2 flex items-center gap-3 border-t border-line-subtle pt-2">
                        <UserAvatar src={sel.avatar_url} name={newPlayerName || sel.ign || sel.username} size="sm" />
                        <div>
                          <p className="text-xs font-bold text-ink">✓ Registered Player: {sel.ign || sel.username}</p>
                          <p className="text-xs text-ink-subtle">
                            ID: {sel.player_id || 'N/A'} • UID: {sel.free_fire_uid || newUid || 'N/A'} • Level {sel.level || 1}
                          </p>
                        </div>
                      </div>
                    )
                  }

                  if (newUid.trim()) {
                    return (
                      <div className="mt-2 border-t border-line-subtle pt-2">
                        <p className="text-xs font-medium text-brand-bright">
                          New UID ({newUid.trim()}) — will be automatically registered to the application and shown as &ldquo;{newPlayerName.trim() || 'Player'}&rdquo;.
                        </p>
                      </div>
                    )
                  }

                  return null
                })()}
              </div>

              {/* Ranking & Glory Points */}
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
                    3. GLORY POINTS *
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
              </div>

              {/* Guild Role */}
              <div>
                <label className="mb-1 block label">
                  4. GUILD ROLE
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
                  {editingMember.profiles?.free_fire_uid || editingMember.free_fire_uid || 'N/A'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveEditedMember} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-brand-bright">
                  NAME OF THE PLAYER *
                </label>
                <input
                  type="text"
                  required
                  value={editingMember.player_name ?? editingMember.profiles?.ign ?? ''}
                  onChange={(e) =>
                    setEditingMember({ ...editingMember, player_name: e.target.value })
                  }
                  className="field h-10"
                />
              </div>

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

      {/* Guild Member: Confirm Rank Challenge Modal */}
      {challengeTarget && myGuildMember && (
        <div
          className="modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Issue guild rank challenge"
        >
          <div className="modal-panel relative max-w-md space-y-4 p-5 sm:p-6">
            <button
              type="button"
              onClick={() => setChallengeTarget(null)}
              className="btn-ghost btn-icon absolute right-4 top-4"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3 border-b border-line-subtle pb-4">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-muted text-brand-bright">
                <Swords size={20} />
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-ink">
                  Challenge {challengeTarget.player_name || challengeTarget.profiles?.ign || 'Player'}
                </h3>
                <p className="text-xs text-ink-muted">
                  1-Rank-Above Duel · {normalizeGuildRole(myGuildMember.guild_role)} →{' '}
                  {normalizeGuildRole(challengeTarget.guild_role)}
                </p>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-line bg-surface-2 p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-subtle">Challenger (You)</span>
                <span className="font-semibold text-ink">
                  {myGuildMember.player_name || myGuildMember.profiles?.ign} ·{' '}
                  {(myGuildMember.glory_contributed ?? 0).toLocaleString()} GP
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-ink-subtle">Defender</span>
                <span className="font-semibold text-ink">
                  {challengeTarget.player_name || challengeTarget.profiles?.ign} (
                  {normalizeGuildRole(challengeTarget.guild_role)})
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitChallenge} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase text-ink-muted">
                  CHALLENGE NOTE (OPTIONAL)
                </label>
                <textarea
                  rows={2}
                  maxLength={180}
                  value={challengeNote}
                  onChange={(e) => setChallengeNote(e.target.value)}
                  placeholder="e.g. 1v1 Custom Room · Best of 3 rounds tonight at 9 PM"
                  className="field min-h-[72px] py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setChallengeTarget(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingChallenge}
                  className="btn-primary"
                >
                  <Swords size={15} />
                  {submittingChallenge ? 'Sending...' : 'Send challenge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </SitePage>
  )
}
