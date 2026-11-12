'use client'

import { useState, useEffect, useRef } from 'react'
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
  Unlock,
  UserPlus,
  Flag,
  FileText,
  Calendar,
  Clock,
  Megaphone,
  Image as ImageIcon,
  Music,
  Volume2,
  VolumeX,
  Upload,
  Play,
  Pause,
  RefreshCw,
  Swords,
  Archive,
} from 'lucide-react'
import {
  HomeCard,
  Tournament,
  TournamentRegistration,
  TournamentArchive,
  LeaderboardSection,
  Achievement,
  CommunityClip,
  TopTeamDetail,
  Profile,
  GuildChallenge,
  GuildChallengeStatus,
  PRESET_CHAMPION_IMAGES,
  PRESET_BGMS,
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
  fetchTournamentArchives,
  archiveCompletedTournament,
  archiveAllCompletedTournaments,
  fetchUserCleanupStats,
  purgeNonAdminUsers,
  factoryResetKeepAdmin,
  fetchLeaderboardSections,
  createLeaderboardSection,
  updateLeaderboardSection,
  fetchEliteArmyGuild,
  updateGuildMemberGlory,
  updateGuildMember,
  fetchRegisteredPlayers,
  addOrRegisterGuildMember,
  updateGuildMemberDetails,
  deleteGuildMember,
  fetchGuildChallenges,
  resolveGuildChallenge,
  deleteGuildChallenge,
  GUILD_ROLES,
  normalizeGuildRole,
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
  fetchSiteSettingText,
  updateSiteSetting,
  fetchSiteSettingJson,
  updateSiteSettingJson,
} from '../../lib/supabase'
import { MIN_CHALLENGE_GLORY } from '../../lib/guild-challenges'
import { UserAvatar } from '../ui/UserAvatar'
import { AnnouncementsTab } from './announcements/AnnouncementsTab'

interface AdminDashboardProps {
  isOpen: boolean
  onClose: () => void
}

