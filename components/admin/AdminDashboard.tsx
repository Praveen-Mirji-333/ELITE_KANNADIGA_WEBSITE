'use client'

import { useState, useEffect } from 'react'
import {
  ShieldCheck,
  Video,
  Trophy,
  Plus,
  Check,
  X,
  Eye,
  Trash2,
  Users,
  Award,
  Layers,
  Home,
  User,
  LogOut,
  Edit2,
  Save,
  CheckCircle2,
  Lock,
  Flag,
  FileText,
  Calendar,
  Clock,
} from 'lucide-react'
import {
  HomeCard,
  Tournament,
  TournamentRegistration,
  LeaderboardSection,
  Achievement,
  CommunityClip,
  TopTeamDetail,
} from '../../lib/types'
import {
  supabase,
  fetchHomeCards,
  upsertHomeCard,
  deleteHomeCard,
  fetchTournaments,
  updateTournament,
  fetchTournamentRegistrationsForAdmin,
  registerTournamentTeam,
  deleteTournamentRegistration,
  saveMatchResults,
  updateTournamentTop3AndResults,
  fetchLeaderboardSections,
  createLeaderboardSection,
  updateLeaderboardSection,
  fetchEliteArmyGuild,
  updateGuildMemberGlory,
  updateGuildMember,
  fetchAchievements,
  upsertAchievement,
  deleteAchievement,
  fetchPendingClipsForAdmin,
  moderateClipStatus,
  PlayerHonor,
  fetchPlayerHonors,
  addPlayerHonor,
  deletePlayerHonor,
  findPlayerNameByUid,
  findPlayerProfileByUid,
  fetchAvatarMap,
  fetchSiteSetting,
  updateSiteSetting,
} from '../../lib/supabase'
import { UserAvatar } from '../ui/UserAvatar'

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'HOME_CMS' | 'TOURNAMENTS' | 'LEADERBOARD' | 'GUILD' | 'ACHIEVEMENTS' | 'CLIPS'