type TabType = 'HOME_CMS' | 'TOURNAMENTS' | 'LEADERBOARD' | 'GUILD' | 'ACHIEVEMENTS' | 'CLIPS' | 'ANNOUNCEMENTS'

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
  const [tournamentArchives, setTournamentArchives] = useState<TournamentArchive[]>([])
  const [userCleanupStats, setUserCleanupStats] = useState({
    totalProfiles: 0,
    adminProfiles: 0,
    nonAdminProfiles: 0,
    staleHonors: 0,
    staleAchievements: 0,
  })
  const [archivingTourneyId, setArchivingTourneyId] = useState<string | null>(null)
  const [purgingUsers, setPurgingUsers] = useState(false)
  const [resettingAllData, setResettingAllData] = useState(false)
  const [newTourneyTitle, setNewTourneyTitle] = useState('')
  const [newTourneyMode, setNewTourneyMode] = useState('CS SQUAD BATTLE')
  const [customPrizeText, setCustomPrizeText] = useState('₹10,000')
  const [regCloseDate, setRegCloseDate] = useState('')
  const [tourneyStartDate, setTourneyStartDate] = useState('')
  const [rulesText, setRulesText] = useState('1. All players must register with valid Free Fire UIDs.\n2. Duplicate Free Fire UIDs are strictly prohibited across all teams.\n3. Teams must check in 15 minutes prior to official room start time.\n4. Zero tolerance for hacks, third-party scripts, or bug exploits.')

  const [editingTourney, setEditingTourney] = useState<Tournament | null>(null)
  const [selectedTourneyRegs, setSelectedTourneyRegs] = useState<TournamentRegistration[]>([])
  const [selectedTourneyTitle, setSelectedTourneyTitle] = useState('')
  const [selectedTourneyId, setSelectedTourneyId] = useState('')
  const [showRegModal, setShowRegModal] = useState(false)
  const [rulesModalTourney, setRulesModalTourney] = useState<Tournament | null>(null)

  // Finish Tournament & Submit Results Modal State
  const [finishingTourney, setFinishingTourney] = useState<Tournament | null>(null)
  const [finishRegs, setFinishRegs] = useState<TournamentRegistration[]>([])

  const [top1Team, setTop1Team] = useState<TopTeamDetail>({ rank: 1, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: ['', '', '', ''], player_uids: ['', '', '', ''] })
  const [top2Team, setTop2Team] = useState<TopTeamDetail>({ rank: 2, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: ['', '', '', ''], player_uids: ['', '', '', ''] })
  const [top3Team, setTop3Team] = useState<TopTeamDetail>({ rank: 3, team_name: '', captain_name: '', captain_uid: '', kills: 0, points: 0, prize: '', player_names: ['', '', '', ''], player_uids: ['', '', '', ''] })
  const [finishChampionsImageUrl, setFinishChampionsImageUrl] = useState<string>('')
  const [finishResultsBgmUrl, setFinishResultsBgmUrl] = useState<string>('')
  const [imageFileName, setImageFileName] = useState<string>('')
  const [audioFileName, setAudioFileName] = useState<string>('')
  const [adminAudioTesting, setAdminAudioTesting] = useState(false)
  const [adminAudioElement, setAdminAudioElement] = useState<HTMLAudioElement | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadingAudio, setUploadingAudio] = useState(false)
  const finishImageInputRef = useRef<HTMLInputElement>(null)
  const finishAudioInputRef = useRef<HTMLInputElement>(null)

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
  const [registeredPlayers, setRegisteredPlayers] = useState<Profile[]>([])
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>('')
  const [playerSearchQuery, setPlayerSearchQuery] = useState<string>('')
  const [newMemberRanking, setNewMemberRanking] = useState<string>('1')
  const [newMemberUid, setNewMemberUid] = useState('')
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberGlory, setNewMemberGlory] = useState('1000')
  const [newMemberRank, setNewMemberRank] = useState('👤 Member')
  const [addingGuildMember, setAddingGuildMember] = useState(false)
  const [editingMember, setEditingMember] = useState<any | null>(null)
  const [guildChallenges, setGuildChallenges] = useState<GuildChallenge[]>([])
  const [resolvingChallengeId, setResolvingChallengeId] = useState<string | null>(null)

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

  // User Dashboard Live Section Visibility Toggle State
  const [showLiveSection, setShowLiveSection] = useState<boolean>(false)
  const [liveTourneyId, setLiveTourneyId] = useState<string>('')

  const handleToggleLiveSection = async () => {
    const newValue = !showLiveSection
    setShowLiveSection(newValue)
    const res = await updateSiteSetting('show_user_dashboard_live_section', newValue)
    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        newValue
          ? 'LIVE TOURNAMENT SECTION IS NOW VISIBLE IN USER DASHBOARD!'
          : 'LIVE TOURNAMENT SECTION IS NOW HIDDEN FROM USER DASHBOARD!',
        newValue ? 'success' : 'error'
      )
    } else {
      showNotification('Failed to update Live Section visibility setting', 'error')
      setShowLiveSection(!newValue)
    }
  }

  const handleSetLiveTournament = async (tId: string) => {
    setLiveTourneyId(tId)
    const res = await updateSiteSetting('live_tournament_id', tId)
    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Featured Live Tournament updated!')
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
        setHonorPlayerAvatar(prof.avatar_url || '')
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
        setAchPlayerAvatar(prof.avatar_url || '')
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

    // Load Tournaments & Archives + User Cleanup Stats
    const [tourneys, archives, cleanupStats] = await Promise.all([
      fetchTournaments(),
      fetchTournamentArchives(),
      fetchUserCleanupStats(),
    ])
    setTournaments(tourneys)
    setTournamentArchives(archives)
    setUserCleanupStats(cleanupStats)

    // Load Leaderboard Sections
    const secs = await fetchLeaderboardSections()
    setLbSections(secs)
    if (secs.length > 0 && !selectedSecId) setSelectedSecId(secs[0].id)

    // Load Honors
    await loadHonorsData()

    // Load Single Guild: ELITE ARMY & Visibility Setting
    const guildSetting = await fetchSiteSetting('show_guild_section', 'true')
    setShowGuildSection(guildSetting)

    // Load User Dashboard Live Section Visibility Setting
    const liveSetting = await fetchSiteSetting('show_user_dashboard_live_section', 'false')
    setShowLiveSection(liveSetting)
    const savedLiveTourneyId = await fetchSiteSettingText('live_tournament_id', '')
    setLiveTourneyId(savedLiveTourneyId)

    const guildRes = await fetchEliteArmyGuild()
    setGuildInfo(guildRes.guild)
    setGuildMembers(guildRes.members)
    setNewMemberRanking(String((guildRes.members?.length || 0) + 1))

    const challengeList = await fetchGuildChallenges(guildRes.guild?.id)
    setGuildChallenges(challengeList)

    // Load Registered Players
    const regPlayers = await fetchRegisteredPlayers()
    setRegisteredPlayers(regPlayers)

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

  const handleReopenRegistration = async (tourneyId: string) => {
    const res = await updateTournament(tourneyId, { status: 'registration_open' })
    if (res.success) {
      showNotification('Registration reopened for this tournament!')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to reopen registration', 'error')
    }
  }

  const extractPlayerNames = (r: TournamentRegistration) => {
    const names: string[] = []
    if (r.captain_name) names.push(r.captain_name)
    if (Array.isArray(r.teammate_names)) {
      r.teammate_names.forEach((n) => { if (n && n.trim()) names.push(n.trim()) })
    }
    while (names.length < 4) names.push('')
    return names.slice(0, 4)
  }

  const extractPlayerUids = (r: TournamentRegistration) => {
    const uids: string[] = []
    if (r.captain_free_fire_uid) uids.push(r.captain_free_fire_uid)
    if (Array.isArray(r.teammate_uids)) {
      r.teammate_uids.forEach((u) => { if (u && u.trim()) uids.push(u.trim()) })
    }
    while (uids.length < 4) uids.push('')
    return uids.slice(0, 4)
  }

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFileName(file.name)
    setUploadingImage(true)

    // Instant local object URL for preview
    const previewUrl = URL.createObjectURL(file)
    setFinishChampionsImageUrl(previewUrl)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'images')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (json.success && json.url) {
        setFinishChampionsImageUrl(json.url)
        showNotification(`Attached image "${file.name}" ready!`)
        return
      }

      // Fallback to Supabase Storage if API response was unsuccessful
      const fileExt = file.name.split('.').pop() || 'png'
      const fileName = `tournaments/${finishingTourney?.id || 'tourney'}_champions_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          setFinishChampionsImageUrl(urlData.publicUrl)
        }
      }
    } catch (err) {
      console.warn('Image upload notice:', err)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAudioFileName(file.name)
    setUploadingAudio(true)

    if (adminAudioElement) {
      adminAudioElement.pause()
      setAdminAudioTesting(false)
    }

    // Instant local object URL for test playback
    const previewUrl = URL.createObjectURL(file)
    setFinishResultsBgmUrl(previewUrl)

    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('type', 'audio')

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      })
      const json = await res.json()
      if (json.success && json.url) {
        setFinishResultsBgmUrl(json.url)
        showNotification(`Attached audio "${file.name}" ready!`)
        return
      }

      // Fallback to Supabase Storage if API response was unsuccessful
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp3'
      const mimeType = file.type || (fileExt === 'mp4' ? 'video/mp4' : 'audio/mpeg')
      const fileName = `audio/${finishingTourney?.id || 'tourney'}_victory_${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadErr } = await supabase.storage.from('avatars').upload(fileName, file, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      })
      if (!uploadErr && uploadData) {
        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        if (urlData?.publicUrl) {
          setFinishResultsBgmUrl(urlData.publicUrl)
        }
      }
    } catch (err) {
      console.warn('Audio upload notice:', err)
    } finally {
      setUploadingAudio(false)
    }
  }

  const toggleAdminAudioTest = () => {
    if (!finishResultsBgmUrl) return
    if (adminAudioTesting && adminAudioElement) {
      adminAudioElement.pause()
      setAdminAudioTesting(false)
    } else {
      if (adminAudioElement) {
        adminAudioElement.pause()
      }
      const audio = new Audio(finishResultsBgmUrl)
      audio.preload = 'auto'
      audio.onended = () => setAdminAudioTesting(false)
      audio.onerror = () => {
        setAdminAudioTesting(false)
        showNotification('Unable to preview audio track. Check that your MP3 or MP4 file has a valid audio track.', 'error')
      }
      audio.play().then(() => {
        setAdminAudioTesting(true)
        setAdminAudioElement(audio)
      }).catch((err) => {
        console.warn('Audio test blocked:', err)
        setAdminAudioTesting(false)
      })
    }
  }

  const handleOpenFinishModal = async (t: Tournament) => {
    setFinishingTourney(t)
    setFinishChampionsImageUrl(t.champions_image_url || '')
    setFinishResultsBgmUrl(t.results_bgm_url || '')
    setImageFileName('')
    setAudioFileName('')
    if (adminAudioElement) {
      adminAudioElement.pause()
      setAdminAudioElement(null)
      setAdminAudioTesting(false)
    }

    const regs = await fetchTournamentRegistrationsForAdmin(t.id)
    setFinishRegs(regs)

    const prepTeam = (
      rank: 1 | 2 | 3,
      defaultPoints: number,
      defaultPrize: string,
      reg?: TournamentRegistration,
      existing?: TopTeamDetail
    ): TopTeamDetail => {
      if (existing) {
        const names = existing.player_names && existing.player_names.length >= 4
          ? [...existing.player_names]
          : [
              existing.captain_name || reg?.captain_name || '',
              existing.player_names?.[1] || reg?.teammate_names?.[0] || '',
              existing.player_names?.[2] || reg?.teammate_names?.[1] || '',
              existing.player_names?.[3] || reg?.teammate_names?.[2] || '',
            ]
        const uids = existing.player_uids && existing.player_uids.length >= 4
          ? [...existing.player_uids]
          : [
              existing.captain_uid || reg?.captain_free_fire_uid || '',
              existing.player_uids?.[1] || reg?.teammate_uids?.[0] || '',
              existing.player_uids?.[2] || reg?.teammate_uids?.[1] || '',
              existing.player_uids?.[3] || reg?.teammate_uids?.[2] || '',
            ]
        while (names.length < 4) names.push('')
        while (uids.length < 4) uids.push('')
        return {
          rank,
          team_name: existing.team_name || reg?.team_name || reg?.captain_name || '',
          captain_name: names[0] || existing.captain_name || '',
          captain_uid: uids[0] || existing.captain_uid || '',
          kills: existing.kills ?? (reg?.kills || 0),
          points: existing.points ?? defaultPoints,
          prize: existing.prize || defaultPrize,
          player_names: names.slice(0, 4),
          player_uids: uids.slice(0, 4),
        }
      }

      if (reg) {
        const names = extractPlayerNames(reg)
        const uids = extractPlayerUids(reg)
        return {
          rank,
          team_name: reg.team_name || reg.captain_name || '',
          captain_name: names[0] || reg.captain_name || '',
          captain_uid: uids[0] || reg.captain_free_fire_uid || '',
          kills: reg.kills || 0,
          points: defaultPoints,
          prize: defaultPrize,
          player_names: names,
          player_uids: uids,
        }
      }

      return {
        rank,
        team_name: '',
        captain_name: '',
        captain_uid: '',
        kills: 0,
        points: defaultPoints,
        prize: defaultPrize,
        player_names: ['', '', '', ''],
        player_uids: ['', '', '', ''],
      }
    }

    const t1 = t.top_3_teams?.find((x) => x.rank === 1)
    const t2 = t.top_3_teams?.find((x) => x.rank === 2)
    const t3 = t.top_3_teams?.find((x) => x.rank === 3)

    setTop1Team(prepTeam(1, 35, '₹5,000', regs[0], t1))
    setTop2Team(prepTeam(2, 25, '₹3,000', regs[1], t2))
    setTop3Team(prepTeam(3, 18, '₹2,000', regs[2], t3))
  }

  const handleAdminRegisterTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!adminRegTourneyId || !adminRegCaptainName.trim() || !adminRegCaptainUid.trim()) {
      showNotification('Please select a tournament and enter Captain Name & UID', 'error')
      return
    }

    const cleanCapUid = adminRegCaptainUid.trim().replace(/\D/g, '')
    if (!cleanCapUid) {
      showNotification('Captain Free Fire UID must contain numbers only.', 'error')
      return
    }

    const p2Name = adminRegP2Name.trim()
    const p2Uid = adminRegP2Uid.trim().replace(/\D/g, '')
    const p3Name = adminRegP3Name.trim()
    const p3Uid = adminRegP3Uid.trim().replace(/\D/g, '')
    const p4Name = adminRegP4Name.trim()
    const p4Uid = adminRegP4Uid.trim().replace(/\D/g, '')

    const teammateNames: string[] = []
    const teammateUids: string[] = []

    if (p2Name && p2Uid) {
      teammateNames.push(p2Name)
      teammateUids.push(p2Uid)
    }
    if (p3Name && p3Uid) {
      teammateNames.push(p3Name)
      teammateUids.push(p3Uid)
    }
    if (p4Name && p4Uid) {
      teammateNames.push(p4Name)
      teammateUids.push(p4Uid)
    }

    const res = await registerTournamentTeam({
      tournamentId: adminRegTourneyId,
      captainName: adminRegCaptainName.trim(),
      captainUid: cleanCapUid,
      phone: adminRegPhone.trim() || '+91 9000000000',
      teamName: adminRegTeamName.trim() || adminRegCaptainName.trim(),
      teammateNames,
      teammateUids,
      isAdmin: true,
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

    if (adminAudioElement) {
      adminAudioElement.pause()
      setAdminAudioElement(null)
      setAdminAudioTesting(false)
    }

    const cleanTeam = (item: TopTeamDetail): TopTeamDetail => {
      const names = (item.player_names || []).map((n) => n.trim())
      const uids = (item.player_uids || []).map((u) => u.trim())
      while (names.length < 4) names.push('')
      while (uids.length < 4) uids.push('')
      return {
        ...item,
        team_name: item.team_name.trim(),
        captain_name: names[0] || item.captain_name.trim(),
        captain_uid: uids[0] || item.captain_uid?.trim() || '',
        player_names: names.slice(0, 4),
        player_uids: uids.slice(0, 4),
      }
    }

    const top3Payload: TopTeamDetail[] = [
      cleanTeam(top1Team),
      cleanTeam(top2Team),
      cleanTeam(top3Team),
    ].filter((item) => item.team_name.trim() !== '')

    const res = await updateTournamentTop3AndResults(
      finishingTourney.id,
      top3Payload,
      'completed',
      {
        championsImageUrl: finishChampionsImageUrl.trim(),
        resultsBgmUrl: finishResultsBgmUrl.trim(),
      }
    )
    if (!res.success) {
      showNotification(res.error || 'Failed to save tournament results', 'error')
      return
    }

    showNotification(`Tournament Results & Top 3 teams saved and published successfully!`)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('tournaments_updated'))
    }
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

  const handleArchiveTournament = async (tournamentId: string, title?: string) => {
    setArchivingTourneyId(tournamentId)
    const res = await archiveCompletedTournament(tournamentId)
    setArchivingTourneyId(null)
    if (res.success) {
      showNotification(`Archived "${title || res.archive?.title || 'Tournament'}" (${res.archive?.slots_filled || 0} teams saved separately).`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tournaments_updated'))
      }
      await Promise.all([loadAllAdminData(), loadHonorsData()])
    } else {
      showNotification(res.error || 'Failed to archive tournament', 'error')
    }
  }

  const handleArchiveAllCompleted = async () => {
    setArchivingTourneyId('all')
    const res = await archiveAllCompletedTournaments()
    setArchivingTourneyId(null)
    if (res.success) {
      showNotification(`Archived ${res.count} completed tournament(s) separately!`)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tournaments_updated'))
      }
      await Promise.all([loadAllAdminData(), loadHonorsData()])
    } else {
      showNotification(res.error || 'Failed to archive completed tournaments', 'error')
    }
  }

  const handlePurgeNonAdminUsers = async () => {
    if (
      !confirm(
        `This will:\n1. Save separate permanent archives of all finished tournaments (Season 1, Season 2, etc.) with all teams & podiums.\n2. Delete ALL ${userCleanupStats.nonAdminProfiles} non-admin / dummy user accounts from the application while keeping Admin accounts untouched.\n\nProceed?`
      )
    ) {
      return
    }
    setPurgingUsers(true)
    const res = await purgeNonAdminUsers()
    setPurgingUsers(false)
    if (res.success) {
      showNotification(
        `Done! Archived ${res.archivedTournaments} tournament(s), deleted ${res.deletedProfiles} profile(s) & ${res.deletedAuthUsers} auth account(s), preserved ${res.preservedAdmins} admin(s).`
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tournaments_updated'))
      }
      await Promise.all([loadAllAdminData(), loadHonorsData()])
    } else {
      showNotification(res.error || 'Failed to clean up non-admin users', 'error')
    }
  }

  const handleFactoryReset = async () => {
    if (
      !confirm(
        'WARNING: This will PERMANENTLY delete ALL tournaments, tournament results, archives, leaderboard honors, achievements, guild members, uploaded player images, and ALL non-admin user accounts & UIDs.\n\nOnly Admin login accounts will be preserved.\n\nProceed with full reset?'
      )
    ) {
      return
    }
    setResettingAllData(true)
    const res = await factoryResetKeepAdmin()
    setResettingAllData(false)
    if (res.success) {
      showNotification(
        `Factory reset complete! Deleted ${res.deletedProfiles ?? 0} profile(s), ${res.deletedAuthUsers ?? 0} auth user(s), and ${res.deletedStorageObjects ?? 0} storage file(s). Kept ${res.preservedAdmins ?? 1} admin login.`
      )
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('tournaments_updated'))
        window.dispatchEvent(new Event('site_settings_updated'))
      }
      await Promise.all([loadAllAdminData(), loadHonorsData()])
    } else {
      showNotification(res.error || 'Factory reset failed', 'error')
    }
  }

  const handleViewRegistrations = async (t: Tournament) => {
    setSelectedTourneyTitle(t.title)
    setSelectedTourneyId(t.id)
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
  const handleSelectRegisteredPlayer = (playerId: string) => {
    setSelectedPlayerId(playerId)
    if (!playerId) return
    const sel = registeredPlayers.find((p) => p.id === playerId)
    if (sel) {
      setNewMemberUid(sel.free_fire_uid || '')
      setNewMemberName(sel.ign || sel.username || '')
    }
  }

  const handleGuildUidChange = (uidVal: string) => {
    const prevSelected = registeredPlayers.find((p) => p.id === selectedPlayerId)
    setNewMemberUid(uidVal)
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
      if (!newMemberName.trim() || (prevSelected && newMemberName.trim() === (prevSelected.ign || prevSelected.username || '').trim())) {
        setNewMemberName(matched.ign || matched.username || '')
      }
    } else if (prevSelected && prevSelected.free_fire_uid?.trim() && prevSelected.free_fire_uid.trim() !== trimmed) {
      setSelectedPlayerId('')
    }
  }

  const handleAddGuildPlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guildInfo) {
      showNotification('Guild record not loaded yet. Please wait or refresh.', 'error')
      return
    }
    if (!selectedPlayerId && !newMemberUid.trim()) {
      showNotification('Please select a registered player or enter a Free Fire UID!', 'error')
      return
    }
    if (!newMemberName.trim()) {
      showNotification('Please enter the Name of the Player!', 'error')
      return
    }

    setAddingGuildMember(true)
    const res = await addOrRegisterGuildMember({
      guildId: guildInfo.id,
      selectedPlayerId,
      uid: newMemberUid,
      playerName: newMemberName,
      role: newMemberRank as any,
      glory: parseInt(newMemberGlory) || 1000,
      ranking: parseInt(newMemberRanking) || (guildMembers.length + 1),
      kills: 0,
    })
    setAddingGuildMember(false)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification(
        res.wasNewlyRegistered
          ? `UID ${newMemberUid.trim()} automatically registered as ${res.playerName || newMemberName.trim()} and added to ELITE ARMY!`
          : `Player ${res.playerName || newMemberName.trim()} added to ELITE ARMY!`
      )
      setSelectedPlayerId('')
      setPlayerSearchQuery('')
      setNewMemberUid('')
      setNewMemberName('')
      setNewMemberGlory('1000')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to add player to guild', 'error')
    }
  }

  const handleSaveEditedMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember) return

    const res = await updateGuildMemberDetails(editingMember.id, {
      role: editingMember.guild_role,
      glory: parseInt(String(editingMember.glory_contributed)) || 0,
      ranking: parseInt(String(editingMember.ranking)) || 1,
      kills: parseInt(String(editingMember.kills)) || 0,
      userId: editingMember.user_id,
      playerName: editingMember.player_name,
    })

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Guild player details updated!')
      setEditingMember(null)
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to update member', 'error')
    }
  }

  const handleDeleteGuildPlayer = async (memberId: string, userId?: string) => {
    if (!confirm('Are you sure you want to remove this player from ELITE ARMY?')) return
    const res = await deleteGuildMember(memberId, userId)
    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Player removed from ELITE ARMY.')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to remove player', 'error')
    }
  }

  const handleResolveGuildChallenge = async (challengeId: string, nextStatus: GuildChallengeStatus) => {
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
          ? 'Challenge resolved & player ranks swapped!'
          : `Challenge marked as ${nextStatus.replace('_', ' ')}.`
      )
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to resolve challenge', 'error')
    }
  }

  const handleDeleteGuildChallengeRecord = async (challengeId: string) => {
    if (!confirm('Delete this rank challenge record?')) return
    setResolvingChallengeId(challengeId)
    const res = await deleteGuildChallenge(challengeId)
    setResolvingChallengeId(null)

    if (res.success) {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('site_settings_updated'))
      }
      showNotification('Challenge record deleted.')
      loadAllAdminData()
    } else {
      showNotification(res.error || 'Failed to delete challenge', 'error')
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

  const adminTabs = [
    { id: 'HOME_CMS', label: 'Home CMS', icon: Home },
    {
      id: 'TOURNAMENTS',
      label: `Tournaments${showLiveSection ? ' · Live' : ''}`,
      icon: Trophy,
    },
    { id: 'ANNOUNCEMENTS', label: 'ANNOUNCEMENTS', icon: Megaphone },
    { id: 'LEADERBOARD', label: 'Leaderboard', icon: Layers },
    {
      id: 'GUILD',
      label: `Elite Army Guild${!showGuildSection ? ' · Hidden' : ''}`,
      icon: ShieldCheck,
    },
    { id: 'ACHIEVEMENTS', label: 'Achievements', icon: Award },
    {
      id: 'CLIPS',
      label: 'Clips',
      icon: Video,
      count: pendingClips.length,
    },
  ]

  return (
    <div className="admin-dashboard-root fixed inset-0 z-50 flex flex-col overflow-hidden bg-canvas text-ink neu-theme">
      <div className="relative flex h-full w-full flex-col overflow-hidden bg-canvas">
        {/* Header */}
        <header className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-brand-border bg-brand-muted text-brand-bright">
              <ShieldCheck size={19} />
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight text-ink">
                Control center
              </h1>
              <p className="hidden truncate text-xs text-ink-subtle sm:block">
                ELITE ಕನ್ನಡಿಗ operations
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <div className="hidden sm:block">
              <span className="badge">Admin</span>
            </div>
            <button
              onClick={handleLogout}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Logout</span>
            </button>
            <button
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-md text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink"
              aria-label="Close dashboard"
            >
              <X size={19} />
            </button>
          </div>
        </header>

        {/* Global alert */}
        {msg && (
          <div
            className={`shrink-0 border-b px-4 py-2.5 text-xs font-medium sm:px-6 ${
              msg.type === 'success'
                ? 'border-line-strong bg-surface-3 text-ink'
                : 'border-brand-border bg-brand-muted text-brand-bright'
            }`}
            role="status"
          >
            {msg.text}
          </div>
        )}

        <div className="flex min-h-0 flex-1 overflow-hidden bg-canvas">
          {/* Desktop sidebar */}
          <aside className="hidden w-64 shrink-0 flex-col border-r border-line-subtle bg-surface xl:flex 2xl:w-72">
            <div className="flex-1 overflow-y-auto p-3">
              <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                Workspace
              </p>
              <nav className="space-y-1" aria-label="Admin sections">
                {adminTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-left text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-muted text-ink'
                          : 'text-ink-muted hover:bg-surface-2 hover:text-ink'
                      }`}
                    >
                      <Icon
                        size={16}
                        className={
                          isActive ? 'shrink-0 text-brand-bright' : 'shrink-0 text-ink-subtle'
                        }
                      />
                      <span className="truncate">{tab.label}</span>
                      {'count' in tab && tab.count ? (
                        <span className="ml-auto rounded bg-brand px-1.5 py-0.5 text-xs font-semibold text-white">
                          {tab.count}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </nav>
            </div>
            <div className="border-t border-line-subtle p-3">
              <p className="px-3 text-xs text-ink-subtle">Signed in as admin</p>
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Mobile / tablet tabs */}
            <div className="relative shrink-0 border-b border-line-subtle bg-surface xl:hidden">
              <div className="no-scrollbar flex overflow-x-auto px-2">
                {adminTabs.map((tab) => {
                  const Icon = tab.icon
                  const isActive = activeTab === tab.id
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as TabType)}
                      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-3 text-xs font-semibold transition-colors ${
                        isActive
                          ? 'border-brand text-ink'
                          : 'border-transparent text-ink-subtle hover:text-ink'
                      }`}
                    >
                      <Icon size={14} className={isActive ? 'text-brand-bright' : ''} />
                      {tab.label}
                    </button>
                  )
                })}
              </div>
              <div
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-surface to-transparent"
                aria-hidden="true"
              />
            </div>

            {/* Main content */}
            <main className="flex-1 overflow-y-auto p-4 sm:p-6 2xl:p-8">
              <div className="mx-auto w-full max-w-[1600px] space-y-6">
          {/* ============================================================ */}
          {/* 1. HOME CMS TAB */}
          {/* ============================================================ */}
          {activeTab === 'HOME_CMS' && (
            <div className="space-y-6">
              {/* Add Card Form */}
              <div className="border border-line-subtle bg-surface-2 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> Add home card / stat
                </h4>
                <form onSubmit={handleAddHomeCard} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block label">TITLE / NAME</label>
                    <input
                      type="text"
                      placeholder="e.g. TOURNAMENT POOL"
                      value={newCardTitle}
                      onChange={(e) => setNewCardTitle(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">STAT NUMBER / VALUE</label>
                    <input
                      type="text"
                      placeholder="e.g. ₹5,00,000+"
                      value={newCardNumber}
                      onChange={(e) => setNewCardNumber(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">SUBTITLE / LABEL</label>
                    <input
                      type="text"
                      placeholder="e.g. PRIZES DISTRIBUTED"
                      value={newCardLabel}
                      onChange={(e) => setNewCardLabel(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="btn-primary w-full"
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
                    <div key={c.id} className="relative border border-line-subtle bg-surface-2 p-4 flex justify-between items-start">
                      <div>
                        <p className="font-display text-xl font-extrabold text-ink">{c.stat_number || c.title}</p>
                        <p className="text-xs font-bold text-ink-subtle">{c.stat_label || c.subtitle}</p>
                        <p className="mt-2 text-xs tracking-widest text-brand-bright uppercase">Section: {c.section}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingHomeCard(c)}
                          className="text-ink-subtle hover:text-brand-bright"
                          title="Edit Card"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteHomeCard(c.id)}
                          className="text-ink-subtle hover:text-brand-bright"
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
              {/* User Dashboard Live Section Toggle Banner */}
              <div className="flex flex-wrap items-center justify-between gap-4 border border-brand-border bg-gradient-to-r from-brand-muted via-surface to-canvas p-4 sm:p-5 shadow-lg">
                <div className="flex items-center gap-3.5">
                  <div className="relative flex h-3.5 w-3.5 items-center justify-center">
                    <span
                      className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${
                        showLiveSection ? 'bg-brand' : 'bg-surface-3'
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-3 w-3 rounded-full ${
                        showLiveSection ? 'bg-brand' : 'bg-surface-3'
                      }`}
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display text-sm font-extrabold uppercase tracking-wider text-ink">
                        User Dashboard Live Section
                      </h4>
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider ${
                          showLiveSection
                            ? 'border border-line-strong bg-surface-3 text-ink'
                            : 'border border-line-subtle bg-surface-2 text-ink-subtle'
                        }`}
                      >
                        {showLiveSection ? '● VISIBLE TO USERS' : '○ HIDDEN FROM USERS'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-muted">
                      When enabled, users will see the 🔴 LIVE ARENA tab in their dashboard displaying the real-time points table and open registrations.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  {tournaments.length > 0 && (
                    <select
                      value={liveTourneyId}
                      onChange={(e) => handleSetLiveTournament(e.target.value)}
                      className="border border-line bg-surface px-3 py-2 text-xs font-bold text-ink focus:border-brand focus:outline-none"
                      title="Featured Tournament for Live Section"
                    >
                      <option value="">Auto-Detect Active Tournament</option>
                      {tournaments.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.status})
                        </option>
                      ))}
                    </select>
                  )}

                  <button
                    type="button"
                    onClick={handleToggleLiveSection}
                    className={`px-4 py-2 text-xs font-extrabold uppercase tracking-wider transition-all shadow-md ${
                      showLiveSection
                        ? 'bg-brand hover:bg-brand text-ink border border-brand shadow-brand/20'
                        : 'bg-surface-3 hover:bg-surface-3 text-ink border border-line-strong shadow-black/20'
                    }`}
                  >
                    {showLiveSection ? 'HIDE LIVE SECTION' : 'SHOW LIVE SECTION'}
                  </button>
                </div>
              </div>

              {/* Create Tournament Form */}
              <form onSubmit={handleCreateTournament} className="border border-line-subtle bg-surface-2 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ANNOUNCE NEW TOURNAMENT
                </h4>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block label">TOURNAMENT TITLE *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ELITE CHAMPIONSHIP S4"
                      value={newTourneyTitle}
                      onChange={(e) => setNewTourneyTitle(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">GAME MODE *</label>
                    <select
                      value={newTourneyMode}
                      onChange={(e) => setNewTourneyMode(e.target.value)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                    >
                      <option value="CS SQUAD BATTLE">1. CS SQUAD BATTLE (Clash Squad)</option>
                      <option value="BR SQUAD BATTLE">2. BR SQUAD BATTLE (Battle Royale)</option>
                      <option value="BR SOLO">BR SOLO</option>
                      <option value="DUO DEATHMATCH">DUO DEATHMATCH</option>
                      <option value="GUILD VS GUILD">GUILD VS GUILD</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block label">PRIZE POOL / OFFERS *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. ₹10,000 OR Free Channel Membership"
                      value={customPrizeText}
                      onChange={(e) => setCustomPrizeText(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-brand-bright">
                      REGISTRATION CLOSE DATE & TIME
                    </label>
                    <input
                      type="datetime-local"
                      value={regCloseDate}
                      onChange={(e) => setRegCloseDate(e.target.value)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-ink">
                      TOURNAMENT START DATE & TIME
                    </label>
                    <input
                      type="datetime-local"
                      value={tourneyStartDate}
                      onChange={(e) => setTourneyStartDate(e.target.value)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block label">TOURNAMENT RULES</label>
                  <textarea
                    rows={3}
                    value={rulesText}
                    onChange={(e) => setRulesText(e.target.value)}
                    className="w-full border border-line bg-surface-2 p-3 text-xs text-ink focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-brand px-5 py-2.5 text-xs font-extrabold tracking-widest text-ink hover:bg-brand"
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
                    className="flex flex-col gap-3 border border-line-subtle bg-surface-2 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-display text-lg font-extrabold text-ink">{t.title}</h5>
                        <span
                          className={`px-2 py-0.5 text-xs font-extrabold uppercase ${
                            t.status === 'registration_open'
                              ? 'bg-surface-3 text-ink border border-line-strong'
                              : t.status === 'full'
                              ? 'bg-brand-muted text-brand-bright border border-brand'
                              : 'bg-brand-muted text-brand-bright border border-brand'
                          }`}
                        >
                          {t.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-xs text-ink-subtle mt-1">
                        Mode: <strong className="text-ink">{t.game_mode}</strong> • Prize: <strong className="text-brand-bright">{t.prize_pool}</strong> • Registered: <strong className="text-brand-bright">{t.slots_filled || 0} / {t.max_slots} TEAMS</strong>
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-ink-muted">
                        <span>Reg Closes: {t.registration_end ? new Date(t.registration_end).toLocaleString() : 'Open until full'}</span>
                        <span>• Starts: {new Date(t.tournament_start).toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setRulesModalTourney(t)}
                        className="flex items-center gap-1 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-bold text-brand-bright hover:bg-brand hover:text-ink"
                      >
                        <FileText size={13} /> SEE RULES
                      </button>

                      <button
                        onClick={() => handleViewRegistrations(t)}
                        className="flex items-center gap-1 border border-line bg-surface-3 px-3 py-1.5 text-xs font-bold text-ink hover:border-brand"
                      >
                        <Users size={14} /> VIEW REGS ({t.slots_filled || 0})
                      </button>

                      {/* Admin Direct Register Team Button */}
                      <button
                        onClick={() => {
                          setAdminRegTourneyId(t.id)
                          setAdminAddRegModalOpen(true)
                        }}
                        className="flex items-center gap-1 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-extrabold text-brand-bright hover:bg-brand hover:text-ink transition shadow-sm"
                        title="Register team directly into this tournament even if registrations are closed"
                      >
                        <UserPlus size={13} /> + REGISTER TEAM
                      </button>

                      {/* Edit Button */}
                      <button
                        onClick={() => {
                          if (t.status === 'completed') {
                            handleOpenFinishModal(t)
                          } else {
                            setEditingTourney(t)
                          }
                        }}
                        className="flex items-center gap-1 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-bold text-brand-bright hover:bg-brand hover:text-ink"
                        title={t.status === 'completed' ? 'Edit Top 3 Teams, Player UIDs & Attached Media' : 'Edit Tournament Card'}
                      >
                        <Edit2 size={13} /> {t.status === 'completed' ? 'EDIT RESULTS' : 'EDIT'}
                      </button>

                      {/* Close or Re-Open Registration Button */}
                      {t.status === 'registration_open' ? (
                        <button
                          onClick={() => handleCloseRegistration(t.id)}
                          className="flex items-center gap-1 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-bold text-brand-bright hover:bg-brand hover:text-ink transition"
                          title="Close public registration (sets status to FULL)"
                        >
                          <Lock size={13} /> CLOSE REG
                        </button>
                      ) : t.status !== 'completed' ? (
                        <button
                          onClick={() => handleReopenRegistration(t.id)}
                          className="flex items-center gap-1 border border-line-strong bg-surface-3 px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-3 hover:text-ink transition"
                          title="Re-open registrations for players"
                        >
                          <Unlock size={13} /> RE-OPEN REG
                        </button>
                      ) : null}

                      {/* Finish / Edit Results Button */}
                      <button
                        onClick={() => handleOpenFinishModal(t)}
                        className={`flex items-center gap-1 border px-3 py-1.5 text-xs font-bold transition ${
                          t.status === 'completed'
                            ? 'border-brand bg-brand-muted text-brand-bright hover:bg-brand hover:text-ink'
                            : 'border-line-strong bg-surface-3 text-ink hover:bg-surface-3 hover:text-ink'
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
                        className="p-1.5 text-ink-subtle hover:text-brand-bright"
                        title="Delete Tournament"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Completed Tournament Separate Archives & Non-Admin User Cleanup */}
              <div className="border border-brand-border bg-surface-2 p-5 space-y-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line-subtle pb-4">
                  <div>
                    <h4 className="eyebrow flex items-center gap-2 text-brand-bright">
                      <Archive size={15} /> FINISHED TOURNAMENT ARCHIVES &amp; USER CLEANUP
                    </h4>
                    <p className="text-xs text-ink-subtle mt-1">
                      Finished tournaments (Season 1, Season 2, etc.) are stored separately with all teams, Top 3 podiums, media &amp; standings so user results never break when cleaning dummy user accounts.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={archivingTourneyId !== null}
                    onClick={handleArchiveAllCompleted}
                    className="btn-secondary px-3 py-2 text-xs font-bold uppercase shrink-0"
                  >
                    <RefreshCw size={13} className={archivingTourneyId === 'all' ? 'animate-spin' : ''} />
                    {archivingTourneyId === 'all' ? 'ARCHIVING...' : 'ARCHIVE ALL FINISHED'}
                  </button>
                </div>

                {/* Archived Finished Tournaments List */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-ink-subtle uppercase">
                    <span>SEPARATELY ARCHIVED FINISHED TOURNAMENTS ({tournamentArchives.length})</span>
                    <span>
                      {tournaments.filter((t) => t.status === 'completed').length} completed total
                    </span>
                  </div>

                  {tournamentArchives.length === 0 ? (
                    <div className="border border-line-subtle bg-surface-1 p-4 text-xs text-ink-subtle">
                      No snapshots saved yet. Click <strong className="text-ink">ARCHIVE ALL FINISHED</strong> above or finish any tournament to store a separate permanent snapshot.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {tournamentArchives.map((arch) => (
                        <div
                          key={arch.tournament_id}
                          className="border border-line bg-surface-1 p-3.5 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <p className="font-display text-sm font-extrabold text-ink truncate">
                              {arch.title}
                            </p>
                            <p className="text-xs text-ink-subtle mt-0.5">
                              <strong className="text-brand-bright">{arch.slots_filled || arch.registrations_snapshot?.length || 0}</strong> teams saved •{' '}
                              <strong className="text-ink">{arch.top_3_teams?.length || 0}</strong> podium squads
                            </p>
                            <p className="text-[11px] text-ink-subtle mt-0.5">
                              Synced: {new Date(arch.updated_at || arch.archived_at).toLocaleString()}
                            </p>
                          </div>
                          <button
                            type="button"
                            disabled={archivingTourneyId === arch.tournament_id}
                            onClick={() => handleArchiveTournament(arch.tournament_id, arch.title)}
                            className="border border-line bg-surface-2 px-2.5 py-1.5 text-[11px] font-bold uppercase text-ink hover:border-brand shrink-0"
                          >
                            {archivingTourneyId === arch.tournament_id ? 'SYNCING...' : 'SYNC SNAPSHOT'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Purge Non-Admin Users Control */}
                <div className="border border-brand bg-brand-muted p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-bright">
                      DELETE ALL NON-ADMIN / DUMMY USERS (SAFE MODE)
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      Registered profiles: <strong className="text-ink">{userCleanupStats.totalProfiles}</strong> •{' '}
                      Admins preserved: <strong className="text-ink">{userCleanupStats.adminProfiles}</strong> •{' '}
                      Non-admin profiles: <strong className="text-brand-bright">{userCleanupStats.nonAdminProfiles}</strong> •{' '}
                      Leftover Leaderboard honors: <strong className="text-brand-bright">{userCleanupStats.staleHonors}</strong> •{' '}
                      Leftover player achievements: <strong className="text-brand-bright">{userCleanupStats.staleAchievements}</strong>
                    </p>
                    <p className="text-[11px] text-ink-subtle mt-1">
                      Note: Execute <code className="text-ink">supabase/archive_tournaments_and_cleanup_users.sql</code> in the Supabase SQL Editor to snapshot completed tournaments as static data and purge all non-admin profiles, auth accounts, honors, and player achievement cards.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={
                      purgingUsers ||
                      (userCleanupStats.nonAdminProfiles === 0 &&
                        userCleanupStats.staleHonors === 0 &&
                        userCleanupStats.staleAchievements === 0)
                    }
                    onClick={handlePurgeNonAdminUsers}
                    className="btn-primary px-4 py-2.5 text-xs font-extrabold uppercase shrink-0 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {purgingUsers ? 'CLEANING USERS...' : 'ARCHIVE & PURGE NON-ADMIN USERS'}
                  </button>
                </div>

                {/* Full Factory Reset Control */}
                <div className="border border-brand bg-brand-muted p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-extrabold uppercase tracking-wider text-brand-bright">
                      FULL FACTORY RESET (DELETE ALL DATA — KEEP ADMIN LOGIN ONLY)
                    </p>
                    <p className="text-xs text-ink-muted mt-1">
                      Deletes all tournaments, tournament results, archives, honors, achievements, guild members, giveaways, Q&amp;A, clips, announcements, uploaded images, and all non-admin users &amp; UIDs while keeping your Admin login.
                    </p>
                    <p className="text-[11px] text-ink-subtle mt-1">
                      Note: Execute <code className="text-ink">supabase/full_data_reset.sql</code> in the Supabase SQL Editor once to register and run the clean-slate reset.
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={resettingAllData}
                    onClick={handleFactoryReset}
                    className="btn-primary px-4 py-2.5 text-xs font-extrabold uppercase shrink-0 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    {resettingAllData ? 'RESETTING ALL DATA...' : 'FACTORY RESET ALL DATA'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 3. LEADERBOARD TAB (GUN GODS & MOVEMENT GODS MANAGEMENT) */}
          {/* ============================================================ */}
          {activeTab === 'LEADERBOARD' && (
            <div className="space-y-6">
              <div className="border border-brand bg-brand-muted p-5">
                <div className="flex items-center gap-3">
                  <Trophy className="text-brand-bright" size={32} />
                  <div>
                    <h4 className="font-display text-2xl font-extrabold text-ink">GUN GODS & MOVEMENT GODS MANAGEMENT</h4>
                    <p className="text-xs font-bold tracking-widest text-brand-bright">
                      ASSIGN SPECIALIST HONORS & GUN/MOVEMENT TITLES TO PLAYERS BY SEARCHING THEIR GAME UID
                    </p>
                  </div>
                </div>
              </div>

              {/* Form to Add Player Honor */}
              <form onSubmit={handleAddPlayerHonor} className="border border-line-subtle bg-surface-2 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2 text-brand-bright">
                  <Plus size={14} /> ASSIGN NEW PLAYER HONOR / TITLE
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block label">CATEGORY *</label>
                    <select
                      value={honorCategory}
                      onChange={(e) => setHonorCategory(e.target.value as any)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                    >
                      <option value="gun_gods">1. GUN GODS (Weapon Mastery)</option>
                      <option value="movement_gods">2. MOVEMENT GODS (Reflex & Speed)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-brand-bright">SEARCH PLAYER GAME UID *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. 1928374650"
                      value={honorPlayerUid}
                      onChange={(e) => handleUidSearch(e.target.value)}
                      className="w-full border border-brand bg-surface-2 px-3 py-2 text-xs font-mono text-brand-bright focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">PLAYER NAME (IGN)</label>
                    <input
                      type="text"
                      placeholder={searchingUid ? "Searching UID..." : "e.g. PlayerName"}
                      value={honorPlayerName}
                      onChange={(e) => setHonorPlayerName(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">
                      {honorCategory === 'gun_gods' ? 'GUN NAME / TITLE *' : 'MOVEMENT STYLE / TITLE *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={honorCategory === 'gun_gods' ? "e.g. M1887 One-Tap King" : "e.g. 360 Gloo Wall Fast Dash"}
                      value={honorTitleName}
                      onChange={(e) => setHonorTitleName(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                </div>

                {honorPlayerName && (
                  <div className="flex items-center gap-3 border border-brand bg-brand-muted p-3 rounded">
                    <UserAvatar
                      src={honorPlayerAvatar || avatarMap.get(honorPlayerUid.trim().toLowerCase())}
                      name={honorPlayerName}
                      size="md"
                      className="border-2 border-brand"
                    />
                    <div>
                      <p className="text-xs font-extrabold text-brand-bright">
                        PLAYER DETECTED: <span className="text-ink">{honorPlayerName}</span>
                      </p>
                      <p className="font-mono text-xs text-ink-muted">UID: {honorPlayerUid}</p>
                    </div>
                  </div>
                )}

                <div>
                  <label className="mb-1 block label">DESCRIPTION / PLAYSTYLE DETAILS</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Unstoppable close-range headshot accuracy in 1v1 custom rooms."
                    value={honorDescription}
                    onChange={(e) => setHonorDescription(e.target.value)}
                    className="w-full border border-line bg-surface-2 p-2.5 text-xs text-ink focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="bg-brand px-6 py-2.5 text-xs font-extrabold tracking-widest text-ink hover:bg-brand transition shadow-lg uppercase"
                >
                  ADD TO {honorCategory === 'gun_gods' ? 'GUN GODS' : 'MOVEMENT GODS'}
                </button>
              </form>

              {/* Gun Gods List */}
              <div className="space-y-3">
                <h4 className="eyebrow text-brand-bright">GUN GODS LEADERBOARD HONORS ({gunGodsList.length})</h4>
                <div className="space-y-2">
                  {gunGodsList.map((h, idx) => (
                    <div key={h.id || idx} className="flex items-center justify-between border border-brand-border bg-surface-2 p-4">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-sm font-extrabold text-brand-bright">#{String(idx + 1).padStart(2, '0')}</span>
                        <UserAvatar
                          src={h.avatar_url || avatarMap.get((h.player_uid || '').trim().toLowerCase())}
                          name={h.player_name}
                          size="md"
                          className="border border-brand"
                        />
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-ink">{h.player_name}</span>
                            <span className="font-mono text-xs text-brand-bright">UID: {h.player_uid}</span>
                            <span className="border border-brand bg-brand-muted px-2 py-0.5 text-xs font-extrabold text-brand-bright">
                              {h.title_name}
                            </span>
                          </div>
                          {h.description && <p className="text-xs text-ink-muted mt-1 italic font-mono">"{h.description}"</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlayerHonor(h.id)}
                        className="text-ink-subtle hover:text-brand-bright p-2"
                        title="Remove Title"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Movement Gods List */}
              <div className="space-y-3 pt-4 border-t border-line-subtle">
                <h4 className="eyebrow text-ink-muted">MOVEMENT GODS LEADERBOARD HONORS ({movementGodsList.length})</h4>
                <div className="space-y-2">
                  {movementGodsList.map((h, idx) => (
                    <div key={h.id || idx} className="flex items-center justify-between border border-line bg-surface-2 p-4">
                      <div className="flex items-center gap-4">
                        <span className="font-display text-sm font-extrabold text-ink-muted">#{String(idx + 1).padStart(2, '0')}</span>
                        <UserAvatar
                          src={h.avatar_url || avatarMap.get((h.player_uid || '').trim().toLowerCase())}
                          name={h.player_name}
                          size="md"
                          className="border border-line"
                        />
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-ink">{h.player_name}</span>
                            <span className="font-mono text-xs text-brand-bright">UID: {h.player_uid}</span>
                            <span className="border border-line bg-surface-3 px-2 py-0.5 text-xs font-extrabold text-ink-muted">
                              {h.title_name}
                            </span>
                          </div>
                          {h.description && <p className="text-xs text-ink-muted mt-1 italic font-mono">"{h.description}"</p>}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeletePlayerHonor(h.id)}
                        className="text-ink-subtle hover:text-brand-bright p-2"
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
              <div className="border border-brand-border bg-brand-muted p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <ShieldCheck className="text-brand-bright" size={32} />
                  <div>
                    <h4 className="font-display text-2xl font-extrabold text-ink">ELITE ARMY (OFFICIAL GUILD)</h4>
                    <p className="text-xs font-bold tracking-widest text-brand-bright">
                      SINGLE OFFICIAL GUILD • RANKED STRICTLY BY PLAYER GLORY SCORE
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-canvas/60 border border-line-subtle px-4 py-3 rounded-lg shadow-inner">
                  <div className="flex flex-col">
                    <span className="text-xs font-extrabold uppercase text-ink-muted tracking-wider">User Guild Section Status</span>
                    <span className={`text-xs font-extrabold uppercase tracking-wider ${showGuildSection ? 'text-ink' : 'text-brand-bright'}`}>
                      {showGuildSection ? '● VISIBLE TO USERS' : '○ HIDDEN FROM USERS'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGuildSection}
                    className={`ml-2 px-4 py-2 text-xs font-extrabold uppercase tracking-wider rounded transition-all shadow-md ${
                      showGuildSection
                        ? 'bg-brand hover:bg-brand text-ink border border-brand'
                        : 'bg-surface-3 hover:bg-surface-3 text-ink border border-line-strong'
                    }`}
                  >
                    {showGuildSection ? 'HIDE GUILD SECTION' : 'SHOW GUILD SECTION'}
                  </button>
                </div>
              </div>

              {/* Add Guild Member */}
              <form onSubmit={handleAddGuildPlayer} className="border border-line-subtle bg-surface-2 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ADD PLAYER TO ELITE ARMY (SELECT REGISTERED OR ENTER NEW UID & NAME)
                </h4>

                {/* Registered Player Quick Select + Direct UID & Player Name Fields */}
                <div className="space-y-3 border border-line-subtle bg-canvas/40 p-4 rounded">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-bright">
                      1. SELECT REGISTERED PLAYER (OPTIONAL) OR ENTER UID & NAME BELOW
                    </label>
                    <span className="text-xs text-ink-subtle">
                      Total Registered: {registeredPlayers.length} Players
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Search registered player by IGN, UID, or ID..."
                      value={playerSearchQuery}
                      onChange={(e) => setPlayerSearchQuery(e.target.value)}
                      className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                    />

                    <select
                      value={selectedPlayerId}
                      onChange={(e) => handleSelectRegisteredPlayer(e.target.value)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                    >
                      <option value="">-- Choose Registered Player (Optional) --</option>
                      {registeredPlayers
                        .filter((p) => {
                          if (!playerSearchQuery.trim()) return true
                          const q = playerSearchQuery.toLowerCase()
                          return (
                            (p.ign && p.ign.toLowerCase().includes(q)) ||
                            (p.username && p.username.toLowerCase().includes(q)) ||
                            (p.player_id && p.player_id.toLowerCase().includes(q)) ||
                            (p.free_fire_uid && p.free_fire_uid.toLowerCase().includes(q))
                          )
                        })
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.ign || p.username} ({p.player_id || 'ID N/A'} • UID: {p.free_fire_uid || 'N/A'})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Direct UID & Name of the Player Inputs */}
                  <div className="grid gap-3 sm:grid-cols-2 pt-2 border-t border-line-subtle">
                    <div>
                      <label className="mb-1 block label !text-brand-bright">
                        FREE FIRE UID {!selectedPlayerId ? '*' : ''}
                      </label>
                      <input
                        type="text"
                        required={!selectedPlayerId}
                        placeholder="e.g. 1928374650"
                        value={newMemberUid}
                        onChange={(e) => handleGuildUidChange(e.target.value)}
                        className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink placeholder-ink-subtle font-mono focus:border-brand focus:outline-none"
                      />
                      <span className="text-[11px] text-ink-subtle">
                        If not registered yet, this UID will be registered automatically
                      </span>
                    </div>

                    <div>
                      <label className="mb-1 block label !text-brand-bright">
                        NAME OF THE PLAYER *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Enter player name (shown in Guild section)..."
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-ink placeholder-ink-subtle font-semibold focus:border-brand focus:outline-none"
                      />
                      <span className="text-[11px] text-ink-subtle">
                        Displayed in the user Guild section & roster
                      </span>
                    </div>
                  </div>

                  {/* Match / Auto-Register Status Preview */}
                  {(() => {
                    const sel = selectedPlayerId
                      ? registeredPlayers.find((p) => p.id === selectedPlayerId)
                      : newMemberUid.trim()
                      ? registeredPlayers.find((p) => p.free_fire_uid?.trim() === newMemberUid.trim())
                      : null

                    if (sel) {
                      return (
                        <div className="flex items-center gap-3 pt-2 border-t border-line-subtle mt-1">
                          <UserAvatar src={sel.avatar_url} name={newMemberName || sel.ign || sel.username} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-ink">
                              ✓ Registered Player Found: {sel.ign || sel.username}
                            </p>
                            <p className="text-xs text-ink-subtle">
                              ID: {sel.player_id || 'N/A'} • Free Fire UID: {sel.free_fire_uid || newMemberUid || 'N/A'} • Level: {sel.level || 1}
                            </p>
                          </div>
                        </div>
                      )
                    }

                    if (newMemberUid.trim()) {
                      return (
                        <div className="pt-2 border-t border-line-subtle mt-1">
                          <p className="text-xs font-semibold text-brand-bright">
                            New Player UID ({newMemberUid.trim()}) — will be automatically registered to the application and added as &ldquo;{newMemberName.trim() || 'Player'}&rdquo;.
                          </p>
                        </div>
                      )
                    }

                    return null
                  })()}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="mb-1 block label !text-brand-bright">
                      2. ASSIGN RANKING *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 1"
                      value={newMemberRanking}
                      onChange={(e) => setNewMemberRanking(e.target.value)}
                      className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-brand-bright font-bold focus:outline-none"
                    />
                    <span className="text-xs text-ink-subtle">Roster position (#1, #2...)</span>
                  </div>

                  <div>
                    <label className="mb-1 block label uppercase">
                      3. INITIAL GLORY POINTS *
                    </label>
                    <input
                      type="number"
                      required
                      value={newMemberGlory}
                      onChange={(e) => setNewMemberGlory(e.target.value)}
                      className="field h-10"
                    />
                    <span className="text-xs text-ink-subtle">Guild glory points</span>
                  </div>

                  <div>
                    <label className="mb-1 block label uppercase">
                      4. GUILD ROLE
                    </label>
                    <select
                      value={newMemberRank}
                      onChange={(e) => setNewMemberRank(e.target.value)}
                      className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                    >
                      {GUILD_ROLES.map((r) => (
                        <option key={r.rank} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-ink-subtle">Member squad rank</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={addingGuildMember}
                  className="bg-brand px-6 py-2.5 text-xs font-extrabold tracking-widest text-ink uppercase hover:bg-brand transition shadow-lg disabled:opacity-60"
                >
                  {addingGuildMember ? 'REGISTERING & ADDING...' : 'ADD PLAYER TO ELITE ARMY'}
                </button>
              </form>

              {/* Members List sorted by Ranking & Glory with Edit and Delete */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="eyebrow">GUILD ROSTER (ORDERED BY ASSIGNED RANKING)</h4>
                  <span className="text-xs text-ink-subtle">{guildMembers.length} Members Active</span>
                </div>

                <div className="space-y-2">
                  {guildMembers.length === 0 ? (
                    <div className="p-8 text-center border border-line-subtle bg-surface-2 text-ink-subtle text-xs">
                      No members added to ELITE ARMY yet. Use the form above to add registered players!
                    </div>
                  ) : (
                    guildMembers.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-line-subtle bg-surface-2 px-4 py-3 hover:border-line transition"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="font-display text-lg font-extrabold text-brand-bright w-8 shrink-0">
                            #{String(m.ranking || idx + 1).padStart(2, '0')}
                          </span>
                          <UserAvatar
                            src={m.profiles?.avatar_url}
                            name={m.player_name || m.profiles?.ign}
                            size="md"
                            className="border border-line h-10 w-10 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-display text-base font-extrabold text-ink truncate">
                                {m.player_name || m.profiles?.ign || 'ELITE_PLAYER'}
                              </p>
                              <span className={`border px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded ${
                                (m.guild_role || '').includes('Leader')
                                  ? 'border-brand bg-brand/15 text-brand-bright'
                                  : (m.guild_role || '').includes('Commander')
                                  ? 'border-line bg-surface-3 text-ink-muted'
                                  : (m.guild_role || '').includes('Officer')
                                  ? 'border-line bg-surface-3 text-ink-muted'
                                  : (m.guild_role || '').includes('Elder')
                                  ? 'border-line-strong bg-surface-3 text-ink'
                                  : 'border-line-subtle bg-surface-3 text-ink-muted'
                              }`}>
                                {normalizeGuildRole(m.guild_role)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-ink-subtle mt-0.5">
                              <span>ID: {m.profiles?.player_id || 'N/A'}</span>
                              <span>•</span>
                              <span>UID: {m.profiles?.free_fire_uid || m.free_fire_uid || 'N/A'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-t-0 border-line-subtle pt-2 sm:pt-0">
                          <div className="text-left sm:text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-brand-muted border border-brand text-brand-bright font-display font-extrabold text-xs">
                              ⚔️ {(m.kills || 0).toLocaleString()} KILLS
                            </span>
                            <p className="text-xs font-bold text-brand-bright mt-0.5">
                              {(m.glory_contributed ?? 0).toLocaleString()} GP
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingMember(m)}
                              className="text-ink-subtle hover:text-brand-bright p-2 rounded hover:bg-surface-2 transition"
                              title="Edit Member Ranking, Kills & Role"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteGuildPlayer(m.id, m.user_id)}
                              className="text-ink-subtle hover:text-brand-bright p-2 rounded hover:bg-surface-2 transition"
                              title="Remove Player from Guild"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Guild Rank Challenges Management */}
              <div className="border border-line-subtle bg-surface-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <h4 className="eyebrow flex items-center gap-2">
                      <Swords size={14} className="text-brand-bright" /> GUILD RANK CHALLENGES ({guildChallenges.length})
                    </h4>
                    <p className="text-xs text-ink-subtle mt-1">
                      1-rank-above challenges ({MIN_CHALLENGE_GLORY.toLocaleString()}+ GP min, #1 Glory Member → Elder). Resolving as &ldquo;Challenger Won&rdquo; swaps roles &amp; roster rankings.
                    </p>
                  </div>
                  <span className="border border-line px-2.5 py-1 text-xs font-bold uppercase text-brand-bright">
                    {guildChallenges.filter((c) => c.status === 'pending' || c.status === 'accepted').length} ACTIVE
                  </span>
                </div>

                {guildChallenges.length === 0 ? (
                  <p className="text-center text-ink-subtle py-8 text-xs font-bold uppercase">
                    No rank challenges issued yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {guildChallenges.map((c) => {
                      const isBusy = resolvingChallengeId === c.id
                      const canAcceptOrDecline = c.status === 'pending'
                      const canResolve = c.status === 'pending' || c.status === 'accepted'

                      return (
                        <div
                          key={c.id}
                          className="border border-line bg-surface-1 p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={`border px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider rounded ${
                                  c.status === 'pending' || c.status === 'accepted'
                                    ? 'border-brand bg-brand/15 text-brand-bright'
                                    : 'border-line bg-surface-3 text-ink-muted'
                                }`}
                              >
                                {c.status.replace('_', ' ')}
                              </span>
                              <span className="text-xs text-ink-subtle font-bold">
                                {new Date(c.created_at).toLocaleString()}
                              </span>
                            </div>

                            <p className="mt-1.5 text-sm font-bold text-ink">
                              {c.challenger_name}{' '}
                              <span className="text-xs font-semibold text-ink-muted">
                                ({c.challenger_role} · {c.challenger_glory.toLocaleString()} GP)
                              </span>{' '}
                              <span className="text-brand-bright">→</span> {c.defender_name}{' '}
                              <span className="text-xs font-semibold text-ink-muted">
                                ({c.defender_role})
                              </span>
                            </p>

                            {c.note && (
                              <p className="mt-1 text-xs italic text-ink-subtle">
                                &ldquo;{c.note}&rdquo;
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            {canAcceptOrDecline && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResolveGuildChallenge(c.id, 'accepted')}
                                  className="btn-secondary px-2.5 py-1.5 text-xs font-bold uppercase"
                                >
                                  Accept
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResolveGuildChallenge(c.id, 'declined')}
                                  className="btn-secondary px-2.5 py-1.5 text-xs font-bold uppercase"
                                >
                                  Decline
                                </button>
                              </>
                            )}
                            {canResolve && (
                              <>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResolveGuildChallenge(c.id, 'challenger_won')}
                                  className="btn-primary px-2.5 py-1.5 text-xs font-bold uppercase"
                                >
                                  Challenger Won · Swap
                                </button>
                                <button
                                  type="button"
                                  disabled={isBusy}
                                  onClick={() => handleResolveGuildChallenge(c.id, 'defender_won')}
                                  className="btn-secondary px-2.5 py-1.5 text-xs font-bold uppercase"
                                >
                                  Defender Won
                                </button>
                              </>
                            )}
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => handleDeleteGuildChallengeRecord(c.id)}
                              className="text-ink-subtle hover:text-brand-bright p-2 rounded hover:bg-surface-2 transition"
                              title="Delete Challenge Record"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* 5. ACHIEVEMENTS TAB */}
          {/* ============================================================ */}
          {activeTab === 'ACHIEVEMENTS' && (
            <div className="space-y-6">
              <form onSubmit={handleAddAchievement} className="border border-line-subtle bg-surface-2 p-5 space-y-4">
                <h4 className="eyebrow flex items-center gap-2">
                  <Plus size={14} /> ADD NEW ACHIEVEMENT CARD
                </h4>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block label">ACHIEVEMENT TITLE *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. SQUAD SLAYER"
                      value={achTitle}
                      onChange={(e) => setAchTitle(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">PLAYER NAME / IGN</label>
                    <input
                      type="text"
                      placeholder="e.g. PlayerName"
                      value={achPlayerName}
                      onChange={(e) => setAchPlayerName(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-brand-bright">PLAYER FREE FIRE UID</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={achPlayerUid}
                      onChange={(e) => setAchPlayerUid(e.target.value)}
                      className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-brand-bright font-mono focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">DESCRIPTION</label>
                    <input
                      type="text"
                      placeholder="e.g. Wipe an entire enemy squad solo"
                      value={achDesc}
                      onChange={(e) => setAchDesc(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">IMAGE / BADGE ICON URL</label>
                    <input
                      type="text"
                      placeholder="e.g. https://..."
                      value={achBadge}
                      onChange={(e) => setAchBadge(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block label">XP REWARD</label>
                    <input
                      type="number"
                      value={achXp}
                      onChange={(e) => setAchXp(e.target.value)}
                      className="field h-10"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-brand px-5 py-2 text-xs font-extrabold tracking-widest text-ink hover:bg-brand"
                >
                  SAVE ACHIEVEMENT CARD
                </button>
              </form>

              {/* Achievements Grid with Edit Button */}
              <div className="space-y-3">
                <h4 className="eyebrow">EXISTING ACHIEVEMENTS ({achievements.length})</h4>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {achievements.map((a) => (
                    <div key={a.id} className="border border-line-subtle bg-surface-2 p-4 flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        {a.icon_url ? (
                          <img src={a.icon_url} alt={a.name} className="h-8 w-8 object-contain" />
                        ) : (
                          <Award size={28} className="text-brand-bright" />
                        )}
                        <div>
                          <h5 className="font-display text-base font-extrabold text-ink">{a.name}</h5>
                          {(a.player_name || a.player_uid) && (
                            <p className="text-xs font-bold text-brand-bright">
                              👤 {a.player_name || 'N/A'} {a.player_uid ? `(UID: ${a.player_uid})` : ''}
                            </p>
                          )}
                          <p className="text-xs text-ink-subtle">{a.description}</p>
                          <p className="mt-1 text-xs font-bold text-brand-bright">+{a.xp_reward} XP REWARD</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingAch(a)}
                          className="text-ink-subtle hover:text-brand-bright"
                          title="Edit Card"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteAchievement(a.id)}
                          className="text-ink-subtle hover:text-brand-bright"
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
          {/* 6. ANNOUNCEMENTS — SEASON DRAW & RESULTS */}
          {/* ============================================================ */}
          {activeTab === 'ANNOUNCEMENTS' && <AnnouncementsTab showNotification={showNotification} />}

          {/* ============================================================ */}
          {/* 7. COMMUNITY CLIPS MODERATION TAB */}
          {/* ============================================================ */}
          {activeTab === 'CLIPS' && (
            <div className="space-y-4">
              <h4 className="eyebrow">PENDING COMMUNITY CLIPS MODERATION</h4>
              {pendingClips.length === 0 ? (
                <div className="border border-line-subtle p-8 text-center text-sm text-ink-subtle">
                  No pending clips moderation right now. All clear!
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingClips.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between border border-line-subtle bg-surface-2 p-4"
                    >
                      <div>
                        <h5 className="font-display text-lg font-extrabold text-ink">{clip.title}</h5>
                        <p className="text-xs text-ink-subtle">
                          Submitted by: <strong className="text-ink">{clip.player_name}</strong> • Category: {clip.category}
                        </p>
                        <a
                          href={clip.video_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-bright underline"
                        >
                          <Eye size={12} /> Watch Video Clip
                        </a>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleModerateClip(clip.id, 'approved')}
                          className="flex items-center gap-1 border border-line-strong bg-surface-3 px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface-3 hover:text-ink"
                        >
                          <Check size={14} /> APPROVE
                        </button>
                        <button
                          onClick={() => handleModerateClip(clip.id, 'rejected')}
                          className="flex items-center gap-1 border border-brand bg-brand-muted px-3 py-1.5 text-xs font-bold text-brand-bright hover:bg-brand hover:text-ink"
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
            </main>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* MODAL OVERLAYS (RULES, REGISTRATION CARDS, EDIT MODALS) */}
      {/* ============================================================ */}

      {/* 1. Admin See Rules Modal */}
      {rulesModalTourney && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-lg p-5 sm:p-6 space-y-4">
            <button onClick={() => setRulesModalTourney(null)} className="absolute right-4 top-4 text-ink-muted hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-extrabold uppercase text-brand-bright">TOURNAMENT RULES</h3>
            <p className="text-xs text-ink-muted">{rulesModalTourney.title}</p>
            <div className="whitespace-pre-wrap border border-line-subtle bg-surface-2 p-4 text-xs text-ink max-h-[50vh] overflow-y-auto">
              {rulesModalTourney.rules || 'No custom rules specified for this tournament.'}
            </div>
          </div>
        </div>
      )}

      {/* 2. View Registrations (Separate Cards for Each Registered Team/Player) */}
      {showRegModal && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-4xl p-5 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowRegModal(false)}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line-subtle pb-3 gap-2">
              <div>
                <h3 className="font-display text-xl font-extrabold uppercase text-ink">
                  REGISTERED TEAMS: {selectedTourneyTitle}
                </h3>
                <p className="text-xs text-ink-muted">
                  TOTAL REGISTERED: <strong className="text-brand-bright">{selectedTourneyRegs.length} TEAMS / PLAYERS</strong>
                </p>
              </div>

              <button
                onClick={() => {
                  if (selectedTourneyId) {
                    setAdminRegTourneyId(selectedTourneyId)
                  } else {
                    const tourney = tournaments.find((t) => t.title === selectedTourneyTitle || t.id === selectedTourneyRegs[0]?.tournament_id)
                    if (tourney) setAdminRegTourneyId(tourney.id)
                  }
                  setAdminAddRegModalOpen(true)
                }}
                className="flex items-center gap-1.5 bg-brand px-3.5 py-2 text-xs font-extrabold text-ink hover:bg-brand shadow"
              >
                <Plus size={14} /> ADMIN REGISTER TEAM
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2">
              {selectedTourneyRegs.length === 0 ? (
                <div className="border border-line-subtle p-8 text-center text-xs text-ink-subtle">
                  No registered teams found for this tournament yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedTourneyRegs.map((r, i) => (
                    <div key={r.id || i} className="border border-brand-border bg-surface p-4 space-y-3 shadow-lg">
                      <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                        <span className="font-display text-base font-extrabold text-ink">
                          #{i + 1} {r.team_name || r.captain_name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="border border-brand bg-brand-muted px-2 py-0.5 text-xs font-extrabold tracking-widest text-brand-bright uppercase">
                            {r.registration_status || 'CONFIRMED'}
                          </span>
                          <button
                            onClick={() => handleDeleteReg(r.id, r.tournament_id)}
                            className="flex items-center gap-1 border border-brand-border bg-brand-muted px-2 py-0.5 text-xs font-bold text-brand-bright hover:bg-brand hover:text-ink"
                            title="Delete Registered Team"
                          >
                            <Trash2 size={11} /> DELETE
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5 text-xs">
                        <div className="rounded border border-brand-border bg-brand-muted p-2 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-brand-bright">👑 1. Team Leader: <strong className="text-ink">{r.captain_name}</strong></span>
                            <span className="font-mono text-xs text-brand-bright">UID: {r.captain_free_fire_uid || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t border-line-subtle pt-1">
                            <span className="text-ink">🎮 2. 2nd Player: <strong className="text-ink">{r.teammate_names?.[0] || 'N/A'}</strong></span>
                            <span className="font-mono text-xs text-brand-bright">UID: {r.teammate_uids?.[0] || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t border-line-subtle pt-1">
                            <span className="text-ink">🎮 3. 3rd Player: <strong className="text-ink">{r.teammate_names?.[1] || 'N/A'}</strong></span>
                            <span className="font-mono text-xs text-brand-bright">UID: {r.teammate_uids?.[1] || 'N/A'}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs border-t border-line-subtle pt-1">
                            <span className="text-ink">🎮 4. 4th Player: <strong className="text-ink">{r.teammate_names?.[2] || 'N/A'}</strong></span>
                            <span className="font-mono text-xs text-brand-bright">UID: {r.teammate_uids?.[2] || 'N/A'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-line-subtle pt-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink-subtle">PLACE:</span>
                          <input
                            type="number"
                            placeholder="#"
                            defaultValue={r.placement || ''}
                            onBlur={(e) => handleSaveResults(r.id, Number(e.target.value), r.kills || 0)}
                            className="w-14 border border-line bg-canvas px-2 py-1 text-xs text-center font-bold text-ink"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-ink-subtle">KILLS:</span>
                          <input
                            type="number"
                            placeholder="Kills"
                            defaultValue={r.kills || 0}
                            onBlur={(e) => handleSaveResults(r.id, r.placement || 0, Number(e.target.value))}
                            className="w-14 border border-line bg-canvas px-2 py-1 text-xs text-center font-bold text-brand-bright"
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
        <div className="modal-overlay">
          <div className="relative w-full max-w-4xl border border-line-strong bg-surface p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col text-ink">
            <button
              onClick={() => {
                if (adminAudioElement) {
                  adminAudioElement.pause()
                  setAdminAudioElement(null)
                  setAdminAudioTesting(false)
                }
                setFinishingTourney(null)
              }}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-line-subtle pb-3 gap-2">
              <div className="flex items-center gap-3">
                <Trophy className="text-brand-bright" size={28} />
                <div>
                  <h3 className="font-display text-xl font-extrabold uppercase text-ink">
                    MANAGE RESULTS & TOP 3 TEAMS
                  </h3>
                  <p className="text-xs text-brand-bright font-bold">{finishingTourney.title}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setAdminRegTourneyId(finishingTourney.id)
                  setAdminAddRegModalOpen(true)
                }}
                className="flex items-center gap-1.5 bg-brand px-3.5 py-2 text-xs font-extrabold text-ink hover:bg-brand shadow"
              >
                <Plus size={14} /> ADMIN REGISTER TEAM
              </button>
            </div>

            <form onSubmit={handleSubmitFinishTournament} className="flex-1 overflow-y-auto space-y-6 pr-2">
              {/* HIDDEN FILE INPUTS FOR DEVICE ATTACHMENTS */}
              <input
                ref={finishImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageFileChange}
              />
              <input
                ref={finishAudioInputRef}
                type="file"
                accept="audio/*,video/mp4,.mp3,.mp4,.m4a,.wav,.ogg,.aac"
                className="hidden"
                onChange={handleAudioFileChange}
              />

              {/* MEDIA ATTACHMENTS: CHAMPIONS IMAGE & VICTORY SONG */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* 1. CHAMPIONS ARTWORK / BANNER IMAGE */}
                <div className="rounded-lg border border-brand bg-brand-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-brand pb-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon size={16} className="text-brand-bright" />
                      <h4 className="font-display text-xs font-extrabold uppercase tracking-wide text-brand-bright">
                        CHAMPIONS ARTWORK / BANNER
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-ink-subtle uppercase">Top of Results</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => finishImageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="inline-flex items-center gap-1.5 rounded border border-brand bg-brand px-3 py-1.5 text-xs font-extrabold text-ink hover:opacity-95 shadow transition"
                    >
                      <Upload size={13} />
                      {uploadingImage ? 'Processing...' : 'Attach Image from Device'}
                    </button>
                    {imageFileName && (
                      <span className="truncate rounded border border-brand/50 bg-brand/20 px-2 py-0.5 font-mono text-[11px] font-bold text-brand-bright max-w-[200px]">
                        📁 {imageFileName}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-ink-subtle block">OR SELECT PRESET / ENTER URL</label>
                    <select
                      value={finishChampionsImageUrl}
                      onChange={(e) => setFinishChampionsImageUrl(e.target.value)}
                      className="w-full border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                    >
                      <option value="">-- Custom URL or Device Upload below --</option>
                      {PRESET_CHAMPION_IMAGES.map((img, i) => (
                        <option key={i} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Paste Image URL (e.g. /images/... or https://...)"
                      value={finishChampionsImageUrl}
                      onChange={(e) => setFinishChampionsImageUrl(e.target.value)}
                      className="w-full border border-line bg-canvas/80 px-2.5 py-1 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Image Preview */}
                  {finishChampionsImageUrl && (
                    <div className="mx-auto relative mt-2 aspect-square max-w-[180px] w-full overflow-hidden rounded-xl border-2 border-brand bg-black">
                      <img
                        src={finishChampionsImageUrl}
                        alt="Champions Preview"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                      <div
                        className="pointer-events-none absolute inset-0 rounded-xl"
                        style={{
                          boxShadow: 'inset 0 0 20px rgba(0, 0, 0, 0.4)',
                        }}
                      />
                      <div className="absolute bottom-1 right-1 flex items-center gap-1 z-10">
                        <span className="rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-brand-bright">
                          1:1 PREVIEW
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setFinishChampionsImageUrl('')
                            setImageFileName('')
                          }}
                          className="rounded bg-black/85 px-1.5 py-0.5 text-[9px] font-bold text-red-400 hover:text-white"
                          title="Remove attached image"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. VICTORY SONG / ANTHEM AUDIO */}
                <div className="rounded-lg border border-brand bg-brand-muted/40 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-brand pb-2">
                    <div className="flex items-center gap-2">
                      <Music size={16} className="text-brand-bright" />
                      <h4 className="font-display text-xs font-extrabold uppercase tracking-wide text-brand-bright">
                        VICTORY SONG / ANTHEM (MP3 / MP4 AUDIO)
                      </h4>
                    </div>
                    <span className="text-[10px] font-bold text-ink-subtle uppercase">Autoplays in Results</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => finishAudioInputRef.current?.click()}
                      disabled={uploadingAudio}
                      className="inline-flex items-center gap-1.5 rounded border border-brand bg-brand px-3 py-1.5 text-xs font-extrabold text-ink hover:opacity-95 shadow transition"
                    >
                      <Upload size={13} />
                      {uploadingAudio ? 'Processing...' : 'Attach Song from Device (MP3 / MP4)'}
                    </button>
                    {audioFileName && (
                      <span className="truncate rounded border border-brand/50 bg-brand/20 px-2 py-0.5 font-mono text-[11px] font-bold text-brand-bright max-w-[200px]">
                        🎵 {audioFileName}
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-ink-subtle">
                    Supports <span className="font-bold text-brand-bright">MP3</span> and <span className="font-bold text-brand-bright">MP4</span> media files directly from your computer or phone.
                  </p>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-ink-subtle block">OR SELECT PRESET / ENTER AUDIO URL</label>
                    <select
                      value={finishResultsBgmUrl}
                      onChange={(e) => {
                        if (adminAudioElement) {
                          adminAudioElement.pause()
                          setAdminAudioTesting(false)
                        }
                        setFinishResultsBgmUrl(e.target.value)
                      }}
                      className="w-full border border-line bg-surface-2 px-2.5 py-1.5 text-xs text-ink focus:border-brand focus:outline-none"
                    >
                      <option value="">-- No Victory Song / Custom URL below --</option>
                      {PRESET_BGMS.map((bgm) => (
                        <option key={bgm.id} value={bgm.url}>
                          {bgm.label}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Paste Audio URL (e.g. /audio/bgm/... or https://...)"
                      value={finishResultsBgmUrl}
                      onChange={(e) => {
                        if (adminAudioElement) {
                          adminAudioElement.pause()
                          setAdminAudioTesting(false)
                        }
                        setFinishResultsBgmUrl(e.target.value)
                      }}
                      className="w-full border border-line bg-canvas/80 px-2.5 py-1 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                    />
                  </div>

                  {/* Audio Test Player Bar */}
                  {finishResultsBgmUrl ? (
                    <div className="rounded border border-brand/50 bg-surface-2 p-2.5 flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-brand-bright truncate flex items-center gap-1.5">
                          <Volume2 size={13} />
                          {audioFileName ? `Attached: ${audioFileName}` : finishResultsBgmUrl.split('/').pop() || 'Victory Song Attached'}
                        </p>
                        <p className="text-[10px] text-ink-subtle">Autoplays when user opens results</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={toggleAdminAudioTest}
                          className="inline-flex items-center gap-1 rounded bg-brand px-2.5 py-1 text-[11px] font-bold text-ink hover:opacity-90"
                        >
                          {adminAudioTesting ? (
                            <>
                              <Pause size={12} /> Pause Test
                            </>
                          ) : (
                            <>
                              <Play size={12} /> Test Play
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (adminAudioElement) {
                              adminAudioElement.pause()
                              setAdminAudioTesting(false)
                            }
                            setFinishResultsBgmUrl('')
                            setAudioFileName('')
                          }}
                          className="rounded border border-line px-2 py-1 text-[11px] text-red-400 hover:text-white"
                          title="Remove attached song"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-ink-subtle italic">
                      No song attached. Attach an audio file from your device or pick a preset anthem.
                    </p>
                  )}
                </div>
              </div>

              {/* TOP 3 PODIUM SECTION: 1ST, 2ND & 3RD PLACE */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line-subtle pb-2">
                  <h4 className="eyebrow flex items-center gap-2 text-brand-bright">
                    <Award size={16} /> TOP 3 WINNING SQUADS (TEAM NAMES, PLAYER NAMES & UIDS)
                  </h4>
                  <span className="text-[11px] font-bold text-ink-subtle">4 Players per Team</span>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {/* 1st Place - Gold */}
                  <div className="border-2 border-brand bg-brand-muted/60 p-4 space-y-3 rounded-lg shadow-md">
                    <div className="flex items-center justify-between border-b border-brand pb-2">
                      <span className="font-display text-sm font-extrabold text-brand-bright">
                        🥇 1ST PLACE (WINNER)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              const names = extractPlayerNames(reg)
                              const uids = extractPlayerUids(reg)
                              setTop1Team({
                                rank: 1,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: names[0] || reg.captain_name || '',
                                captain_uid: uids[0] || reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 35,
                                prize: '₹5,000',
                                player_names: names,
                                player_uids: uids,
                              })
                            }
                          }}
                          className="bg-canvas text-xs text-brand-bright border border-brand px-1.5 py-0.5 rounded"
                        >
                          <option value="">-- Autofill from Regs --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-brand-bright block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        required
                        value={top1Team.team_name}
                        onChange={(e) => setTop1Team({ ...top1Team, team_name: e.target.value })}
                        className="w-full border border-brand bg-canvas/80 px-2.5 py-1.5 text-xs text-ink font-bold focus:outline-none"
                        placeholder="Winner Team Name"
                      />
                    </div>

                    {/* 4 Squad Players: Name & Free Fire UID side-by-side */}
                    <div className="space-y-2 border-t border-line-subtle pt-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-brand-bright uppercase tracking-wide">
                          4 SQUAD PLAYERS (NAME & FF UID)
                        </label>
                      </div>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const isLeader = idx === 0
                          const currentName = top1Team.player_names?.[idx] ?? (isLeader ? top1Team.captain_name : '')
                          const currentUid = top1Team.player_uids?.[idx] ?? (isLeader ? top1Team.captain_uid || '' : '')

                          return (
                            <div key={idx} className="rounded bg-canvas/50 p-2 border border-brand/30 space-y-1">
                              <span className="text-[10px] font-bold text-brand-bright block">
                                {isLeader ? '👑 PLAYER 1 (CAPTAIN / LEADER)' : `PLAYER ${idx + 1}`}
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  placeholder={isLeader ? 'Captain Name' : `Player ${idx + 1} Name`}
                                  value={currentName}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    const names = [...(top1Team.player_names || ['', '', '', ''])]
                                    while (names.length < 4) names.push('')
                                    names[idx] = val
                                    setTop1Team({
                                      ...top1Team,
                                      player_names: names,
                                      ...(isLeader ? { captain_name: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="Free Fire UID"
                                  value={currentUid}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    const uids = [...(top1Team.player_uids || ['', '', '', ''])]
                                    while (uids.length < 4) uids.push('')
                                    uids[idx] = val
                                    setTop1Team({
                                      ...top1Team,
                                      player_uids: uids,
                                      ...(isLeader ? { captain_uid: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs font-mono text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-line-subtle pt-2">
                      <div>
                        <label className="label block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top1Team.kills}
                          onChange={(e) => setTop1Team({ ...top1Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-brand-bright font-bold"
                        />
                      </div>
                      <div>
                        <label className="label block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top1Team.points || 0}
                          onChange={(e) => setTop1Team({ ...top1Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-ink font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-brand-bright block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top1Team.prize || ''}
                        onChange={(e) => setTop1Team({ ...top1Team, prize: e.target.value })}
                        className="w-full border border-brand bg-canvas/60 px-2.5 py-1.5 text-xs text-brand-bright font-bold"
                        placeholder="e.g. ₹5,000"
                      />
                    </div>
                  </div>

                  {/* 2nd Place - Silver */}
                  <div className="border-2 border-line-strong bg-surface-2 p-4 space-y-3 rounded-lg shadow-md">
                    <div className="flex items-center justify-between border-b border-line pb-2">
                      <span className="font-display text-sm font-extrabold text-ink">
                        🥈 2ND PLACE (RUNNER UP)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              const names = extractPlayerNames(reg)
                              const uids = extractPlayerUids(reg)
                              setTop2Team({
                                rank: 2,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: names[0] || reg.captain_name || '',
                                captain_uid: uids[0] || reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 25,
                                prize: '₹3,000',
                                player_names: names,
                                player_uids: uids,
                              })
                            }
                          }}
                          className="bg-canvas text-xs text-ink border border-line px-1.5 py-0.5 rounded"
                        >
                          <option value="">-- Autofill from Regs --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        value={top2Team.team_name}
                        onChange={(e) => setTop2Team({ ...top2Team, team_name: e.target.value })}
                        className="w-full border border-line bg-canvas/80 px-2.5 py-1.5 text-xs text-ink font-bold focus:outline-none"
                        placeholder="2nd Team Name"
                      />
                    </div>

                    {/* 4 Squad Players: Name & Free Fire UID side-by-side */}
                    <div className="space-y-2 border-t border-line-subtle pt-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-ink uppercase tracking-wide">
                          4 SQUAD PLAYERS (NAME & FF UID)
                        </label>
                      </div>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const isLeader = idx === 0
                          const currentName = top2Team.player_names?.[idx] ?? (isLeader ? top2Team.captain_name : '')
                          const currentUid = top2Team.player_uids?.[idx] ?? (isLeader ? top2Team.captain_uid || '' : '')

                          return (
                            <div key={idx} className="rounded bg-canvas/50 p-2 border border-line-subtle space-y-1">
                              <span className="text-[10px] font-bold text-ink-subtle block">
                                {isLeader ? '👑 PLAYER 1 (CAPTAIN / LEADER)' : `PLAYER ${idx + 1}`}
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  placeholder={isLeader ? 'Captain Name' : `Player ${idx + 1} Name`}
                                  value={currentName}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    const names = [...(top2Team.player_names || ['', '', '', ''])]
                                    while (names.length < 4) names.push('')
                                    names[idx] = val
                                    setTop2Team({
                                      ...top2Team,
                                      player_names: names,
                                      ...(isLeader ? { captain_name: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="Free Fire UID"
                                  value={currentUid}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    const uids = [...(top2Team.player_uids || ['', '', '', ''])]
                                    while (uids.length < 4) uids.push('')
                                    uids[idx] = val
                                    setTop2Team({
                                      ...top2Team,
                                      player_uids: uids,
                                      ...(isLeader ? { captain_uid: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs font-mono text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-line-subtle pt-2">
                      <div>
                        <label className="label block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top2Team.kills}
                          onChange={(e) => setTop2Team({ ...top2Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-ink font-bold"
                        />
                      </div>
                      <div>
                        <label className="label block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top2Team.points || 0}
                          onChange={(e) => setTop2Team({ ...top2Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-ink font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-ink block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top2Team.prize || ''}
                        onChange={(e) => setTop2Team({ ...top2Team, prize: e.target.value })}
                        className="w-full border border-line bg-canvas/60 px-2.5 py-1.5 text-xs text-ink font-bold"
                        placeholder="e.g. ₹3,000"
                      />
                    </div>
                  </div>

                  {/* 3rd Place - Bronze */}
                  <div className="border-2 border-brand-border bg-brand-muted/50 p-4 space-y-3 rounded-lg shadow-md">
                    <div className="flex items-center justify-between border-b border-brand-border pb-2">
                      <span className="font-display text-sm font-extrabold text-brand-bright">
                        🥉 3RD PLACE (2ND RUNNER UP)
                      </span>
                      {finishRegs.length > 0 && (
                        <select
                          onChange={(e) => {
                            const reg = finishRegs.find((r) => r.id === e.target.value)
                            if (reg) {
                              const names = extractPlayerNames(reg)
                              const uids = extractPlayerUids(reg)
                              setTop3Team({
                                rank: 3,
                                team_name: reg.team_name || reg.captain_name || '',
                                captain_name: names[0] || reg.captain_name || '',
                                captain_uid: uids[0] || reg.captain_free_fire_uid || '',
                                kills: reg.kills || 0,
                                points: 18,
                                prize: '₹2,000',
                                player_names: names,
                                player_uids: uids,
                              })
                            }
                          }}
                          className="bg-canvas text-xs text-brand-bright border border-brand-border px-1.5 py-0.5 rounded"
                        >
                          <option value="">-- Autofill from Regs --</option>
                          {finishRegs.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.team_name || r.captain_name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-bold text-brand-bright block mb-1">TEAM / SQUAD NAME</label>
                      <input
                        type="text"
                        value={top3Team.team_name}
                        onChange={(e) => setTop3Team({ ...top3Team, team_name: e.target.value })}
                        className="w-full border border-brand-border bg-canvas/80 px-2.5 py-1.5 text-xs text-ink font-bold focus:outline-none"
                        placeholder="3rd Team Name"
                      />
                    </div>

                    {/* 4 Squad Players: Name & Free Fire UID side-by-side */}
                    <div className="space-y-2 border-t border-line-subtle pt-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-extrabold text-brand-bright uppercase tracking-wide">
                          4 SQUAD PLAYERS (NAME & FF UID)
                        </label>
                      </div>
                      <div className="space-y-2">
                        {[0, 1, 2, 3].map((idx) => {
                          const isLeader = idx === 0
                          const currentName = top3Team.player_names?.[idx] ?? (isLeader ? top3Team.captain_name : '')
                          const currentUid = top3Team.player_uids?.[idx] ?? (isLeader ? top3Team.captain_uid || '' : '')

                          return (
                            <div key={idx} className="rounded bg-canvas/50 p-2 border border-brand/20 space-y-1">
                              <span className="text-[10px] font-bold text-brand-bright block">
                                {isLeader ? '👑 PLAYER 1 (CAPTAIN / LEADER)' : `PLAYER ${idx + 1}`}
                              </span>
                              <div className="grid grid-cols-2 gap-1.5">
                                <input
                                  type="text"
                                  placeholder={isLeader ? 'Captain Name' : `Player ${idx + 1} Name`}
                                  value={currentName}
                                  onChange={(e) => {
                                    const val = e.target.value
                                    const names = [...(top3Team.player_names || ['', '', '', ''])]
                                    while (names.length < 4) names.push('')
                                    names[idx] = val
                                    setTop3Team({
                                      ...top3Team,
                                      player_names: names,
                                      ...(isLeader ? { captain_name: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                                <input
                                  type="text"
                                  placeholder="Free Fire UID"
                                  value={currentUid}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '')
                                    const uids = [...(top3Team.player_uids || ['', '', '', ''])]
                                    while (uids.length < 4) uids.push('')
                                    uids[idx] = val
                                    setTop3Team({
                                      ...top3Team,
                                      player_uids: uids,
                                      ...(isLeader ? { captain_uid: val } : {}),
                                    })
                                  }}
                                  className="w-full border border-line bg-canvas px-2 py-1 text-xs font-mono text-ink placeholder-ink-subtle focus:border-brand focus:outline-none"
                                />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-t border-line-subtle pt-2">
                      <div>
                        <label className="label block mb-1">KILLS</label>
                        <input
                          type="number"
                          value={top3Team.kills}
                          onChange={(e) => setTop3Team({ ...top3Team, kills: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-brand-bright font-bold"
                        />
                      </div>
                      <div>
                        <label className="label block mb-1">POINTS</label>
                        <input
                          type="number"
                          value={top3Team.points || 0}
                          onChange={(e) => setTop3Team({ ...top3Team, points: parseInt(e.target.value) || 0 })}
                          className="w-full border border-line bg-canvas/60 px-2 py-1 text-xs text-ink font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-brand-bright block mb-1">PRIZE WON</label>
                      <input
                        type="text"
                        value={top3Team.prize || ''}
                        onChange={(e) => setTop3Team({ ...top3Team, prize: e.target.value })}
                        className="w-full border border-brand-border bg-canvas/60 px-2.5 py-1.5 text-xs text-brand-bright font-bold"
                        placeholder="e.g. ₹2,000"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* REGISTERED TEAMS SCORES & PLACEMENT QUICK EDIT */}
              {finishRegs.length > 0 && (
                <div className="space-y-3 border-t border-line-subtle pt-4">
                  <h4 className="eyebrow flex items-center gap-2">
                    <Users size={15} /> ALL REGISTERED TEAMS ({finishRegs.length}) - EDIT PLACEMENTS & KILLS
                  </h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {finishRegs.map((r, i) => (
                      <div key={r.id} className="flex items-center justify-between border border-line-subtle bg-surface-2 p-3 text-xs">
                        <div>
                          <p className="font-bold text-ink">{r.team_name || r.captain_name}</p>
                          <p className="text-xs text-ink-subtle">Captain: {r.captain_name} (FF UID: {r.captain_free_fire_uid})</p>
                          {r.teammate_names && r.teammate_names.length > 0 && (
                            <p className="text-xs text-brand-bright">
                              Teammates: {r.teammate_names.join(', ')}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink-subtle">RANK:</span>
                            <input
                              type="number"
                              placeholder="#"
                              defaultValue={r.placement || i + 1}
                              onBlur={(e) => handleSaveResults(r.id, Number(e.target.value), r.kills || 0)}
                              className="w-12 border border-line bg-canvas px-2 py-1 text-xs font-bold text-ink text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-ink-subtle">KILLS:</span>
                            <input
                              type="number"
                              placeholder="Kills"
                              defaultValue={r.kills || 0}
                              onBlur={(e) => handleSaveResults(r.id, r.placement || (i + 1), Number(e.target.value))}
                              className="w-12 border border-line bg-canvas px-2 py-1 text-xs font-bold text-brand-bright text-center"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteReg(r.id, r.tournament_id)}
                            className="text-brand-bright hover:text-ink p-1"
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

              <div className="border-t border-line-subtle pt-4">
                <button
                  type="submit"
                  className="w-full bg-surface-3 py-3 font-display text-xs font-extrabold tracking-widest text-ink hover:bg-surface-3 transition shadow-lg"
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
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-md p-5 sm:p-6 space-y-4 text-ink">
            <button onClick={() => setEditingTourney(null)} className="absolute right-4 top-4 text-ink-muted hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-extrabold uppercase text-brand-bright">EDIT TOURNAMENT CARD</h3>

            {editingTourney.status === 'completed' && (
              <div className="rounded-lg border border-brand bg-brand-muted/70 p-3 space-y-2">
                <div className="flex items-center gap-2 text-brand-bright font-bold text-xs">
                  <Trophy size={16} />
                  <span>FINISHED TOURNAMENT RESULTS</span>
                </div>
                <p className="text-[11px] text-ink leading-relaxed">
                  Edit the Top 3 podium squads, player names, player UIDs, or attach images and victory songs from your device.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const t = editingTourney
                    setEditingTourney(null)
                    handleOpenFinishModal(t)
                  }}
                  className="w-full flex items-center justify-center gap-1.5 rounded bg-brand py-2 text-xs font-extrabold text-ink hover:opacity-90 transition shadow"
                >
                  <Trophy size={13} /> EDIT TOP 3 SQUADS, UIDS & ATTACH MEDIA
                </button>
              </div>
            )}

            <form onSubmit={handleSaveEditedTournament} className="space-y-3">
              <div>
                <label className="mb-1 block label">TOURNAMENT TITLE</label>
                <input
                  type="text"
                  value={editingTourney.title || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, title: e.target.value })}
                  className="field h-10"
                />
              </div>
              <div>
                <label className="mb-1 block label">GAME MODE</label>
                <select
                  value={editingTourney.game_mode}
                  onChange={(e) => setEditingTourney({ ...editingTourney, game_mode: e.target.value })}
                  className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
                >
                  <option value="CS SQUAD BATTLE">1. CS SQUAD BATTLE (Clash Squad)</option>
                  <option value="BR SQUAD BATTLE">2. BR SQUAD BATTLE (Battle Royale)</option>
                  <option value="BR SOLO">BR SOLO</option>
                  <option value="DUO DEATHMATCH">DUO DEATHMATCH</option>
                  <option value="GUILD VS GUILD">GUILD VS GUILD</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block label">PRIZE POOL / OFFERS</label>
                <input
                  type="text"
                  value={editingTourney.prize_pool || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, prize_pool: e.target.value })}
                  className="field h-10"
                />
              </div>
              <div>
                <label className="mb-1 block label">RULES</label>
                <textarea
                  rows={3}
                  value={editingTourney.rules || ''}
                  onChange={(e) => setEditingTourney({ ...editingTourney, rules: e.target.value })}
                  className="w-full border border-line bg-surface-2 p-2 text-xs text-ink focus:outline-none"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                UPDATE DATABASE
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. Admin Manual Team Registration Modal */}
      {adminAddRegModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-xl p-5 sm:p-6 space-y-4 text-ink max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setAdminAddRegModalOpen(false)}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <div className="border-b border-line-subtle pb-3">
              <h3 className="font-display text-xl font-extrabold uppercase text-brand-bright flex items-center gap-2">
                <Plus size={20} /> ADMIN MANUAL TEAM REGISTRATION
              </h3>
              <p className="text-xs text-ink-muted">
                Register any team (Solo or 4-Player Squad) into any tournament directly.{' '}
                <span className="text-ink font-bold">
                  🛡️ Admin Override Active: You can register teams even if registrations are closed, full, or completed!
                </span>
              </p>
            </div>

            <form onSubmit={handleAdminRegisterTeamSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                  SELECT TOURNAMENT *
                </label>
                <select
                  required
                  value={adminRegTourneyId}
                  onChange={(e) => setAdminRegTourneyId(e.target.value)}
                  className="w-full border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                >
                  <option value="">-- Choose Tournament --</option>
                  {tournaments.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.game_mode}) — {t.status === 'registration_open' ? '🟢 REG OPEN' : `🔒 ${t.status.toUpperCase()} [Admin Allowed]`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                    TEAM / SQUAD NAME *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ELITE TITANS"
                    value={adminRegTeamName}
                    onChange={(e) => setAdminRegTeamName(e.target.value)}
                    className="w-full border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-ink-muted">
                    CONTACT PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={adminRegPhone}
                    onChange={(e) => setAdminRegPhone(e.target.value)}
                    className="w-full border border-line bg-canvas px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* Player 1 - Captain */}
              <div className="border border-brand-border bg-brand-muted p-3 space-y-2 rounded">
                <p className="text-xs font-extrabold text-brand-bright uppercase flex items-center gap-1.5">
                  <User size={13} /> PLAYER 1 (CAPTAIN) *
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Captain Name / IGN *"
                    value={adminRegCaptainName}
                    onChange={(e) => setAdminRegCaptainName(e.target.value)}
                    className="field h-9 px-2.5"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Captain Free Fire UID *"
                    value={adminRegCaptainUid}
                    onChange={(e) => setAdminRegCaptainUid(e.target.value)}
                    className="w-full border border-line bg-canvas px-2.5 py-1.5 text-xs text-brand-bright font-mono"
                  />
                </div>
              </div>

              {/* Player 2 */}
              <div className="border border-line-subtle bg-surface-2 p-3 space-y-2 rounded">
                <p className="label uppercase">PLAYER 2 (TEAMMATE 1)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 2 Name"
                    value={adminRegP2Name}
                    onChange={(e) => setAdminRegP2Name(e.target.value)}
                    className="field h-9 px-2.5"
                  />
                  <input
                    type="text"
                    placeholder="Player 2 FF UID"
                    value={adminRegP2Uid}
                    onChange={(e) => setAdminRegP2Uid(e.target.value)}
                    className="w-full border border-line bg-canvas px-2.5 py-1.5 text-xs text-brand-bright font-mono"
                  />
                </div>
              </div>

              {/* Player 3 */}
              <div className="border border-line-subtle bg-surface-2 p-3 space-y-2 rounded">
                <p className="label uppercase">PLAYER 3 (TEAMMATE 2)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 3 Name"
                    value={adminRegP3Name}
                    onChange={(e) => setAdminRegP3Name(e.target.value)}
                    className="field h-9 px-2.5"
                  />
                  <input
                    type="text"
                    placeholder="Player 3 FF UID"
                    value={adminRegP3Uid}
                    onChange={(e) => setAdminRegP3Uid(e.target.value)}
                    className="w-full border border-line bg-canvas px-2.5 py-1.5 text-xs text-brand-bright font-mono"
                  />
                </div>
              </div>

              {/* Player 4 */}
              <div className="border border-line-subtle bg-surface-2 p-3 space-y-2 rounded">
                <p className="label uppercase">PLAYER 4 (TEAMMATE 3)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Player 4 Name"
                    value={adminRegP4Name}
                    onChange={(e) => setAdminRegP4Name(e.target.value)}
                    className="field h-9 px-2.5"
                  />
                  <input
                    type="text"
                    placeholder="Player 4 FF UID"
                    value={adminRegP4Uid}
                    onChange={(e) => setAdminRegP4Uid(e.target.value)}
                    className="w-full border border-line bg-canvas px-2.5 py-1.5 text-xs text-brand-bright font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand py-3 text-xs font-extrabold tracking-widest text-ink uppercase hover:bg-brand transition shadow-lg"
              >
                CONFIRM & REGISTER TEAM AS ADMIN
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 7. Edit Guild Member Modal */}
      {editingMember && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-md p-5 sm:p-6 space-y-4 text-ink">
            <button
              onClick={() => setEditingMember(null)}
              className="absolute right-4 top-4 text-ink-muted hover:text-ink"
            >
              <X size={20} />
            </button>
            <div className="border-b border-line-subtle pb-2">
              <h3 className="font-display text-xl font-extrabold uppercase text-brand-bright">
                EDIT GUILD MEMBER
              </h3>
              <p className="text-xs text-ink-muted">
                {editingMember.player_name || editingMember.profiles?.ign || 'ELITE PLAYER'}
              </p>
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
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-brand-bright font-bold focus:outline-none"
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
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-brand-bright font-bold focus:outline-none"
                  />
                  <span className="text-xs text-ink-subtle">Total kills</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block label">
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
                  <label className="mb-1 block label">
                    GUILD ROLE
                  </label>
                  <select
                    value={normalizeGuildRole(editingMember.guild_role)}
                    onChange={(e) =>
                      setEditingMember({ ...editingMember, guild_role: e.target.value })
                    }
                    className="w-full border border-line bg-surface px-3 py-2 text-xs text-ink focus:outline-none"
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
                className="w-full bg-brand py-3 text-xs font-extrabold tracking-widest text-ink uppercase hover:bg-brand transition shadow-lg"
              >
                SAVE MEMBER DETAILS
              </button>
            </form>
          </div>
        </div>
      )}

      {editingAch && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-md p-5 sm:p-6 space-y-4 text-ink">
            <button onClick={() => setEditingAch(null)} className="absolute right-4 top-4 text-ink-muted hover:text-ink">
              <X size={20} />
            </button>
            <h3 className="font-display text-xl font-extrabold uppercase text-brand-bright">EDIT ACHIEVEMENT CARD</h3>
            <form onSubmit={handleSaveEditedAchievement} className="space-y-3">
              <div>
                <label className="mb-1 block label">CARD TITLE</label>
                <input
                  type="text"
                  value={editingAch.name || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, name: e.target.value })}
                  className="field h-10"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block label">PLAYER NAME</label>
                  <input
                    type="text"
                    value={editingAch.player_name || ''}
                    onChange={(e) => setEditingAch({ ...editingAch, player_name: e.target.value })}
                    className="field h-10"
                    placeholder="e.g. PlayerName"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-brand-bright">PLAYER FF UID</label>
                  <input
                    type="text"
                    value={editingAch.player_uid || ''}
                    onChange={(e) => setEditingAch({ ...editingAch, player_uid: e.target.value })}
                    className="w-full border border-line bg-surface-2 px-3 py-2 text-xs text-brand-bright font-mono focus:outline-none"
                    placeholder="e.g. 9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block label">DESCRIPTION</label>
                <textarea
                  rows={2}
                  value={editingAch.description || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, description: e.target.value })}
                  className="w-full border border-line bg-surface-2 p-2 text-xs text-ink focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block label">IMAGE / BADGE URL</label>
                <input
                  type="text"
                  value={editingAch.icon_url || ''}
                  onChange={(e) => setEditingAch({ ...editingAch, icon_url: e.target.value })}
                  className="field h-10"
                />
              </div>
              <div>
                <label className="mb-1 block label">XP REWARD</label>
                <input
                  type="number"
                  value={editingAch.xp_reward || 500}
                  onChange={(e) => setEditingAch({ ...editingAch, xp_reward: parseInt(e.target.value) || 0 })}
                  className="field h-10"
                />
              </div>
              <button type="submit" className="btn-primary w-full">
                UPDATE ACHIEVEMENT CARD
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