export function AdminDashboard({ isOpen, onClose }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>('HOME_CMS')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  // 1. Home CMS State & Edit State
  const [homeCards, setHomeCards] = useState<HomeCard[]>([])
  const [newCardTitle, setNewCardTitle] = useState('')
  const [newCardSub, setNewCardSub] = useState('')
  const [newCardNumber, setNewCardNumber] = useState('')
  const [newCardLabel, setNewCardLabel] = useState('')
  const [editingHomeCard, setEditingHomeCard] = useState<HomeCard | null>(null)

  // 2. Tournaments State & Form Inputs
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [newTourneyTitle, setNewTourneyTitle] = useState('')
  const [newTourneyMode, setNewTourneyMode] = useState('CS SQUAD BATTLE')
  const [customPrizeText, setCustomPrizeText] = useState('₹10,000')
  const [regCloseDate, setRegCloseDate] = useState('')
  const [tourneyStartDate, setTourneyStartDate] = useState('')
  const [rulesText, setRulesText] = useState('1. All players must register with valid Free Fire UIDs.\n2. Duplicate Free Fire UIDs are strictly prohibited across all teams.\n3. Teams must check in 15 minutes prior to official room start time.\n4. Zero tolerance for hacks, third-party scripts, or bug exploits.')

  const [editingTourney, setEditingTourney] = useState<Tournament | null>(null)
  const [selectedTourneyRegs, setSelectedTourneyRegs] = useState<TournamentRegistration[]>([])
  const [selectedTourneyTitle, setSelectedTourneyTitle] = useState('')
  const [showRegModal, setShowRegModal] = useState(false)
  const [rulesModalTourney, setRulesModalTourney] = useState<Tournament | null>(null)

  // Finish Tournament & Submit Results Modal State
  const [finishingTourney, setFinishingTourney] = useState<Tournament | null>(null)
  const [finishRegs, setFinishRegs] = useState<TournamentRegistration[]>([])

  const [top1Team, setTop1Team] = useState<TopTeamDetail>({ rank: 1, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })
  const [top2Team, setTop2Team] = useState<TopTeamDetail>({ rank: 2, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })
  const [top3Team, setTop3Team] = useState<TopTeamDetail>({ rank: 3, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })

  // Admin Manual Team Registration State
  const [adminAddRegModalOpen, setAdminAddRegModalOpen] = useState(false)
  const [adminRegTourneyId, setAdminRegTourneyId] = useState('')
  const [adminRegTeamName, setAdminRegTeamName] = useState('')
  const [adminRegCaptainName, setAdminRegCaptainName] = useState('')
  const [adminRegCaptainUid, setAdminRegCaptainUid] = useState('')
  const [adminRegPhone, setAdminRegPhone] = useState('')
  const [adminRegP2Name, setAdminRegP2Name] = useState('')
  const [adminRegP2Uid, setAdminRegP2Uid] = useState('')
  const [adminRegP3Name, setAdminRegP3Name] = useState('')
  const [adminRegP3Uid, setAdminRegP3Uid] = useState('')
  const [adminRegP4Name, setAdminRegP4Name] = useState('')
  const [adminRegP4Uid, setAdminRegP4Uid] = useState('')

  // 3. Leaderboard State & Edit State
  const [lbSections, setLbSections] = useState<LeaderboardSection[]>([])
  const [newSecName, setNewSecName] = useState('')
  const [newSecDesc, setNewSecDesc] = useState('')
  const [editingSec, setEditingSec] = useState<LeaderboardSection | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newPlayerPoints, setNewPlayerPoints] = useState('')
  const [selectedSecId, setSelectedSecId] = useState('')

  // Gun Gods & Movement Gods Admin State
  const [honorCategory, setHonorCategory] = useState<'gun_gods' | 'movement_gods'>('gun_gods')
  const [avatarMap, setAvatarMap] = useState<Map<string, string>>(new Map())
  const [honorPlayerUid, setHonorPlayerUid] = useState('')
  const [honorPlayerName, setHonorPlayerName] = useState('')
  const [honorPlayerAvatar, setHonorPlayerAvatar] = useState('')
  const [honorTitleName, setHonorTitleName] = useState('')
  const [honorDescription, setHonorDescription] = useState('')
  const [gunGodsList, setGunGodsList] = useState<PlayerHonor[]>([])
  const [movementGodsList, setMovementGodsList] = useState<PlayerHonor[]>([])
  const [searchingUid, setSearchingUid] = useState(false)

  // 4. Single Guild (ELITE ARMY) State & Edit State
  const [guildInfo, setGuildInfo] = useState<any>(null)
  const [guildMembers, setGuildMembers] = useState<any[]>([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberGlory, setNewMemberGlory] = useState('1000')
  const [newMemberRank, setNewMemberRank] = useState('member')
  const [editingMember, setEditingMember] = useState<any | null>(null)

  // Guild Visibility Toggle State
  const [showGuildSection, setShowGuildSection] = useState<boolean>(true)

  const handleToggleGuildSection = async () => {
    const newValue = !showGuildSection
    setShowGuildSection(newValue)
    const res = await updateSiteSetting('show_guild_section', newValue)
    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        newValue
          ? 'GUILD SECTION IS NOW VISIBLE TO USERS!'
          : 'GUILD SECTION IS NOW HIDDEN FROM USERS!',
        newValue ? 'success' : 'error'
      )
    } else {
      showNotification('Failed to update Guild visibility setting', 'error')
      setShowGuildSection(!newValue)
    }
  }

  // 5. Achievements State & Edit State
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [achTitle, setAchTitle] = useState('')
  const [achPlayerName, setAchPlayerName] = useState('')
  const [achPlayerUid, setAchPlayerUid] = useState('')
  const [achPlayerAvatar, setAchPlayerAvatar] = useState('')
  const [achDesc, setAchDesc] = useState('')
  const [achBadge, setAchBadge] = useState('')
  const [achXp, setAchXp] = useState('500')
  const [editingAch, setEditingAch] = useState<Achievement | null>(null)

  // 6. Community Clips State
  const [pendingClips, setPendingClips] = useState<CommunityClip[]>([])

  useEffect(() => {
    if (isOpen) {
      loadAllAdminData()
    }
  }, [isOpen])

  async function loadHonorsData() {
    const gg = await fetchPlayerHonors('gun_gods')
    const mg = await fetchPlayerHonors('movement_gods')
    setGunGodsList(gg)
    setMovementGodsList(mg)
  }

  const handleUidSearch = async (uid: string) => {
    setHonorPlayerUid(uid)
    if (uid.trim().length >= 3) {
      setSearchingUid(true)
      const prof = await findPlayerProfileByUid(uid)
      if (prof) {
        setHonorPlayerName(prof.ign)
        setHonorPlayerAvatar(prof.avatar_url)
      } else {
        setHonorPlayerAvatar('')
      }
      setSearchingUid(false)
    } else {
      setHonorPlayerAvatar('')
    }
  }

  const handleAchUidSearch = async (uid: string) => {
    setAchPlayerUid(uid)
    if (uid.trim().length >= 3) {
      const prof = await findPlayerProfileByUid(uid)
      if (prof) {
        setAchPlayerName(prof.ign)
        setAchPlayerAvatar(prof.avatar_url)
      } else {
        setAchPlayerAvatar('')
      }
    } else {
      setAchPlayerAvatar('')
    }
  }

  const handleAddPlayerHonor = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!honorPlayerUid.trim() || !honorTitleName.trim()) {
      showNotification('Player UID and Title/Gun Name are required!', 'error')
      return
    }

    const finalName = honorPlayerName.trim() || (await findPlayerNameByUid(honorPlayerUid)) || 'Player ' + honorPlayerUid.trim()

    const res = await addPlayerHonor({
      category: honorCategory,
      player_uid: honorPlayerUid,
      player_name: finalName,
      title_name: honorTitleName,
      description: honorDescription,
      avatar_url: honorPlayerAvatar,
    })

    if (res.success) {
      showNotification(`Added player to ${honorCategory === 'gun_gods' ? 'Gun Gods' : 'Movement Gods'}!`)
      setHonorPlayerUid('')
      setHonorPlayerName('')
      setHonorPlayerAvatar('')
      setHonorTitleName('')
      setHonorDescription('')
      loadHonorsData()
    } else {
      showNotification(res.error || 'Failed to add player honor', 'error')
    }
  }

  const handleDeletePlayerHonor = async (id: string) => {
    const res = await deletePlayerHonor(id)
    if (res.success) {
      showNotification('Removed player title successfully!')
      loadHonorsData()
    } else {
      showNotification(res.error || 'Failed to remove', 'error')
    }
  }

  async function loadAllAdminData() {
    setLoading(true)
    setMsg(null)

    // Load Home Cards
    const cards = await fetchHomeCards()
    setHomeCards(cards)

    // Load Tournaments
    const tourneys = await fetchTournaments()
    setTournaments(tourneys)

    // Load Leaderboard Sections
    const secs = await fetchLeaderboardSections()
    setLbSections(secs)
    if (secs.length > 0 && !selectedSecId) setSelectedSecId(secs[0].id)

    // Load Honors
    await loadHonorsData()

    // Load Single Guild: ELITE ARMY & Visibility Setting
    const guildSetting = await fetchSiteSetting('show_guild_section', 'true')
    setShowGuildSection(guildSetting)

    const guildRes = await fetchEliteArmyGuild()
    setGuildInfo(guildRes.guild)
    setGuildMembers(guildRes.members)

    // Load Achievements
    const achs = await fetchAchievements()
    setAchievements(achs)

    // Load Clips
    const clips = await fetchPendingClipsForAdmin()
    setPendingClips(clips)

    // Load Avatar Map
    const avMap = await fetchAvatarMap()
    setAvatarMap(avMap)

    setLoading(false)
  }

  if (!isOpen) return null

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg(null), 4000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    onClose()
    window.location.href = '/'
  }

  // ==========================================
  // 1. HOME CMS HANDLERS (Add & Edit)
  // ==========================================
  const handleAddHomeCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCardTitle && !newCardNumber) return

    const res = await upsertHomeCard({
      title: newCardTitle || 'NEW CARD',
      subtitle: newCardSub,
      stat_number: newCardNumber,
      stat_label: newCardLabel,
      section: 'HERO_STATS',
      is_active: true,
      display_order: homeCards.length + 1,
    })

    if (res.success) {
      showNotification('Home Card created successfully!')
      setNewCardTitle('')
      setNewCardSub('')
      setNewCardNumber('')
      setNewCardLabel('')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to add card', 'error')
    }
  }

  const handleSaveEditedHomeCard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingHomeCard) return

    const res = await upsertHomeCard({
      id: editingHomeCard.id,
      title: editingHomeCard.title,
      subtitle: editingHomeCard.subtitle,
      stat_number: editingHomeCard.stat_number,
      stat_label: editingHomeCard.stat_label,
      section: editingHomeCard.section,
    })

    if (res.success) {
      showNotification('Home Card updated in database!')
      setEditingHomeCard(null)
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to update card', 'error')
    }
  }

  const handleDeleteHomeCard = async (id: string) => {
    const res = await deleteHomeCard(id)
    if (res.success) {
      showNotification('Home Card deleted.')
      loadAllAdminData()
    }
  }

  // ==========================================
  // 2. TOURNAMENTS HANDLERS (Create, Edit, Dates, Rules, Close Reg, Finish)
  // ==========================================
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTourneyTitle) return

    const slug = newTourneyTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const finalPrize = customPrizeText || '₹10,000'

    const { error } = await supabase.from('tournaments').insert([
      {
        title: newTourneyTitle,
        slug,
        game_mode: newTourneyMode,
        prize_pool: finalPrize,
        max_slots: 100,
        registration_end: regCloseDate ? new Date(regCloseDate).toISOString() : new Date(Date.now() + 86400000 * 2).toISOString(),
        tournament_start: tourneyStartDate ? new Date(tourneyStartDate).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
        rules: rulesText,
        status: 'registration_open',
      },
    ])

    if (!error) {
      showNotification('Tournament announced with Dates & Rules!')
      setNewTourneyTitle('')
      loadAllAdminData()
    } else {
      showNotification(error.message, 'error')
    }
  }

  const handleSaveEditedTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTourney) return

    const res = await updateTournament(editingTourney.id, {
      title: editingTourney.title,
      game_mode: editingTourney.game_mode,
      prize_pool: editingTourney.prize_pool,
      max_slots: editingTourney.max_slots,
      registration_end: editingTourney.registration_end,
      tournament_start: editingTourney.tournament_start,
      rules: editingTourney.rules,
    })

    if (res.success) {
      showNotification('Tournament details updated!')
      setEditingTourney(null)
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to update tournament', 'error')
    }
  }

  const handleCloseRegistration = async (tourneyId: string) => {
    const res = await updateTournament(tourneyId, { status: 'full' })
    if (res.success) {
      showNotification('Registration closed for this tournament!')
      loadAllAdminData()
    }
  }

  const extractPlayerNames = (r: TournamentRegistration) => {
    const names: string[] = []
    if (r.captain_name) names.push(r.captain_name)
    if (Array.isArray(r.teammate_names)) {
      r.teammate_names.forEach((n) => { if (n && n.trim()) names.push(n.trim()) })
    }
    return names
  }

  const extractPlayerUids = (r: TournamentRegistration) => {
    const uids: string[] = []
    if (r.captain_free_fire_uid) uids.push(r.captain_free_fire_uid)
    if (Array.isArray(r.teammate_uids)) {
      r.teammate_uids.forEach((u) => { if (u && u.trim()) uids.push(u.trim()) })
    }
    return uids
  }

  const handleOpenFinishModal = async (t: Tournament) => {
    setFinishingTourney(t)
    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    setFinishRegs(regs)

    if (t.top_3_teams && t.top_3_teams.length > 0) {
      const t1 = t.top_3_teams.find((x) => x.rank === 1)
      const t2 = t.top_3_teams.find((x) => x.rank === 2)
      const t3 = t.top_3_teams.find((x) => x.rank === 3)

      setTop1Team(t1 || (regs[0] ? { rank: 1, team_name: regs[0].team_name || regs[0].captain_name || '', captain_name: regs[0].captain_name || '', captain_uid: regs[0].captain_free_fire_uid || '', kills: regs[0].kills || 0, points: 35, prize: '', player_names: extractPlayerNames(regs[0]), player_uids: extractPlayerUids(regs[0]) } : { rank: 1, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] }))
      setTop2Team(t2 || (regs[1] ? { rank: 2, team_name: regs[1].team_name || regs[1].captain_name || '', captain_name: regs[1].captain_name || '', captain_uid: regs[1].captain_free_fire_uid || '', kills: regs[1].kills || 0, points: 25, prize: '', player_names: extractPlayerNames(regs[1]), player_uids: extractPlayerUids(regs[1]) } : { rank: 2, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] }))
      setTop3Team(t3 || (regs[2] ? { rank: 3, team_name: regs[2].team_name || regs[2].captain_name || '', captain_name: regs[2].captain_name || '', captain_uid: regs[2].captain_free_fire_uid || '', kills: regs[2].kills || 0, points: 18, prize: '', player_names: extractPlayerNames(regs[2]), player_uids: extractPlayerUids(regs[2]) } : { rank: 3, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] }))
    } else {
      setTop1Team(regs[0] ? { rank: 1, team_name: regs[0].team_name || regs[0].captain_name || '', captain_name: regs[0].captain_name || '', captain_uid: regs[0].captain_free_fire_uid || '', kills: regs[0].kills || 0, points: 35, prize: '', player_names: extractPlayerNames(regs[0]), player_uids: extractPlayerUids(regs[0]) } : { rank: 1, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })
      setTop2Team(regs[1] ? { rank: 2, team_name: regs[1].team_name || regs[1].captain_name || '', captain_name: regs[1].captain_name || '', captain_uid: regs[1].captain_free_fire_uid || '', kills: regs[1].kills || 0, points: 25, prize: '', player_names: extractPlayerNames(regs[1]), player_uids: extractPlayerUids(regs[1]) } : { rank: 2, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })
      setTop3Team(regs[2] ? { rank: 3, team_name: regs[2].team_name || regs[2].captain_name || '', captain_name: regs[2].captain_name || '', captain_uid: regs[2].captain_free_fire_uid || '', kills: regs[2].kills || 0, points: 18, prize: '', player_names: extractPlayerNames(regs[2]), player_uids: extractPlayerUids(regs[2]) } : { rank: 3, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: [], player_uids: [] })
    }
  }

  const handleAdminRegisterTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminRegTourneyId || !adminRegCaptainName || !adminRegCaptainUid) {
      showNotification('Please select a tournament and enter Captain Name & UID', 'error')
      return
    }

    const p2Name = adminRegP2Name.trim()
    const p2Uid = adminRegP2Uid.trim() || 'N/A'
    const p3Name = adminRegP3Name.trim()
    const p3Uid = adminRegP3Uid.trim() || 'N/A'
    const p4Name = adminRegP4Name.trim()
    const p4Uid = adminRegP4Uid.trim() || 'N/A'

    const teammateNames: string[] = []
    const teammateUids: string[] = []

    if (p2Name || p2Uid !== 'N/A') {
      teammateNames.push(p2Name || 'Teammate 2')
      teammateUids.push(p2Uid)
    }
    if (p3Name || p3Uid !== 'N/A') {
      teammateNames.push(p3Name || 'Teammate 3')
      teammateUids.push(p3Uid)
    }
    if (p4Name || p4Uid !== 'N/A') {
      teammateNames.push(p4Name || 'Teammate 4')
      teammateUids.push(p4Uid)
    }

    const res = await registerTournamentTeam({
      tournamentId: adminRegTourneyId,
      captainName: adminRegCaptainName.trim(),
      captainUid: adminRegCaptainUid.trim(),
      phone: adminRegPhone.trim() || '+91 9000000000',
      teamName: adminRegTeamName.trim() || adminRegCaptainName.trim(),
      teammateNames,
      teammateUids,
    })

    if (res.success) {
      showNotification(`Team "${adminRegTeamName || adminRegCaptainName}" registered successfully by Admin!`)
      setAdminAddRegModalOpen(false)
      setAdminRegTeamName('')
      setAdminRegCaptainName('')
      setAdminRegCaptainUid('')
      setAdminRegPhone('')
      setAdminRegP2Name('')
      setAdminRegP2Uid('')
      setAdminRegP3Name('')
      setAdminRegP3Uid('')
      setAdminRegP4Name('')
      setAdminRegP4Uid('')

      if (finishingTourney) {
        const regs = await fetchTournamentRegistrationsForAdmin(finishingTourney.id)
        setFinishRegs(regs)
      }
      if (adminRegTourneyId) {
        const regs = await fetchTournamentRegistrationsForAdmin(adminRegTourneyId)
        setSelectedTourneyRegs(regs)
      }
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to register team', 'error')
    }
  }

  const handleDeleteReg = async (regId: string, tourneyId?: string) => {
    if (!confirm('Are you sure you want to delete this registered team?')) return

    const res = await deleteTournamentRegistration(regId)
    if (res.success) {
      showNotification('Registered team deleted successfully.')
      if (finishingTourney) {
        const regs = await fetchTournamentRegistrationsForAdmin(finishingTourney.id)
        setFinishRegs(regs)
      }
      if (tourneyId) {
        const regs = await fetchTournamentRegistrationsForAdmin(tourneyId)
        setSelectedTourneyRegs(regs)
      }
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to delete team', 'error')
    }
  }

  const handleSubmitFinishTournament = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!finishingTourney) return

    const top3Payload: TopTeamDetail[] = [
      top1Team,
      top2Team,
      top3Team,
    ].filter((item) => item.team_name.trim() !== '')

    const res = await updateTournamentTop3AndResults(finishingTourney.id, top3Payload, 'completed')
    if (!res.success) {
      showNotification(res.error || 'Failed to save tournament results', 'error')
      return
    }

    showNotification(`Tournament Results & Top 3 teams saved and published successfully!`)
    setFinishingTourney(null)
    loadAllAdminData()
  }

  const handleDeleteTournament = async (id: string) => {
    const { error } = await supabase.from('tournaments').delete().eq('id', id)
    if (!error) {
      showNotification('Tournament deleted.')
      loadAllAdminData()
    }
  }

  const handleViewRegistrations = async (t: Tournament) => {
    setSelectedTourneyTitle(t.title)
    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    setSelectedTourneyRegs(regs)
    setShowRegModal(true)
  }

  const handleSaveResults = async (regId: string, placement: number, kills: number) => {
    await saveMatchResults(regId, placement, kills)
    if (finishingTourney) {
      const regs = await fetchTournamentRegistrationsForAdmin(finishingTourney.id)
      setSelectedTourneyRegs(regs)
    }
  }

  // ==========================================
  // 3. LEADERBOARD HANDLERS (Add & Edit)
  // ==========================================
  const handleAddLbSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSecName) return

    const slug = newSecName.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
    const res = await createLeaderboardSection({
      name: newSecName,
      slug,
      icon_name: 'Trophy',
      description: newSecDesc,
      display_order: lbSections.length + 1,
      is_active: true,
    })

    if (res.success) {
      showNotification('Leaderboard section created!')
      setNewSecName('')
      setNewSecDesc('')
      loadAllAdminData()
    }
  }

  const handleSaveEditedLbSection = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingSec) return

    const res = await updateLeaderboardSection(editingSec.id, {
      name: editingSec.name,
      description: editingSec.description,
    })

    if (res.success) {
      showNotification('Leaderboard section updated!')
      setEditingSec(null)
      loadAllAdminData()
    }
  }

  // ==========================================
  // 4. ELITE ARMY GUILD HANDLERS (Add & Edit)
  // ==========================================
  const handleAddGuildPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMemberName || !guildInfo) return

    const { error } = await supabase.from('guild_members').insert([
      {
        guild_id: guildInfo.id,
        player_name: newMemberName,
        guild_role: newMemberRank,
        glory_contributed: parseInt(newMemberGlory) || 1000,
      },
    ])

    if (!error) {
      showNotification(`Player ${newMemberName} added to ELITE ARMY!`)
      setNewMemberName('')
      setNewMemberGlory('1000')
      loadAllAdminData()
    }
  }

  const handleSaveEditedMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    const res = await updateGuildMember(editingMember.id, {
      player_name: editingMember.player_name,
      guild_role: editingMember.guild_role,
      glory_contributed: editingMember.glory_contributed,
    })

    if (res.success) {
      showNotification('Guild player details updated!')
      setEditingMember(null)
      loadAllAdminData()
    }
  }

  const handleDeleteGuildPlayer = async (memberId: string) => {
    const { error } = await supabase.from('guild_members').delete().eq('id', memberId)
    if (!error) {
      showNotification('Player removed from ELITE ARMY.')
      loadAllAdminData()
    }
  }

  // ==========================================
  // 5. ACHIEVEMENTS HANDLERS (Add & Edit)
  // ==========================================
  const handleAddAchievement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!achTitle) return

    const res = await upsertAchievement({
      name: achTitle,
      description: achDesc || achTitle || 'Achievement reward card',
      icon_url: achBadge || undefined,
      player_name: achPlayerName || undefined,
      player_uid: achPlayerUid || undefined,
      avatar_url: achPlayerAvatar || undefined,
      achievement_type: 'tournament',
      xp_reward: parseInt(achXp) || 500,
      rarity: 'EPIC',
      is_active: true,
    })

    if (res.success) {
      showNotification('Achievement Card created!')
      setAchTitle('')
      setAchPlayerName('')
      setAchPlayerUid('')
      setAchPlayerAvatar('')
      setAchDesc('')
      setAchBadge('')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to create Achievement Card', 'error')
    }
  }

  const handleSaveEditedAchievement = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAch) return

    const res = await upsertAchievement({
      id: editingAch.id,
      name: editingAch.name,
      description: editingAch.description || editingAch.name || 'Achievement card',
      icon_url: editingAch.icon_url,
      player_name: editingAch.player_name || undefined,
      player_uid: editingAch.player_uid || undefined,
      xp_reward: editingAch.xp_reward || 500,
      rarity: editingAch.rarity || 'EPIC',
    })

    if (res.success) {
      showNotification('Achievement Card updated!')
      setEditingAch(null)
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to update Achievement Card', 'error')
    }
  }

  const handleDeleteAchievement = async (id: string) => {
    const res = await deleteAchievement(id)
    if (res.success) {
      showNotification('Achievement Card deleted.')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to delete Achievement Card', 'error')
    }
  }

  // 6. Clips
  const handleModerateClip = async (clipId: string, status: 'approved' | 'rejected') => {
    const res = await moderateClipStatus(clipId, status)
    if (res.success) {
      showNotification(`Clip ${status}!`)
      loadAllAdminData()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#050505] text-white overflow-hidden">
      <div className="relative flex h-full w-full flex-col bg-[#0c0c0e] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-[#120607] px-6 py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-amber-500" size={28} />
            <div>
              <h3 className="font-display text-2xl font-black uppercase text-white">
                ADMIN CONTROL CENTER
              </h3>
              <p className="text-[10px] font-bold tracking-widest text-amber-500">
                ELITE KANNADIGA BACKEND MANAGEMENT
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 border border-red-800 bg-red-950/60 px-4 py-2 text-xs font-black tracking-widest text-red-400 transition hover:bg-red-600 hover:text-white"
            >
              <LogOut size={14} /> LOGOUT
            </button>
            <button onClick={onClose} className="text-white/60 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Global Alert Notification */}
        {msg && (
          <div
            className={`px-6 py-2.5 text-xs font-bold ${
              msg.type === 'success'
                ? 'bg-emerald-950 text-emerald-400 border-b border-emerald-500/40'
                : 'bg-red-950 text-red-400 border-b border-red-500/40'
            }`}
          >
            {msg.text}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap border-b border-white/10 bg-[#050505] px-4">
          {[
            { id: 'HOME_CMS', label: 'HOME CMS', icon: Home },
            { id: 'TOURNAMENTS', label: 'TOURNAMENTS', icon: Trophy },
            { id: 'LEADERBOARD', label: 'LEADERBOARD', icon: Layers },
            { id: 'GUILD', label: `ELITE ARMY GUILD${!showGuildSection ? ' (HIDDEN)' : ''}`, icon: ShieldCheck },
            { id: 'ACHIEVEMENTS', label: 'ACHIEVEMENTS', icon: Award },
            { id: 'CLIPS', label: `CLIPS (${pendingClips.length})`, icon: Video },
          ].map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black tracking-wider transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-red-600 bg-white/5 text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                <Icon size={14} className={activeTab === tab.id ? 'text-red-500' : ''} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* ============================================================ */}
          {/* 1. HOME CMS TAB */}
          {/* ============================================================ */}
          {activeTab === 'HOME_CMS' && (
            <div className="space-y-6">
              {/* Add Card Form */}
              <div className="border border-white/10 bg-white/5 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ADD DYNAMIC CARD / STAT TO HOME PAGE
                </h4>
                <form onSubmit={handleAddHomeCard} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">TITLE / NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. TOURNAMENT POOL"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">STAT NUMBER / VALUE</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹5,00,000+"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">SUBTITLE / LABEL</label>
                    <input
                      type="text"
                      placeholder="e.g. PRIZES DISTRIBUTED"
                      value={newCardLabel}
                      onChange={(e) => setNewCardLabel(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full bg-red-600 py-2 text-xs font-black tracking-widest text-white transition hover:bg-red-500"
                    >
                      ADD CARD TO HOME
                    </button>
                  </div>
                </form>
              </div>

              {/* Existing Home Cards List with Edit Capability */}
              <div>
                <h4 className="eyebrow mb-3">EXISTING HOME CARDS & STATS ({homeCards.length})</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {homeCards.map((c) => (
                    <div key={c.id} className="relative border border-white/10 bg-white/5 p-4 flex justify-between items-start">
                      <div>
                        <p className="font-display text-xl font-black text-white">{c.stat_number || c.title}</p>
                        <p className="text-xs font-bold text-white/50">{c.stat_label || c.subtitle}</p>
                        <p className="mt-2 text-[10px] tracking-widest text-red-400 uppercase">Section: {c.section}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingHomeCard(c)}
                          className="text-white/40 hover:text-amber-400"
                          title="Edit Card"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteHomeCard(c.id)}
                          className="text-white/40 hover:text-red-500"
                          title="Delete Card"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 2. TOURNAMENTS TAB (CS & BR Split, Custom Prize, Close & Finish) */}
          {/* ============================================================ */}
          {activeTab === 'TOURNAMENTS' && (
            <div className="space-y-6">
              {/* Create Tournament Form */}
              <form onSubmit={handleCreateTournament} className="border border-white/10 bg-white/5 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ANNOUNCE NEW TOURNAMENT
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">TOURNAMENT TITLE *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ELITE CHAMPIONSHIP S4"
                      value={newTourneyTitle}
                      onChange={(e) => setNewTourneyTitle(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">GAME MODE *</label>
                    <select
                      value={newTourneyMode}
                      onChange={(e) => setNewTourneyMode(e.target.value)}
                      className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="CS SQUAD BATTLE">1. CS SQUAD BATTLE (Clash Squad)</option>
                      <option value="BR SQUAD BATTLE">2. BR SQUAD BATTLE (Battle Royale)</option>
                      <option value="BR SOLO">BR SOLO</option>
                      <option value="DUO DEATHMATCH">DUO DEATHMATCH</option>
                      <option value="GUILD VS GUILD">GUILD VS GUILD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">PRIZE POOL / OFFERS *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ₹10,000 OR Free Channel Membership"
                      value={customPrizeText}
                      onChange={(e) => setCustomPrizeText(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-amber-400">
                      REGISTRATION CLOSE DATE & TIME
                    </label>
                    <input
                      type="datetime-local"
                      value={regCloseDate}
                      onChange={(e) => setRegCloseDate(e.target.value)}
                      className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/80">
                      TOURNAMENT START DATE & TIME
                    </label>
                    <input
                      type="datetime-local"
                      value={tourneyStartDate}
                      onChange={(e) => setTourneyStartDate(e.target.value)}
                      className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/60">TOURNAMENT RULES</label>
                  <textarea
                    rows={3}
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 p-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-red-600 px-5 py-2.5 text-xs font-black tracking-widest text-white hover:bg-red-500"
                >
                  PUBLISH TOURNAMENT
                </button>
              </form>

              {/* Tournament List with Real-time Registrations Count & See Rules */}
              <div className="space-y-3">
                <h4 className="eyebrow">EXISTING TOURNAMENTS ({tournaments.length})</h4>
                {tournaments.map((t) => (
                  <div
                    key={t.id}
                    className="flex flex-col gap-3 border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-display text-lg font-black text-white">{t.title}</h5>
                        <span
                          className={`px-2 py-0.5 text-[9px] font-black uppercase ${
                            t.status === 'registration_open'
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                              : t.status === 'full'
                              ? 'bg-amber-950 text-amber-400 border border-amber-500/40'
                              : 'bg-red-950 text-red-400 border border-red-500/40'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-white/50 mt-1">
                        Mode: <strong className="text-white">{t.game_mode}</strong> • Prize: <strong className="text-red-400">{t.prize_pool}</strong> • Registered: <strong className="text-amber-400">{t.slots_filled || 0} / {t.max_slots} TEAMS</strong>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-white/60">
                        <span>Reg Closes: {t.registration_end ? new Date(t.registration_end).toLocaleString() : 'Open until full'}</span>
                        <span>• Starts: {new Date(t.tournament_start).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setRulesModalTourney(t)}
                        className="flex items-center gap-1 border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-black"
                      >
                        <FileText size={13} /> SEE RULES
                      </button>

                      <button
                        onClick={() => handleViewRegistrations(t)}
                        className="flex items-center gap-1 border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:border-red-500"
                      >
                        <Users size={14} /> VIEW REGS ({t.slots_filled || 0})
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => setEditingTourney(t)}
                        className="flex items-center gap-1 border border-amber-500/40 bg-amber-950/40 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500 hover:text-black"
                      >
                        <Edit2 size={13} /> EDIT
                      </button>

                      {/* Close Registration Button */}
                      {t.status === 'registration_open' && (
                        <button
                          onClick={() => handleCloseRegistration(t.id)}
                          className="flex items-center gap-1 border border-amber-600/40 bg-amber-950/60 px-3 py-1.5 text-xs font-bold text-amber-300 hover:bg-amber-600 hover:text-black"
                        >
                          <Lock size={13} /> CLOSE REGISTRATION
                        </button>
                      )}

                      {/* Finish / Edit Results Button */}
                      <button
                        onClick={() => handleOpenFinishModal(t)}
                        className={`flex items-center gap-1 border px-3 py-1.5 text-xs font-bold transition ${
                          t.status === 'completed'
                            ? 'border-amber-500/50 bg-amber-950/60 text-amber-400 hover:bg-amber-500 hover:text-black'
                            : 'border-emerald-500/50 bg-emerald-950/60 text-emerald-400 hover:bg-emerald-600 hover:text-white'
                        }`}
                      >
                        {t.status === 'completed' ? (
                          <>
                            <Trophy size={13} /> EDIT RESULTS & TOP 3
                          </>
                        ) : (
                          <>
                            <Flag size={13} /> FINISH & SET TOP 3
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDeleteTournament(t.id)}
                        className="p-1.5 text-white/40 hover:text-red-500"
                        title="Delete Tournament"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. LEADERBOARD TAB (GUN GODS & MOVEMENT GODS MANAGEMENT) */}
          {/* ============================================================ */}
          {activeTab === 'LEADERBOARD' && (
            <div className="space-y-6">
              <div className="border border-amber-600/40 bg-amber-950/20 p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="text-amber-400" size={32} />
                  <div>
                    <h4 className="font-display text-2xl font-black text-white">GUN GODS & MOVEMENT GODS MANAGEMENT</h4>
                    <p className="text-xs font-bold tracking-widest text-amber-400">
                      ASSIGN SPECIALIST HONORS & GUN/MOVEMENT TITLES TO PLAYERS BY SEARCHING THEIR GAME UID
                    </p>
                  </div>
                </div>
              </div>

              {/* Form to Add Player Honor */}
              <form onSubmit={handleAddPlayerHonor} className="border border-white/10 bg-white/5 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2 text-amber-400">
                  <Plus size={14} /> ASSIGN NEW PLAYER HONOR / TITLE
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">CATEGORY *</label>
                    <select
                      value={honorCategory}
                      onChange={(e) => setHonorCategory(e.target.value as any)}
                      className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="gun_gods">1. GUN GODS (Weapon Mastery)</option>
                      <option value="movement_gods">2. MOVEMENT GODS (Reflex & Speed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-amber-400">SEARCH PLAYER GAME UID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1928374650"
                      value={honorPlayerUid}
                      onChange={(e) => handleUidSearch(e.target.value)}
                      className="w-full border border-amber-500/40 bg-white/5 px-3 py-2 text-xs font-mono text-amber-300 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">PLAYER NAME (IGN)</label>
                    <input
                      type="text"
                      placeholder={searchingUid ? "Searching UID..." : "e.g. ELITE_RAHUL"}
                      value={honorPlayerName}
                      onChange={(e) => setHonorPlayerName(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">
                      {honorCategory === 'gun_gods' ? 'GUN NAME / TITLE *' : 'MOVEMENT STYLE / TITLE *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={honorCategory === 'gun_gods' ? "e.g. M1887 One-Tap King" : "e.g. 360 Gloo Wall Fast Dash"}
                      value={honorTitleName}
                      onChange={(e) => setHonorTitleName(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>

                {honorPlayerName && (
                  <div className="flex items-center gap-3 border border-amber-500/50 bg-amber-950/40 p-3 rounded">
                    <UserAvatar
                      src={honorPlayerAvatar || avatarMap.get(honorPlayerUid.trim().toLowerCase())}
                      name={honorPlayerName}
                      size="md"
                      className="border-2 border-amber-400"
                    />
                    <div>
                      <p className="text-xs font-black text-amber-300">
                        PLAYER DETECTED: <span className="text-white">{honorPlayerName}</span>
                      </p>
                      <p className="font-mono text-[10px] text-white/60">UID: {honorPlayerUid}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/60">DESCRIPTION / PLAYSTYLE DETAILS</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Unstoppable close-range headshot accuracy in 1v1 custom rooms."
                    value={honorDescription}
                    onChange={(e) => setHonorDescription(e.target.value)}
                    className="w-full border border-white/15 bg-white/5 p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-amber-600 px-6 py-2.5 text-xs font-black tracking-widest text-black hover:bg-amber-500 transition shadow-lg uppercase"
                >
                  ADD TO {honorCategory === 'gun_gods' ? 'GUN GODS' : 'MOVEMENT GODS'}
                </button>
              </form>

              {/* Gun Gods List */}
              <div className="space-y-3">
                <h4 className="eyebrow text-amber-400">GUN GODS LEADERBOARD HONORS ({gunGodsList.length})</h4>
                <div className="space-y-2">
                  {gunGodsList.map((h, idx) => (
                    <div key={h.id || idx} className="flex items-center justify-between border border-amber-900/40 bg-white/5 p-4">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-sm font-black text-amber-400">#{String(idx + 1).padStart(2, '0')}</span>
                        <UserAvatar
                          src={h.avatar_url || avatarMap.get((h.player_uid || '').trim().toLowerCase())}
                          name={h.player_name}
                          size="md"
                          className="border border-amber-500/40"
                        />
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">{h.player_name}</span>
                            <span className="font-mono text-xs text-amber-400">UID: {h.player_uid}</span>
                            <span className="border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[9px] font-black text-amber-300">
                              {h.title_name}
                            </span>
                          </div>
                          {h.description && <p className="text-xs text-white/60 mt-1 italic font-mono">"{h.description}"</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlayerHonor(h.id)}
                        className="text-white/40 hover:text-red-500 p-2"
                        title="Remove Title"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movement Gods List */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h4 className="eyebrow text-cyan-400">MOVEMENT GODS LEADERBOARD HONORS ({movementGodsList.length})</h4>
                <div className="space-y-2">
                  {movementGodsList.map((h, idx) => (
                    <div key={h.id || idx} className="flex items-center justify-between border border-cyan-900/40 bg-white/5 p-4">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-sm font-black text-cyan-400">#{String(idx + 1).padStart(2, '0')}</span>
                        <UserAvatar
                          src={h.avatar_url || avatarMap.get((h.player_uid || '').trim().toLowerCase())}
                          name={h.player_name}
                          size="md"
                          className="border border-cyan-500/40"
                        />
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-white">{h.player_name}</span>
                            <span className="font-mono text-xs text-amber-400">UID: {h.player_uid}</span>
                            <span className="border border-cyan-500/40 bg-cyan-950/60 px-2 py-0.5 text-[9px] font-black text-cyan-300">
                              {h.title_name}
                            </span>
                          </div>
                          {h.description && <p className="text-xs text-white/60 mt-1 italic font-mono">"{h.description}"</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlayerHonor(h.id)}
                        className="text-white/40 hover:text-red-500 p-2"
                        title="Remove Title"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 4. ELITE ARMY GUILD TAB */}
          {/* ============================================================ */}
          {activeTab === 'GUILD' && (
            <div className="space-y-6">
              <div className="border border-red-900/40 bg-red-950/20 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-red-500" size={32} />
                  <div>
                    <h4 className="font-display text-2xl font-black text-white">ELITE ARMY (OFFICIAL GUILD)</h4>
                    <p className="text-xs font-bold tracking-widest text-red-400">
                      SINGLE OFFICIAL GUILD • RANKED STRICTLY BY PLAYER GLORY SCORE
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-black/60 border border-white/10 px-4 py-3 rounded-lg shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-white/60 tracking-wider">User Guild Section Status</span>
                    <span className={`text-xs font-black uppercase tracking-wider ${showGuildSection ? 'text-green-400' : 'text-red-500'}`}>
                      {showGuildSection ? '● VISIBLE TO USERS' : '○ HIDDEN FROM USERS'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGuildSection}
                    className={`ml-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded transition-all shadow-md ${
                      showGuildSection
                        ? 'bg-red-600 hover:bg-red-700 text-white border border-red-400'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-400'
                    }`}
                  >
                    {showGuildSection ? 'HIDE GUILD SECTION' : 'SHOW GUILD SECTION'}
                  </button>
                </div>
              </div>

              {/* Add Guild Member */}
              <form onSubmit={handleAddGuildPlayer} className="border border-white/10 bg-white/5 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ADD PLAYER TO ELITE ARMY
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">PLAYER IGN *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ELITE_VIKRAM"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">INITIAL GLORY POINTS *</label>
                    <input
                      type="number"
                      required
                      value={newMemberGlory}
                      onChange={(e) => setNewMemberGlory(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">GUILD ROLE</label>
                    <select
                      value={newMemberRank}
                      onChange={(e) => setNewMemberRank(e.target.value)}
                      className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="leader">leader</option>
                      <option value="officer">officer</option>
                      <option value="member">member</option>
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-red-600 px-5 py-2 text-xs font-black tracking-widest text-white hover:bg-red-500"
                >
                  ADD TO ELITE ARMY
                </button>
              </form>

              {/* Members List sorted by Glory with Edit Button */}
              <div className="space-y-3">
                <h4 className="eyebrow">GUILD ROSTER (ORDERED BY GLORY RANKING)</h4>
                <div className="space-y-2">
                  {guildMembers.map((m, idx) => (
                    <div
                      key={m.id || idx}
                      className="flex items-center justify-between border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex items-center gap-4">
                        <span className="font-display text-lg font-black text-amber-400">
                          #{String(idx + 1).padStart(2, '0')}
                        </span>
                        <div>
                          <p className="font-display text-base font-black text-white">
                            {m.player_name || m.profiles?.ign || 'ELITE_PLAYER'}
                          </p>
                          <p className="text-[10px] font-bold text-white/50 uppercase">
                            Role: {m.guild_role || 'member'} • Glory: {m.glory_contributed || 1000} GP
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingMember(m)}
                          className="text-white/40 hover:text-amber-400 p-2"
                          title="Edit Player Details"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteGuildPlayer(m.id)}
                          className="text-white/40 hover:text-red-500 p-2"
                          title="Remove Member"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. ACHIEVEMENTS TAB */}
          {/* ============================================================ */}
          {activeTab === 'ACHIEVEMENTS' && (
            <div className="space-y-6">
              <form onSubmit={handleAddAchievement} className="border border-white/10 bg-white/5 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ADD NEW ACHIEVEMENT CARD
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">ACHIEVEMENT TITLE *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SQUAD SLAYER"
                      value={achTitle}
                      onChange={(e) => setAchTitle(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">PLAYER NAME / IGN</label>
                    <input
                      type="text"
                      placeholder="e.g. ELITE_RAHUL"
                      value={achPlayerName}
                      onChange={(e) => setAchPlayerName(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-amber-400">PLAYER FREE FIRE UID</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={achPlayerUid}
                      onChange={(e) => setAchPlayerUid(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-amber-400 font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">DESCRIPTION</label>
                    <input
                      type="text"
                      placeholder="e.g. Wipe an entire enemy squad solo"
                      value={achDesc}
                      onChange={(e) => setAchDesc(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">IMAGE / BADGE ICON URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://..."
                      value={achBadge}
                      onChange={(e) => setAchBadge(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-bold text-white/60">XP REWARD</label>
                    <input
                      type="number"
                      value={achXp}
                      onChange={(e) => setAchXp(e.target.value)}
                      className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-red-600 px-5 py-2 text-xs font-black tracking-widest text-white hover:bg-red-500"
                >
                  SAVE ACHIEVEMENT CARD
                </button>
              </form>

              {/* Achievements Grid with Edit Button */}
              <div className="space-y-3">
                <h4 className="eyebrow">EXISTING ACHIEVEMENTS ({achievements.length})</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((a) => (
                    <div key={a.id} className="border border-white/10 bg-white/5 p-4 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {a.icon_url ? (
                          <img src={a.icon_url} alt={a.name} className="h-8 w-8 object-contain" />
                        ) : (
                          <Award size={28} className="text-red-500" />
                        )}
                        <div>
                          <h5 className="font-display text-base font-black text-white">{a.name}</h5>
                          {(a.player_name || a.player_uid) && (
                            <p className="text-[11px] font-bold text-amber-400">
                              👤 {a.player_name || 'N/A'} {a.player_uid ? `(UID: ${a.player_uid})` : ''}
                            </p>
                          )}
                          <p className="text-xs text-white/50">{a.description}</p>
                          <p className="mt-1 text-[10px] font-bold text-amber-400">+{a.xp_reward} XP REWARD</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAch(a)}
                          className="text-white/40 hover:text-amber-400"
                          title="Edit Card"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAchievement(a.id)}
                          className="text-white/40 hover:text-red-500"
                          title="Delete Card"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 6. COMMUNITY CLIPS MODERATION TAB */}
          {/* ============================================================ */}
          {activeTab === 'CLIPS' && (
            <div className="space-y-4">
              <h4 className="eyebrow">PENDING COMMUNITY CLIPS MODERATION</h4>
              {pendingClips.length === 0 ? (
                <div className="border border-white/10 p-8 text-center text-sm text-white/40">
                  No pending clips moderation right now. All clear!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between border border-white/10 bg-white/5 p-4"
                    >
                      <div>
                        <h5 className="font-display text-lg font-black text-white">{clip.title}</h5>
                        <p className="text-xs text-white/50">
                          Submitted by: <strong className="text-white">{clip.player_name}</strong> • Category: {clip.category}
                        </p>
                        <a
                          href={clip.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-red-400 underline"
                        >
                          <Eye size={12} /> Watch Video Clip
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleModerateClip(clip.id, 'approved')}
                          className="flex items-center gap-1 border border-emerald-500/50 bg-emerald-950/40 px-3 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-600 hover:text-white"
                        >
                          <Check size={14} /> APPROVE
                        </button>
                        <button
                          onClick={() => handleModerateClip(clip.id, 'rejected')}
                          className="flex items-center gap-1 border border-red-500/50 bg-red-950/40 px-3 py-1.5 text-xs font-bold text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <X size={14} /> REJECT
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL OVERLAYS (RULES, REGISTRATION CARDS, EDIT MODALS) */}
      {/* ============================================================ */}

      {/* 1. Admin See Rules Modal */}
      {rulesModalTourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-lg border border-amber-500/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4">
            <button onClick={() => setRulesModalTourney(null)} className="absolute right-4 top-4 text-white/60 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-black uppercase text-amber-400">TOURNAMENT RULES</h3>
            <p className="text-xs text-white/60">{rulesModalTourney.title}</p>
            <div className="whitespace-pre-wrap border border-white/10 bg-white/5 p-4 text-xs text-white/90 max-h-[50vh] overflow-y-auto">
              {rulesModalTourney.rules || 'No custom rules specified for this tournament.'}
            </div>
          </div>
        </div>
      )}

      {/* 2. View Registrations (Separate Cards for Each Registered Team/Player) */}
      {showRegModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-4xl border border-red-800/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowRegModal(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div>
                <h3 className="font-display text-xl font-black uppercase text-white">
                  REGISTERED TEAMS: {selectedTourneyTitle}
                </h3>
                <p className="text-xs text-white/60">
                  TOTAL REGISTERED: <strong className="text-amber-400">{selectedTourneyRegs.length} TEAMS / PLAYERS</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  const tourney = tournaments.find((t) => t.title === selectedTourneyTitle || t.id === selectedTourneyRegs[0]?.tournament_id)
                  if (tourney) setAdminRegTourneyId(tourney.id)
                  setAdminAddRegModalOpen(true)
                }}
                className="flex items-center gap-1.5 bg-red-600 px-3.5 py-2 text-xs font-black text-white hover:bg-red-500 shadow"
              >
                <Plus size={14} /> ADMIN REGISTER TEAM
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {selectedTourneyRegs.length === 0 ? (
                <div className="border border-white/10 p-8 text-center text-xs text-white/40">
                  No registered teams found for this tournament yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedTourneyRegs.map((r, i) => (
                    <div key={r.id || i} className="border border-red-900/40 bg-[#120607] p-4 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2">
                        <span className="font-display text-base font-black text-white">
                          #{i + 1} {r.team_name || r.captain_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="border border-red-600/40 bg-red-950/60 px-2 py-0.5 text-[9px] font-black tracking-widest text-red-400 uppercase">
                            {r.registration_status || 'CONFIRMED'}
                          </span>
                          <button
                            onClick={() => handleDeleteReg(r.id, r.tournament_id)}
                            className="flex items-center gap-1 border border-red-800 bg-red-950/80 px-2 py-0.5 text-[9px] font-bold text-red-400 hover:bg-red-600 hover:text-white"
                            title="Delete Registered Team"
                          >
                            <Trash2 size={11} /> DELETE
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="rounded border border-red-900/40 bg-red-950/20 p-2 space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-red-400">👑 1. Team Leader: <strong className="text-white">{r.captain_name}</strong></span>
                            <span className="font-mono text-[10px] text-amber-300">UID: {r.captain_free_fire_uid || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-1">
                            <span className="text-white/80">🎮 2. 2nd Player: <strong className="text-white">{r.teammate_names?.[0] || 'N/A'}</strong></span>
                            <span className="font-mono text-[10px] text-amber-300/80">UID: {r.teammate_uids?.[0] || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-1">
                            <span className="text-white/80">🎮 3. 3rd Player: <strong className="text-white">{r.teammate_names?.[1] || 'N/A'}</strong></span>
                            <span className="font-mono text-[10px] text-amber-300/80">UID: {r.teammate_uids?.[1] || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-1">
                            <span className="text-white/80">🎮 4. 4th Player: <strong className="text-white">{r.teammate_names?.[2] || 'N/A'}</strong></span>
                            <span className="font-mono text-[10px] text-amber-300/80">UID: {r.teammate_uids?.[2] || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/50">PLACE:</span>
                          <input
                            type="number"
                            placeholder="#"
                            defaultValue={r.placement || ''}
                            onBlur={(e) => handleSaveResults(r.id, Number(e.target.value), r.kills || 0)}
                            className="w-14 border border-white/20 bg-black px-2 py-1 text-xs text-center font-bold text-white"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-white/50">KILLS:</span>
                          <input
                            type="number"
                            placeholder="Kills"
                            defaultValue={r.kills || 0}
                            onBlur={(e) => handleSaveResults(r.id, r.placement || 0, Number(e.target.value))}
                            className="w-14 border border-white/20 bg-black px-2 py-1 text-xs text-center font-bold text-red-400"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 3. Finish / Edit Tournament Results & Top 3 Teams Modal */}
      {finishingTourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-4xl border border-emerald-600/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-white">
            <button
              onClick={() => setFinishingTourney(null)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-3">
                <Trophy className="text-amber-400" size={28} />
                <div>
                  <h3 className="font-display text-xl font-black uppercase text-white">
                    MANAGE RESULTS & TOP 3 TEAMS
                  </h3>
                  <p className="text-xs text-amber-400 font-bold">{finishingTourney.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAdminRegTourneyId(finishingTourney.id)
                  setAdminAddRegModalOpen(true)
                }}
                className="flex items-center gap-1.5 bg-red-600 px-3.5 py-2 text-xs font-black text-white hover:bg-red-500 shadow"
              >
                <Plus size={14} /> ADMIN REGISTER TEAM
              </button>
            </div>

            <form onSubmit={handleSubmitFinishTournament} className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* TOP 3 PODIUM SECTION */}
              <div className="space-y-4">
                <h4 className="eyebrow flex items-center gap-2 text-amber-400">
                  <Award size={16} /> TOP 3 PODIUM SQUADS (4 PLAYERS PER TEAM)
                </h4>

                <div className="grid gap-4 md:grid-cols-3">
                  {/* 1st Place - Gold */}
                  <div className="border border-amber-500/50 bg-amber-950/20 p-4 space-y-3 rounded">
                    <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
                      <span className="font-display text-sm font-black text-amber-400">
                        🥇 1ST PLACE (WINNER)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              setTop1Team({
                                rank: 1,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: reg.captain_name || '',
                                captain_uid: reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 35,
                                prize: '₹5,000',
                                player_names: extractPlayerNames(reg),
                                player_uids: extractPlayerUids(reg),
                              })
                            }
                          }}
                          className="bg-black text-[10px] text-amber-300 border border-amber-500/40 px-1 py-0.5"
                        >
                          <option value="">-- Autofill --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-amber-300 block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        required
                        value={top1Team.team_name}
                        onChange={(e) => setTop1Team({ ...top1Team, team_name: e.target.value })}
                        className="w-full border border-amber-500/40 bg-black/60 px-2.5 py-1.5 text-xs text-white font-bold"
                        placeholder="Winner Team Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN NAME</label>
                        <input
                          type="text"
                          value={top1Team.captain_name}
                          onChange={(e) => setTop1Team({ ...top1Team, captain_name: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="Captain IGN"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN UID</label>
                        <input
                          type="text"
                          value={top1Team.captain_uid}
                          onChange={(e) => setTop1Team({ ...top1Team, captain_uid: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="FF UID"
                        />
                      </div>
                    </div>

                    {/* 4 Player Names Editor */}
                    <div className="space-y-1.5 border-t border-white/10 pt-2">
                      <label className="text-[10px] font-bold text-amber-300 block">4 SQUAD PLAYERS (NAMES):</label>
                      <div className="space-y-1">
                        {[0, 1, 2, 3].map((idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Player ${idx + 1} Name`}
                            value={top1Team.player_names?.[idx] || (idx === 0 ? top1Team.captain_name : '')}
                            onChange={(e) => {
                              const names = [...(top1Team.player_names || [top1Team.captain_name, '', '', ''])]
                              names[idx] = e.target.value
                              setTop1Team({ ...top1Team, player_names: names })
                            }}
                            className="w-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] text-white"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top1Team.kills}
                          onChange={(e) => setTop1Team({ ...top1Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-amber-400 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top1Team.points || 0}
                          onChange={(e) => setTop1Team({ ...top1Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-400 block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top1Team.prize || ''}
                        onChange={(e) => setTop1Team({ ...top1Team, prize: e.target.value })}
                        className="w-full border border-amber-500/40 bg-black/60 px-2.5 py-1.5 text-xs text-amber-400 font-bold"
                        placeholder="e.g. ₹5,000"
                      />
                    </div>
                  </div>

                  {/* 2nd Place - Silver */}
                  <div className="border border-slate-400/40 bg-slate-900/40 p-4 space-y-3 rounded">
                    <div className="flex items-center justify-between border-b border-slate-400/30 pb-2">
                      <span className="font-display text-sm font-black text-slate-300">
                        🥈 2ND PLACE (RUNNER UP)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              setTop2Team({
                                rank: 2,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: reg.captain_name || '',
                                captain_uid: reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 25,
                                prize: '₹3,000',
                                player_names: extractPlayerNames(reg),
                                player_uids: extractPlayerUids(reg),
                              })
                            }
                          }}
                          className="bg-black text-[10px] text-slate-300 border border-slate-400/40 px-1 py-0.5"
                        >
                          <option value="">-- Autofill --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        value={top2Team.team_name}
                        onChange={(e) => setTop2Team({ ...top2Team, team_name: e.target.value })}
                        className="w-full border border-slate-400/40 bg-black/60 px-2.5 py-1.5 text-xs text-white font-bold"
                        placeholder="2nd Team Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN NAME</label>
                        <input
                          type="text"
                          value={top2Team.captain_name}
                          onChange={(e) => setTop2Team({ ...top2Team, captain_name: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="Captain IGN"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN UID</label>
                        <input
                          type="text"
                          value={top2Team.captain_uid}
                          onChange={(e) => setTop2Team({ ...top2Team, captain_uid: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="FF UID"
                        />
                      </div>
                    </div>

                    {/* 4 Player Names Editor */}
                    <div className="space-y-1.5 border-t border-white/10 pt-2">
                      <label className="text-[10px] font-bold text-slate-300 block">4 SQUAD PLAYERS (NAMES):</label>
                      <div className="space-y-1">
                        {[0, 1, 2, 3].map((idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Player ${idx + 1} Name`}
                            value={top2Team.player_names?.[idx] || (idx === 0 ? top2Team.captain_name : '')}
                            onChange={(e) => {
                              const names = [...(top2Team.player_names || [top2Team.captain_name, '', '', ''])]
                              names[idx] = e.target.value
                              setTop2Team({ ...top2Team, player_names: names })
                            }}
                            className="w-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] text-white"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top2Team.kills}
                          onChange={(e) => setTop2Team({ ...top2Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-slate-300 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top2Team.points || 0}
                          onChange={(e) => setTop2Team({ ...top2Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-300 block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top2Team.prize || ''}
                        onChange={(e) => setTop2Team({ ...top2Team, prize: e.target.value })}
                        className="w-full border border-slate-400/40 bg-black/60 px-2.5 py-1.5 text-xs text-slate-300 font-bold"
                        placeholder="e.g. ₹3,000"
                      />
                    </div>
                  </div>

                  {/* 3rd Place - Bronze */}
                  <div className="border border-amber-700/40 bg-amber-950/10 p-4 space-y-3 rounded">
                    <div className="flex items-center justify-between border-b border-amber-700/30 pb-2">
                      <span className="font-display text-sm font-black text-amber-500">
                        🥉 3RD PLACE (2ND RUNNER UP)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              setTop3Team({
                                rank: 3,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: reg.captain_name || '',
                                captain_uid: reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 18,
                                prize: '₹2,000',
                                player_names: extractPlayerNames(reg),
                                player_uids: extractPlayerUids(reg),
                              })
                            }
                          }}
                          className="bg-black text-[10px] text-amber-500 border border-amber-700/40 px-1 py-0.5"
                        >
                          <option value="">-- Autofill --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-amber-400 block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        value={top3Team.team_name}
                        onChange={(e) => setTop3Team({ ...top3Team, team_name: e.target.value })}
                        className="w-full border border-amber-700/40 bg-black/60 px-2.5 py-1.5 text-xs text-white font-bold"
                        placeholder="3rd Team Name"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN NAME</label>
                        <input
                          type="text"
                          value={top3Team.captain_name}
                          onChange={(e) => setTop3Team({ ...top3Team, captain_name: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="Captain IGN"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">CAPTAIN UID</label>
                        <input
                          type="text"
                          value={top3Team.captain_uid}
                          onChange={(e) => setTop3Team({ ...top3Team, captain_uid: e.target.value })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white"
                          placeholder="FF UID"
                        />
                      </div>
                    </div>

                    {/* 4 Player Names Editor */}
                    <div className="space-y-1.5 border-t border-white/10 pt-2">
                      <label className="text-[10px] font-bold text-amber-500 block">4 SQUAD PLAYERS (NAMES):</label>
                      <div className="space-y-1">
                        {[0, 1, 2, 3].map((idx) => (
                          <input
                            key={idx}
                            type="text"
                            placeholder={`Player ${idx + 1} Name`}
                            value={top3Team.player_names?.[idx] || (idx === 0 ? top3Team.captain_name : '')}
                            onChange={(e) => {
                              const names = [...(top3Team.player_names || [top3Team.captain_name, '', '', ''])]
                              names[idx] = e.target.value
                              setTop3Team({ ...top3Team, player_names: names })
                            }}
                            className="w-full border border-white/20 bg-black/60 px-2 py-1 text-[11px] text-white"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-white/10 pt-2">
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top3Team.kills}
                          onChange={(e) => setTop3Team({ ...top3Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-amber-500 font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-white/60 block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top3Team.points || 0}
                          onChange={(e) => setTop3Team({ ...top3Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-white/20 bg-black/60 px-2 py-1 text-xs text-white font-bold"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-500 block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top3Team.prize || ''}
                        onChange={(e) => setTop3Team({ ...top3Team, prize: e.target.value })}
                        className="w-full border border-amber-700/40 bg-black/60 px-2.5 py-1.5 text-xs text-amber-500 font-bold"
                        placeholder="e.g. ₹2,000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTERED TEAMS SCORES & PLACEMENT QUICK EDIT */}
              {finishRegs.length > 0 && (
                <div className="space-y-3 border-t border-white/10 pt-4">
                  <h4 className="eyebrow flex items-center gap-2">
                    <Users size={15} /> ALL REGISTERED TEAMS ({finishRegs.length}) - EDIT PLACEMENTS & KILLS
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {finishRegs.map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between border border-white/10 bg-white/5 p-3 text-xs">
                        <div>
                          <p className="font-bold text-white">{r.team_name || r.captain_name}</p>
                          <p className="text-[10px] text-white/50">Captain: {r.captain_name} (FF UID: {r.captain_free_fire_uid})</p>
                          {r.teammate_names && r.teammate_names.length > 0 && (
                            <p className="text-[9px] text-amber-300">
                              Teammates: {r.teammate_names.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/50">RANK:</span>
                            <input
                              type="number"
                              placeholder="#"
                              defaultValue={r.placement || i + 1}
                              onBlur={(e) => handleSaveResults(r.id, Number(e.target.value), r.kills || 0)}
                              className="w-12 border border-white/20 bg-black px-2 py-1 text-xs font-bold text-white text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-white/50">KILLS:</span>
                            <input
                              type="number"
                              placeholder="Kills"
                              defaultValue={r.kills || 0}
                              onBlur={(e) => handleSaveResults(r.id, r.placement || (i + 1), Number(e.target.value))}
                              className="w-12 border border-white/20 bg-black px-2 py-1 text-xs font-bold text-red-400 text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReg(r.id, r.tournament_id)}
                            className="text-red-400 hover:text-white p-1"
                            title="Delete Registered Team"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="border-t border-white/10 pt-4">
                <button
                  type="submit"
                  className="w-full bg-emerald-600 py-3 font-display text-xs font-black tracking-widest text-white hover:bg-emerald-500 transition shadow-lg"
                >
                  SAVE & PUBLISH TOURNAMENT RESULTS & TOP 3 TEAMS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Edit Tournament Card Modal */}
      {editingTourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-md border border-amber-500/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 text-white">
            <button onClick={() => setEditingTourney(null)} className="absolute right-4 top-4 text-white/60 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-black uppercase text-amber-400">EDIT TOURNAMENT CARD</h3>
            <form onSubmit={handleSaveEditedTournament} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">TOURNAMENT TITLE</label>
                <input
                  type="text"
                  value={editingTourney.title || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, title: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">GAME MODE</label>
                <select
                  value={editingTourney.game_mode}
                  onChange={(e) => setEditingTourney({ ...editingTourney, game_mode: e.target.value })}
                  className="w-full border border-white/15 bg-[#121214] px-3 py-2 text-xs text-white focus:outline-none"
                >
                  <option value="CS SQUAD BATTLE">1. CS SQUAD BATTLE (Clash Squad)</option>
                  <option value="BR SQUAD BATTLE">2. BR SQUAD BATTLE (Battle Royale)</option>
                  <option value="BR SOLO">BR SOLO</option>
                  <option value="DUO DEATHMATCH">DUO DEATHMATCH</option>
                  <option value="GUILD VS GUILD">GUILD VS GUILD</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">PRIZE POOL / OFFERS</label>
                <input
                  type="text"
                  value={editingTourney.prize_pool || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, prize_pool: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">RULES</label>
                <textarea
                  rows={3}
                  value={editingTourney.rules || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, rules: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 p-2 text-xs text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-amber-600 py-2.5 text-xs font-black tracking-widest text-black hover:bg-amber-500">
                UPDATE DATABASE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Admin Manual Team Registration Modal */}
      {adminAddRegModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-4">
          <div className="relative w-full max-w-xl border border-red-600/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 text-white max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAdminAddRegModalOpen(false)}
              className="absolute right-4 top-4 text-white/60 hover:text-white"
            >
              <X size={20} />
            </button>
            <div className="border-b border-white/10 pb-3">
              <h3 className="font-display text-xl font-black uppercase text-red-500 flex items-center gap-2">
                <Plus size={20} /> ADMIN MANUAL TEAM REGISTRATION
              </h3>
              <p className="text-xs text-white/60">
                Register any team (Solo or 4-Player Squad) into the selected tournament directly.
              </p>
            </div>

            <form onSubmit={handleAdminRegisterTeamSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/70">
                  SELECT TOURNAMENT *
                </label>
                <select
                  required
                  value={adminRegTourneyId}
                  onChange={(e) => setAdminRegTourneyId(e.target.value)}
                  className="w-full border border-white/20 bg-black px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                >
                  <option value="">-- Choose Tournament --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.game_mode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/70">
                    TEAM / SQUAD NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ELITE TITANS"
                    value={adminRegTeamName}
                    onChange={(e) => setAdminRegTeamName(e.target.value)}
                    className="w-full border border-white/20 bg-black px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-white/70">
                    CONTACT PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={adminRegPhone}
                    onChange={(e) => setAdminRegPhone(e.target.value)}
                    className="w-full border border-white/20 bg-black px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Player 1 - Captain */}
              <div className="border border-red-900/40 bg-red-950/20 p-3 space-y-2 rounded">
                <p className="text-xs font-black text-red-400 uppercase flex items-center gap-1.5">
                  <User size={13} /> PLAYER 1 (CAPTAIN) *
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Captain Name / IGN *"
                    value={adminRegCaptainName}
                    onChange={(e) => setAdminRegCaptainName(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Captain Free Fire UID *"
                    value={adminRegCaptainUid}
                    onChange={(e) => setAdminRegCaptainUid(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Player 2 */}
              <div className="border border-white/10 bg-white/5 p-3 space-y-2 rounded">
                <p className="text-[11px] font-bold text-white/70 uppercase">PLAYER 2 (TEAMMATE 1)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 2 Name"
                    value={adminRegP2Name}
                    onChange={(e) => setAdminRegP2Name(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Player 2 FF UID"
                    value={adminRegP2Uid}
                    onChange={(e) => setAdminRegP2Uid(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Player 3 */}
              <div className="border border-white/10 bg-white/5 p-3 space-y-2 rounded">
                <p className="text-[11px] font-bold text-white/70 uppercase">PLAYER 3 (TEAMMATE 2)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 3 Name"
                    value={adminRegP3Name}
                    onChange={(e) => setAdminRegP3Name(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Player 3 FF UID"
                    value={adminRegP3Uid}
                    onChange={(e) => setAdminRegP3Uid(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              {/* Player 4 */}
              <div className="border border-white/10 bg-white/5 p-3 space-y-2 rounded">
                <p className="text-[11px] font-bold text-white/70 uppercase">PLAYER 4 (TEAMMATE 3)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 4 Name"
                    value={adminRegP4Name}
                    onChange={(e) => setAdminRegP4Name(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="text"
                    placeholder="Player 4 FF UID"
                    value={adminRegP4Uid}
                    onChange={(e) => setAdminRegP4Uid(e.target.value)}
                    className="w-full border border-white/20 bg-black px-2.5 py-1.5 text-xs text-amber-400 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-red-600 py-3 text-xs font-black tracking-widest text-white uppercase hover:bg-red-500 transition shadow-lg"
              >
                CONFIRM & REGISTER TEAM AS ADMIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 6. Edit Achievement Card Modal */}
      {editingAch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4">
          <div className="relative w-full max-w-md border border-amber-500/80 bg-[#0c0c0e] p-6 shadow-2xl space-y-4 text-white">
            <button onClick={() => setEditingAch(null)} className="absolute right-4 top-4 text-white/60 hover:text-white">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-black uppercase text-amber-400">EDIT ACHIEVEMENT CARD</h3>
            <form onSubmit={handleSaveEditedAchievement} className="space-y-3">
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">CARD TITLE</label>
                <input
                  type="text"
                  value={editingAch.name || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, name: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-white/60">PLAYER NAME</label>
                  <input
                    type="text"
                    value={editingAch.player_name || ''}
                    onChange={(e) => setEditingAch({ ...editingAch, player_name: e.target.value })}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                    placeholder="e.g. ELITE_RAHUL"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-bold text-amber-400">PLAYER FF UID</label>
                  <input
                    type="text"
                    value={editingAch.player_uid || ''}
                    onChange={(e) => setEditingAch({ ...editingAch, player_uid: e.target.value })}
                    className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-amber-400 font-mono focus:outline-none"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={editingAch.description || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, description: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 p-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">IMAGE / BADGE URL</label>
                <input
                  type="text"
                  value={editingAch.icon_url || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, icon_url: e.target.value })}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-bold text-white/60">XP REWARD</label>
                <input
                  type="number"
                  value={editingAch.xp_reward || 500}
                  onChange={(e) => setEditingAch({ ...editingAch, xp_reward: parseInt(e.target.value) || 0 })}
                  className="w-full border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:outline-none"
                />
              </div>
              <button type="submit" className="w-full bg-amber-600 py-2.5 text-xs font-black tracking-widest text-black hover:bg-amber-500">
                UPDATE ACHIEVEMENT CARD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
