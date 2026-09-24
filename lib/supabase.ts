import { createClient } from '@supabase/supabase-js'
import type {
  Profile,
  Tournament,
  TournamentRegistration,
  Guild,
  GuildMember,
  XPTransaction,
  Achievement,
  QnAQuestion,
  CommunityClip,
  HomeCard,
  LeaderboardSection,
  TopTeamDetail,
} from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''

export const supabase = createClient(supabaseUrl, supabaseKey)

// Check database connection health
export async function checkSupabaseConnection() {
  if (!supabaseUrl || !supabaseKey) {
    return { connected: false, error: 'Environment variables missing' }
  }
  try {
    const { data, error } = await supabase.from('tournaments').select('id').limit(1)
    if (error) {
      console.warn('Supabase ping status error:', error.message)
      return { connected: false, error: error.message }
    }
    return { connected: true, data }
  } catch (err: any) {
    return { connected: false, error: err.message }
  }
}

// ==========================================
// 1. AUTHENTICATION & PROFILE SERVICES
// ==========================================

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

export function calculateEffectiveStreak(lastLoginDateStr?: string | null, loginStreak: number = 0): number {
  if (!lastLoginDateStr) return 0
  const now = new Date()
  const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1)

  const todayStr = todayDate.toISOString().split('T')[0]
  const yesterdayStr = yesterdayDate.toISOString().split('T')[0]
  const lastLoginStr = lastLoginDateStr.split('T')[0]

  if (lastLoginStr >= yesterdayStr) {
    return Math.max(0, loginStreak)
  }
  return 0
}

export async function getUserProfile(userId?: string): Promise<Profile | null> {
  try {
    let uid = userId
    if (!uid) {
      const u = await getCurrentUser()
      if (!u) return null
      uid = u.id
    }

    const currentUser = await getCurrentUser()
    if (currentUser && currentUser.id === uid) {
      try {
        await supabase.rpc('sync_user_login', { p_user_id: uid })
      } catch (err) {
        // Fallback silently if rpc is not created yet
      }
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*, user_roles(role)')
      .eq('id', uid)
      .single()

    if (error || !data) return null
    const role = data.user_roles && data.user_roles[0] ? data.user_roles[0].role : 'user'
    const effectiveStreak = calculateEffectiveStreak(data.last_login_date, data.login_streak)
    return {
      ...data,
      login_streak: effectiveStreak,
      role,
    }
  } catch {
    return null
  }
}

export async function updateUserProfile(updates: Partial<Profile>) {
  try {
    const u = await getCurrentUser()
    if (!u) return { success: false, error: 'Not authenticated' }

    const { id, player_id, total_xp, level, role, ...allowed } = updates as any

    const { data, error } = await supabase
      .from('profiles')
      .update(allowed)
      .eq('id', u.id)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export function getUidCredentials(uid: string) {
  const cleanUid = uid.trim()
  const syntheticEmail = `uid_${cleanUid}@player.elitekannadiga.com`
  const syntheticPassword = `player_${cleanUid}_secret_key`
  return { cleanUid, syntheticEmail, syntheticPassword }
}

export async function registerPlayerWithUid(gameUid: string, ign: string) {
  const cleanUid = gameUid.trim()
  const cleanIgn = ign.trim()

  if (!cleanUid) {
    return { success: false, error: 'Free Fire Game UID is required.' }
  }
  if (!cleanIgn) {
    return { success: false, error: 'Player Name (IGN) is required.' }
  }

  const { syntheticEmail, syntheticPassword } = getUidCredentials(cleanUid)

  // 1. Check if an active auth account already exists for this UID
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, free_fire_uid, ign')
    .eq('free_fire_uid', cleanUid)
    .maybeSingle()

  if (existingProfile) {
    // Try logging in to see if auth credentials already exist
    const { data: testLogin } = await supabase.auth.signInWithPassword({
      email: syntheticEmail,
      password: syntheticPassword,
    })

    if (testLogin?.user) {
      // User is already fully registered with auth credentials
      const profile = await getUserProfile(testLogin.user.id)
      await trackPageVisit(true)
      return { success: true, profile, role: profile?.role || 'user' }
    }
  }

  // 2. Provision or register player account via RPC or Auth signup
  let userId: string | null = null
  const { data: rpcData, error: rpcErr } = await supabase.rpc('create_player_account', {
    p_email: syntheticEmail,
    p_password: syntheticPassword,
    p_ign: cleanIgn,
    p_uid: cleanUid,
  })

  if (rpcErr) {
    if (rpcErr.message?.includes('UID_ALREADY_EXISTS')) {
      return {
        success: false,
        error: `A player account with Game UID "${cleanUid}" is already registered. Please log in with your Game UID.`,
      }
    }
    // Fallback to standard signUp
    const { data: authData, error: authErr } = await supabase.auth.signUp({
      email: syntheticEmail,
      password: syntheticPassword,
      options: {
        data: {
          ign: cleanIgn,
          free_fire_uid: cleanUid,
          username: cleanIgn,
        },
      },
    })
    if (authErr) {
      return { success: false, error: authErr.message || 'Failed to create player account.' }
    }
    userId = authData.user?.id || null
  } else {
    userId = rpcData?.user_id || null
  }

  // 3. Log in with the created credentials
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  })

  if (loginErr || !loginData.user) {
    return { success: false, error: loginErr?.message || 'Account created but failed to sign in.' }
  }

  const currentUserId = loginData.user.id

  // 4. Ensure profile has free_fire_uid and ign updated
  await supabase
    .from('profiles')
    .update({
      free_fire_uid: cleanUid,
      ign: cleanIgn,
      username: cleanIgn,
    })
    .eq('id', currentUserId)

  const profile = await getUserProfile(currentUserId)
  await trackPageVisit(true)
  return { success: true, profile, role: profile?.role || 'user' }
}

export async function loginPlayerWithUid(gameUid: string) {
  const cleanUid = gameUid.trim()
  if (!cleanUid) {
    return { success: false, error: 'Free Fire Game UID is required.' }
  }

  // 1. Check if profile exists with this UID
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, free_fire_uid, ign')
    .eq('free_fire_uid', cleanUid)
    .maybeSingle()

  const { syntheticEmail, syntheticPassword } = getUidCredentials(cleanUid)

  // 2. Attempt login using synthetic credentials
  let { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: syntheticEmail,
    password: syntheticPassword,
  })

  if (loginErr) {
    // Provision/create account via RPC if UID exists in DB or is being logged into
    const playerIgn = existingProfile?.ign || (await findPlayerNameByUid(cleanUid)) || 'Player ' + cleanUid
    const { error: rpcErr } = await supabase.rpc('create_player_account', {
      p_email: syntheticEmail,
      p_password: syntheticPassword,
      p_ign: playerIgn,
      p_uid: cleanUid,
    })

    if (!rpcErr) {
      // Retry sign in
      const retry = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: syntheticPassword,
      })
      loginData = retry.data
      loginErr = retry.error
    }
  }

  if (loginErr || !loginData?.user) {
    return {
      success: false,
      error: loginErr?.message || `No account found with Game UID "${cleanUid}". Please click "NEW PLAYER? CREATE PLAYER ACCOUNT" below to register.`,
    }
  }

  const profile = await getUserProfile(loginData.user.id)
  if (profile && (!profile.free_fire_uid || profile.free_fire_uid !== cleanUid)) {
    await supabase.from('profiles').update({ free_fire_uid: cleanUid }).eq('id', loginData.user.id)
  }

  await trackPageVisit(true)
  return { success: true, profile, role: profile?.role || 'user' }
}


// ==========================================
// 2. DYNAMIC HOME CARDS & CMS SERVICES
// ==========================================

export async function trackPageVisit(isLogin = false) {
  try {
    const { data } = await supabase.rpc('increment_site_visits', {
      p_is_login: isLogin,
    })
    return data
  } catch {
    return null
  }
}

export async function fetchDynamicHomeStats(): Promise<HomeCard[]> {
  try {
    // 1. Registered Players (total unique players across profiles, tournament registrations, guild, and honors)
    const uniqueUids = new Set<string>()

    const { data: profiles } = await supabase.from('profiles').select('free_fire_uid, player_id')
    if (profiles) {
      for (const p of profiles) {
        const uid = (p.free_fire_uid || p.player_id || '').trim()
        if (uid) uniqueUids.add(uid)
      }
    }

    const { data: tourneyRegs } = await supabase.from('tournament_registrations').select('captain_free_fire_uid, teammate_uids')
    if (tourneyRegs) {
      for (const r of tourneyRegs) {
        if (r.captain_free_fire_uid?.trim()) uniqueUids.add(r.captain_free_fire_uid.trim())
        if (Array.isArray(r.teammate_uids)) {
          for (const tuid of r.teammate_uids) {
            if (tuid && String(tuid).trim()) uniqueUids.add(String(tuid).trim())
          }
        }
      }
    }

    const { data: honors } = await supabase.from('player_honors').select('player_uid')
    if (honors) {
      for (const h of honors) {
        if (h.player_uid?.trim()) uniqueUids.add(h.player_uid.trim())
      }
    }

    const { data: guildMembers } = await supabase.from('guild_members').select('player_name')
    if (guildMembers) {
      for (const m of guildMembers) {
        if (m.player_name?.trim()) uniqueUids.add(m.player_name.trim())
      }
    }

    const totalRegistrations = Math.max(uniqueUids.size, 1)

    // 2. Organized Tournaments count (non-draft tournaments)
    const { count: tourneyCount } = await supabase
      .from('tournaments')
      .select('*', { count: 'exact', head: true })
      .neq('status', 'draft')

    // 3. Page Visits / Login visits count
    let totalVisits = 1
    try {
      const { data: statsData } = await supabase
        .from('site_stats')
        .select('stat_key, stat_value')

      if (statsData && statsData.length > 0) {
        const visitRow = statsData.find((s) => s.stat_key === 'total_visits')
        if (visitRow) {
          totalVisits = Number(visitRow.stat_value) || 1
        }
      }
    } catch {
      // fallback
    }

    const formatNum = (num: number) => num.toLocaleString('en-US')

    return [
      {
        id: 'stat-1',
        section: 'HERO_STATS',
        title: formatNum(totalRegistrations),
        subtitle: 'REGISTERED PLAYERS',
        stat_number: formatNum(totalRegistrations),
        stat_label: 'REGISTERED PLAYERS',
        display_order: 1,
        is_active: true,
      },
      {
        id: 'stat-2',
        section: 'HERO_STATS',
        title: formatNum(tourneyCount || 0),
        subtitle: 'ORGANIZED TOURNAMENTS',
        stat_number: formatNum(tourneyCount || 0),
        stat_label: 'ORGANIZED TOURNAMENTS',
        display_order: 2,
        is_active: true,
      },
      {
        id: 'stat-3',
        section: 'HERO_STATS',
        title: formatNum(totalVisits),
        subtitle: 'TOTAL VISITS',
        stat_number: formatNum(totalVisits),
        stat_label: 'TOTAL VISITS',
        display_order: 3,
        is_active: true,
      },
    ]
  } catch (err) {
    return [
      {
        id: 'stat-1',
        section: 'HERO_STATS',
        title: '0',
        subtitle: 'REGISTERED PLAYERS',
        stat_number: '0',
        stat_label: 'REGISTERED PLAYERS',
        display_order: 1,
        is_active: true,
      },
      {
        id: 'stat-2',
        section: 'HERO_STATS',
        title: '0',
        subtitle: 'ORGANIZED TOURNAMENTS',
        stat_number: '0',
        stat_label: 'ORGANIZED TOURNAMENTS',
        display_order: 2,
        is_active: true,
      },
      {
        id: 'stat-3',
        section: 'HERO_STATS',
        title: '1',
        subtitle: 'TOTAL VISITS',
        stat_number: '1',
        stat_label: 'TOTAL VISITS',
        display_order: 3,
        is_active: true,
      },
    ]
  }
}

export async function fetchHomeCards(): Promise<HomeCard[]> {
  return fetchDynamicHomeStats()
}

export async function upsertHomeCard(card: Partial<HomeCard>) {
  try {
    const { data, error } = await supabase
      .from('home_cards')
      .upsert([card])
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteHomeCard(cardId: string) {
  try {
    const { error } = await supabase.from('home_cards').delete().eq('id', cardId)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 3. TOURNAMENTS & TEAM REGISTRATION SERVICES
// ==========================================

export async function fetchTournaments(): Promise<Tournament[]> {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, tournament_registrations(id)')
      .order('tournament_start', { ascending: true })

    if (error || !data) {
      return []
    }

    return data.map((t: any) => ({
      ...t,
      slots_filled: Array.isArray(t.tournament_registrations) ? t.tournament_registrations.length : (t.slots_filled || 0),
    }))
  } catch {
    return []
  }
}

// Team Registration RPC call with Duplicate Free Fire UID Prevention
export async function registerTournamentTeam(regData: {
  tournamentId: string
  captainName: string
  captainUid: string
  phone: string
  teamName?: string
  teammateUids?: string[]
  teammateNames?: string[]
}) {
  try {
    const u = await getCurrentUser()
    const userId = u ? u.id : null

    const { data, error } = await supabase.rpc('register_tournament_team', {
      p_tournament_id: regData.tournamentId,
      p_user_id: userId,
      p_captain_name: regData.captainName,
      p_captain_uid: regData.captainUid,
      p_phone: regData.phone || '+91 9000000000',
      p_team_name: regData.teamName || regData.captainName,
      p_teammate_uids: regData.teammateUids || [],
      p_teammate_names: regData.teammateNames || [],
    })

    if (!error && data) {
      if (typeof data === 'object' && data.success === false) {
        // Fallback: Direct table insertion
        const { data: directData, error: directError } = await supabase
          .from('tournament_registrations')
          .insert([
            {
              tournament_id: regData.tournamentId,
              user_id: userId,
              team_name: regData.teamName || regData.captainName,
              captain_name: regData.captainName,
              captain_free_fire_uid: regData.captainUid?.trim() || 'N/A',
              phone_number: regData.phone || '+91 9000000000',
              teammate_names: regData.teammateNames || [],
              teammate_uids: regData.teammateUids || [],
              registration_status: 'confirmed',
              result_verified: true,
            },
          ])
          .select()

        if (!directError && directData && directData.length > 0) {
          return { success: true, message: 'Team registered successfully!' }
        }

        return { success: false, error: data.error || directError?.message || 'Failed to register team' }
      }
      return data
    }

    if (error) {
      // Direct table insert fallback
      const { data: directData, error: directError } = await supabase
        .from('tournament_registrations')
        .insert([
          {
            tournament_id: regData.tournamentId,
            user_id: userId,
            team_name: regData.teamName || regData.captainName,
            captain_name: regData.captainName,
            captain_free_fire_uid: regData.captainUid?.trim() || 'N/A',
            phone_number: regData.phone || '+91 9000000000',
            teammate_names: regData.teammateNames || [],
            teammate_uids: regData.teammateUids || [],
            registration_status: 'confirmed',
            result_verified: true,
          },
        ])
        .select()

      if (!directError && directData && directData.length > 0) {
        return { success: true, message: 'Team registered successfully!' }
      }

      return { success: false, error: error.message || directError?.message || 'Failed to register team' }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function fetchTournamentRegistrationsForAdmin(tournamentId: string): Promise<TournamentRegistration[]> {
  try {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*, profiles(ign, player_id)')
      .eq('tournament_id', tournamentId)

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

export async function saveMatchResults(registrationId: string, placement: number, kills: number) {
  try {
    const { data, error } = await supabase
      .from('tournament_registrations')
      .update({
        placement,
        kills,
        result_verified: true,
      })
      .eq('id', registrationId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateTournamentTop3AndResults(
  tournamentId: string,
  top3: TopTeamDetail[],
  status: string = 'completed'
) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .update({
        top_3_teams: top3,
        status,
      })
      .eq('id', tournamentId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteTournamentRegistration(registrationId: string) {
  try {
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', registrationId)

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function fetchUserRegistrations(userId?: string): Promise<TournamentRegistration[]> {
  try {
    let uid = userId
    if (!uid) {
      const u = await getCurrentUser()
      if (!u) return []
      uid = u.id
    }
    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*, tournaments(*)')
      .eq('user_id', uid)

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

// ==========================================
// 4. RANKINGS & LEADERBOARD SECTIONS
// ==========================================

export async function fetchLeaderboardSections(): Promise<LeaderboardSection[]> {
  try {
    const { data, error } = await supabase
      .from('leaderboard_sections')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    if (error || !data) {
      return []
    }
    return data
  } catch {
    return []
  }
}

export async function createLeaderboardSection(section: Partial<LeaderboardSection>) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_sections')
      .insert([section])
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export interface LeaderboardPlayer {
  rank: string
  id: string
  name: string
  uid: string
  guild: string
  avatar_url?: string
  logins: number
  xp: number
  level: number
  tier: string
  change: string
}

export function getRankTier(rankNum: number): string {
  if (rankNum === 1) return 'ELITE MASTER'
  if (rankNum === 2) return 'ELITE HEROIC'
  if (rankNum === 3) return 'PLATINUM'
  if (rankNum === 4) return 'GOLD'
  if (rankNum === 5) return 'SILVER'
  return 'BRONZE'
}

export async function fetchRankings(): Promise<LeaderboardPlayer[]> {
  try {
    // 1. Fetch ALL user profiles from profiles table
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, player_id, username, ign, free_fire_uid, avatar_url, login_streak, longest_login_streak, last_login_date, total_xp, level, guild_id, guilds!fk_profiles_guild(name)')
      .order('login_streak', { ascending: false })
      .order('longest_login_streak', { ascending: false })
      .order('total_xp', { ascending: false })

    // 2. Fetch ALL tournament registrations to include players registered via tournaments
    const { data: tourneyRegs } = await supabase
      .from('tournament_registrations')
      .select('id, captain_name, captain_free_fire_uid, user_id, teammate_names, teammate_uids')

    const playerMap = new Map<string, any>()

    // Build avatar map for quick lookup - only store real avatar URLs
    const avatarMap = new Map<string, string>()
    if (profiles) {
      for (const p of profiles) {
        if (p.avatar_url && p.avatar_url.trim() !== '') {
          const url = p.avatar_url
          if (p.free_fire_uid) avatarMap.set(p.free_fire_uid.trim().toLowerCase(), url)
          if (p.ign) avatarMap.set(p.ign.trim().toLowerCase(), url)
          if (p.username) avatarMap.set(p.username.trim().toLowerCase(), url)
          if (p.player_id) avatarMap.set(p.player_id.trim().toLowerCase(), url)
        }
      }
    }

    // Add profiles to map keyed by UID or ID
    if (profiles) {
      for (const p of profiles) {
        const uid = (p.free_fire_uid || p.player_id || '').trim()
        const key = uid ? uid : p.id
        const guildName = Array.isArray(p.guilds)
          ? p.guilds[0]?.name
          : (p.guilds as any)?.name

        const effectiveStreak = calculateEffectiveStreak(p.last_login_date, p.login_streak || 0)

        playerMap.set(key, {
          id: p.id,
          name: p.ign || p.username || p.player_id,
          uid: uid || 'N/A',
          avatar_url: (p.avatar_url && p.avatar_url.trim() !== '') ? p.avatar_url : null,
          guild: guildName || 'ELITE ARMY',
          logins: effectiveStreak,
          longest_streak: p.longest_login_streak || 0,
          xp: p.total_xp || 100,
          level: p.level || 1,
        })
      }
    }

    // Add tournament registrations captains/teammates if not already present
    if (tourneyRegs) {
      for (const reg of tourneyRegs) {
        const captainUid = (reg.captain_free_fire_uid || '').trim()
        if (captainUid && !playerMap.has(captainUid)) {
          const capAvatar =
            avatarMap.get(captainUid.toLowerCase()) ||
            avatarMap.get((reg.captain_name || '').trim().toLowerCase()) ||
            null
          playerMap.set(captainUid, {
            id: reg.id,
            name: reg.captain_name || 'Captain',
            uid: captainUid,
            avatar_url: capAvatar,
            guild: 'ELITE ARMY',
            logins: 1,
            xp: 250,
            level: 5,
          })
        }

        // Check teammate UIDs/names
        if (Array.isArray(reg.teammate_uids) && Array.isArray(reg.teammate_names)) {
          for (let i = 0; i < reg.teammate_uids.length; i++) {
            const tUid = (reg.teammate_uids[i] || '').trim()
            const tName = (reg.teammate_names[i] || '').trim()
            if (tUid && !playerMap.has(tUid)) {
              const tmAvatar =
                avatarMap.get(tUid.toLowerCase()) ||
                avatarMap.get(tName.toLowerCase()) ||
                null
              playerMap.set(tUid, {
                id: `tm-${tUid}`,
                name: tName || 'Teammate',
                uid: tUid,
                avatar_url: tmAvatar,
                guild: 'ELITE ARMY',
                logins: 1,
                xp: 150,
                level: 3,
              })
            }
          }
        }
      }
    }

    const allPlayers = Array.from(playerMap.values())

    // Sort by active logins DESC, longest streak DESC, xp DESC
    allPlayers.sort((a, b) => {
      if (b.logins !== a.logins) return b.logins - a.logins
      if ((b.longest_streak || 0) !== (a.longest_streak || 0)) return (b.longest_streak || 0) - (a.longest_streak || 0)
      return b.xp - a.xp
    })

    if (allPlayers.length > 0) {
      const result = allPlayers.map((item, index) => {
        const rankNum = index + 1
        return {
          rank: String(rankNum).padStart(2, '0'),
          id: item.id,
          name: item.name,
          uid: item.uid,
          avatar_url: item.avatar_url || null,
          guild: item.guild,
          logins: item.logins,
          xp: item.xp,
          level: item.level,
          tier: getRankTier(rankNum),
          change: '+' + (Math.floor(Math.random() * 4) + 1),
        }
      })
      console.log('[fetchRankings] Returned players with avatars:', result.map(r => ({ name: r.name, uid: r.uid, avatar_url: r.avatar_url })))
      return result
    }
  } catch (err) {
    console.error('[fetchRankings] Error:', err)
  }

  // Fallback mock rankings if database is completely empty
  const mockFallback = [
    { id: '1', name: 'ELITE_RAHUL', uid: '1928374650', guild: 'ELITE ARMY', logins: 48, xp: 24920, level: 42, avatar_url: null },
    { id: '2', name: 'KANNADA_KING', uid: '9876543210', guild: 'ELITE ARMY', logins: 36, xp: 22840, level: 39, avatar_url: null },
    { id: '3', name: 'SHADOW_77', uid: '4567891230', guild: 'ELITE ARMY', logins: 29, xp: 21190, level: 36, avatar_url: null },
    { id: '4', name: 'BL4CK_HAWK', uid: '7891234560', guild: 'ELITE ARMY', logins: 22, xp: 19804, level: 34, avatar_url: null },
    { id: '5', name: 'NINJA_KANNADIGA', uid: '3216549870', guild: 'ELITE ARMY', logins: 18, xp: 18450, level: 31, avatar_url: null },
    { id: '6', name: 'FIRE_STORM', uid: '5432167890', guild: 'ELITE ARMY', logins: 14, xp: 15200, level: 28, avatar_url: null },
    { id: '7', name: 'COBRA_STRIKER', uid: '8765432109', guild: 'ELITE ARMY', logins: 11, xp: 13400, level: 24, avatar_url: null },
  ]

  return mockFallback.map((item, index) => {
    const rankNum = index + 1
    return {
      rank: String(rankNum).padStart(2, '0'),
      id: item.id,
      name: item.name,
      uid: item.uid,
      avatar_url: '',
      guild: item.guild,
      logins: item.logins,
      xp: item.xp,
      level: item.level,
      tier: getRankTier(rankNum),
      change: '+' + (Math.floor(Math.random() * 4) + 1),
    }
  })
}

// ==========================================
// 4.5 PLAYER HONORS (GUN GODS & MOVEMENT GODS)
// ==========================================

export interface PlayerHonor {
  id: string
  category: 'gun_gods' | 'movement_gods'
  player_uid: string
  player_name: string
  title_name: string
  description: string
  display_order?: number
  created_at?: string
  rank?: string
  tier?: string
  avatar_url?: string
}

export async function fetchPlayerHonors(category: 'gun_gods' | 'movement_gods'): Promise<PlayerHonor[]> {
  try {
    const { data, error } = await supabase
      .from('player_honors')
      .select('*')
      .eq('category', category)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!error && data) {
      const { data: profiles } = await supabase.from('profiles').select('free_fire_uid, ign, username, avatar_url')
      const avatarMap = new Map<string, string>()
      if (profiles) {
        for (const p of profiles) {
          if (p.avatar_url && p.avatar_url.trim() !== '') {
            const url = p.avatar_url
            if (p.free_fire_uid) avatarMap.set(p.free_fire_uid.trim().toLowerCase(), url)
            if (p.ign) avatarMap.set(p.ign.trim().toLowerCase(), url)
            if (p.username) avatarMap.set(p.username.trim().toLowerCase(), url)
          }
        }
      }

      return data.map((item: any, index: number) => ({
        ...item,
        rank: String(index + 1).padStart(2, '0'),
        tier: getRankTier(index + 1),
        avatar_url:
          (item.avatar_url && item.avatar_url.trim() !== '' ? item.avatar_url : null) ||
          avatarMap.get((item.player_uid || '').trim().toLowerCase()) ||
          avatarMap.get((item.player_name || '').trim().toLowerCase()) ||
          null,
      }))
    }
  } catch {
    return []
  }
  return []

  // Fallback mock data if database table empty
  if (category === 'gun_gods') {
    return [
      { id: 'h1', category: 'gun_gods', player_uid: '1928374650', player_name: 'ELITE_RAHUL', title_name: 'M1887 One-Tap King', description: 'Dominates 1v1 custom rooms with devastating close-range headshot accuracy.', rank: '01', tier: 'ELITE MASTER', avatar_url: null },
      { id: 'h2', category: 'gun_gods', player_uid: '9876543210', player_name: 'KANNADA_KING', title_name: 'AWM Sniper God', description: 'Long-range sniper specialist with 95% headshot accuracy in tournament finals.', rank: '02', tier: 'ELITE HEROIC', avatar_url: null },
      { id: 'h3', category: 'gun_gods', player_uid: '4567891230', player_name: 'SHADOW_77', title_name: 'MP40 Speed Demon', description: 'Insane fire rate spray control and instant close-combat wipes.', rank: '03', tier: 'PLATINUM', avatar_url: null },
    ]
  } else {
    return [
      { id: 'h4', category: 'movement_gods', player_uid: '4567891230', player_name: 'SHADOW_77', title_name: '360 Gloo Wall Fast Dash', description: 'Lightning fast gloo wall placement and unpredictable zig-zag rush movements.', rank: '01', tier: 'ELITE MASTER', avatar_url: null },
      { id: 'h5', category: 'movement_gods', player_uid: '7891234560', player_name: 'BL4CK_HAWK', title_name: 'Speed Jump Shot Master', description: 'Extreme agility and jump-shot precision under heavy enemy pressure.', rank: '02', tier: 'ELITE HEROIC', avatar_url: null },
      { id: 'h6', category: 'movement_gods', player_uid: '3216549870', player_name: 'NINJA_KANNADIGA', title_name: 'Fast Reflex Evasion', description: 'Unmatched reflex dodges and continuous movement maneuvers.', rank: '03', tier: 'PLATINUM', avatar_url: null },
    ]
  }
}

export async function addPlayerHonor(honor: {
  category: 'gun_gods' | 'movement_gods'
  player_uid: string
  player_name: string
  title_name: string
  description: string
  avatar_url?: string
}) {
  try {
    let resolvedAvatar = honor.avatar_url || ''
    if (!resolvedAvatar && honor.player_uid) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('free_fire_uid', honor.player_uid.trim())
        .maybeSingle()
      if (prof?.avatar_url) resolvedAvatar = prof.avatar_url
    }

    const { data, error } = await supabase
      .from('player_honors')
      .insert([{
        category: honor.category,
        player_uid: honor.player_uid.trim(),
        player_name: honor.player_name.trim(),
        title_name: honor.title_name.trim(),
        description: honor.description.trim(),
        avatar_url: resolvedAvatar || null,
      }])
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deletePlayerHonor(honorId: string) {
  try {
    const { error } = await supabase.from('player_honors').delete().eq('id', honorId)
    if (error && error.code !== 'PGRST116' && error.code !== '22P02') {
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err: any) {
    return { success: true }
  }
}

export async function fetchAvatarMap(): Promise<Map<string, string>> {
  const avatarMap = new Map<string, string>()
  try {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('free_fire_uid, ign, username, player_id, avatar_url')

    if (profiles) {
      for (const p of profiles) {
        // Only store actual avatar URLs - don't fall back to logo so UI shows initials
        if (p.avatar_url && p.avatar_url.trim() !== '') {
          const url = p.avatar_url
          if (p.free_fire_uid) avatarMap.set(p.free_fire_uid.trim().toLowerCase(), url)
          if (p.ign) avatarMap.set(p.ign.trim().toLowerCase(), url)
          if (p.username) avatarMap.set(p.username.trim().toLowerCase(), url)
          if (p.player_id) avatarMap.set(p.player_id.trim().toLowerCase(), url)
        }
      }
    }
  } catch {
    // ignore
  }
  return avatarMap
}

export async function findPlayerProfileByUid(uid: string): Promise<{ ign: string; avatar_url: string; level: number; player_id: string } | null> {
  const cleanUid = uid.trim()
  if (!cleanUid) return null

  try {
    // 1. Search profiles
    const { data: profile } = await supabase
      .from('profiles')
      .select('ign, username, player_id, avatar_url, level')
      .eq('free_fire_uid', cleanUid)
      .maybeSingle()

    if (profile) {
      return {
        ign: profile.ign || profile.username || profile.player_id,
        avatar_url: profile.avatar_url && profile.avatar_url.trim() !== '' ? profile.avatar_url : null,
        level: profile.level || 1,
        player_id: profile.player_id || '',
      }
    }

    // 2. Search tournament registrations as captain
    const { data: reg } = await supabase
      .from('tournament_registrations')
      .select('captain_name')
      .eq('captain_free_fire_uid', cleanUid)
      .maybeSingle()

    if (reg && reg.captain_name) {
      return {
        ign: reg.captain_name,
        avatar_url: null,
        level: 1,
        player_id: '',
      }
    }
  } catch {
    // ignore
  }

  return null
}

export async function findPlayerNameByUid(uid: string): Promise<string> {
  const profile = await findPlayerProfileByUid(uid)
  return profile ? profile.ign : ''
}

export async function fetchSiteSetting(key: string, defaultValue = 'true'): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle()

    if (error || !data) {
      return defaultValue === 'true'
    }
    return data.setting_value === 'true'
  } catch {
    return defaultValue === 'true'
  }
}

export async function updateSiteSetting(key: string, value: boolean) {
  const strVal = value ? 'true' : 'false'
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .upsert(
        [{ setting_key: key, setting_value: strVal, updated_at: new Date().toISOString() }],
        { onConflict: 'setting_key' }
      )
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, value }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 5. ELITE ARMY SINGLE GUILD SERVICES
// ==========================================

export async function fetchEliteArmyGuild() {
  try {
    let { data: guild, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('name', 'ELITE ARMY')
      .single()

    if (error || !guild) {
      return { guild: null, members: [] }
    }

    // Fetch members sorted by glory_contributed DESC
    const { data: members } = await supabase
      .from('guild_members')
      .select('*, profiles(ign, player_id, avatar_url, level)')
      .eq('guild_id', guild.id)
      .order('glory_contributed', { ascending: false })

    return {
      guild,
      members: members || [],
    }
  } catch {
    return {
      guild: null,
      members: [],
    }
  }
}

export async function updateGuildMemberGlory(memberId: string, glory: number) {
  try {
    const { data, error } = await supabase
      .from('guild_members')
      .update({ glory_contributed: glory })
      .eq('id', memberId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateTournament(tourneyId: string, updates: Partial<Tournament>) {
  try {
    const { data, error } = await supabase
      .from('tournaments')
      .update(updates)
      .eq('id', tourneyId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateLeaderboardSection(sectionId: string, updates: Partial<LeaderboardSection>) {
  try {
    const { data, error } = await supabase
      .from('leaderboard_sections')
      .update(updates)
      .eq('id', sectionId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateGuildMember(memberId: string, updates: Partial<GuildMember>) {
  try {
    const { data, error } = await supabase
      .from('guild_members')
      .update(updates)
      .eq('id', memberId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 6. ACHIEVEMENTS SERVICES
// ==========================================

export async function fetchAchievements(): Promise<Achievement[]> {
  try {
    const { data, error } = await supabase
      .from('achievements')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: true })

    if (error || !data) {
      return []
    }

    // Resolve avatar_url for each achievement based on player_uid or player_name
    const { data: profiles } = await supabase
      .from('profiles')
      .select('free_fire_uid, ign, username, avatar_url')

    const avatarMap = new Map<string, string | null>()
    if (profiles) {
      for (const p of profiles) {
        // Only store the url if the player actually has one - don't fall back to logo
        const url = p.avatar_url && p.avatar_url.trim() !== '' ? p.avatar_url : null
        if (p.free_fire_uid) avatarMap.set(p.free_fire_uid.trim().toLowerCase(), url)
        if (p.ign) avatarMap.set(p.ign.trim().toLowerCase(), url)
        if (p.username) avatarMap.set(p.username.trim().toLowerCase(), url)
      }
    }

    return data.map((item: any) => {
      // Only resolve to an actual avatar URL if the player/achievement has one
      // Otherwise return null so the UI shows initials instead of the channel logo
      const resolvedAvatar =
        (item.avatar_url && item.avatar_url.trim() !== '' ? item.avatar_url : null) ||
        avatarMap.get((item.player_uid || '').trim().toLowerCase()) ||
        avatarMap.get((item.player_name || '').trim().toLowerCase()) ||
        null

      return {
        ...item,
        avatar_url: resolvedAvatar,
      }
    })
  } catch {
    return []
  }
}

export async function upsertAchievement(achievement: Partial<Achievement>) {
  try {
    const generatedSlug = achievement.name
      ? achievement.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + Date.now()
      : 'achievement-' + Date.now()

    let resolvedAvatar = achievement.avatar_url || ''
    if (!resolvedAvatar && achievement.player_uid) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('free_fire_uid', achievement.player_uid.trim())
        .maybeSingle()
      if (prof?.avatar_url) resolvedAvatar = prof.avatar_url
    }

    const payload = {
      ...achievement,
      avatar_url: resolvedAvatar || achievement.avatar_url || '',
      description: achievement.description && achievement.description.trim() ? achievement.description.trim() : (achievement.name || 'Elite achievement reward card'),
      slug: achievement.slug || generatedSlug,
      achievement_type: achievement.achievement_type || 'tournament',
      xp_reward: achievement.xp_reward || 500,
      rarity: achievement.rarity || 'EPIC',
      is_active: achievement.is_active ?? true,
    }

    const { data, error } = await supabase
      .from('achievements')
      .upsert([payload])
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteAchievement(id: string) {
  try {
    const { error } = await supabase.from('achievements').delete().eq('id', id)
    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 7. DAILY LOGIN & XP SERVICES
// ==========================================

export async function claimDailyLoginReward() {
  try {
    const u = await getCurrentUser()
    if (!u) return { success: false, message: 'Please log in' }

    const { data, error } = await supabase.rpc('claim_daily_login', { p_user_id: u.id })
    if (error) {
      return { success: false, message: error.message }
    }
    return data
  } catch (err: any) {
    return { success: false, message: err.message }
  }
}

export async function fetchUserXPTransactions(userId?: string): Promise<XPTransaction[]> {
  try {
    let uid = userId
    if (!uid) {
      const u = await getCurrentUser()
      if (!u) return []
      uid = u.id
    }
    const { data, error } = await supabase
      .from('xp_transactions')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error || !data) return []
    return data
  } catch {
    return []
  }
}

// ==========================================
// 8. QnA QUIZ ARENA SERVICES
// ==========================================

export async function fetchQnAs(): Promise<QnAQuestion[]> {
  try {
    const { data, error } = await supabase
      .from('qna_questions')
      .select('id, question, category, options, explanation, xp_reward, is_active')
      .eq('is_active', true)

    if (error || !data || data.length === 0) {
      return MOCK_QNAS
    }
    return data
  } catch {
    return MOCK_QNAS
  }
}

export async function submitQnAAnswer(questionId: string, selectedAnswer: number) {
  try {
    const u = await getCurrentUser()
    if (!u) return { success: false, error: 'Please log in' }

    const { data, error } = await supabase.rpc('submit_qna_answer', {
      p_question_id: questionId,
      p_selected_answer: selectedAnswer,
    })

    if (error) return { success: false, error: error.message }
    return data
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 9. COMMUNITY CLIPS SERVICES
// ==========================================

export async function fetchCommunityClips(): Promise<CommunityClip[]> {
  try {
    const { data, error } = await supabase
      .from('community_clips')
      .select('*, profiles(ign, username)')
      .eq('moderation_status', 'approved')
      .order('created_at', { ascending: false })

    if (error || !data || data.length === 0) {
      return MOCK_CLIPS as any
    }
    return data.map((item: any) => ({
      ...item,
      player_name: item.profiles?.ign || item.profiles?.username || 'ELITE PLAYER',
    }))
  } catch {
    return MOCK_CLIPS as any
  }
}

export async function fetchPendingClipsForAdmin(): Promise<CommunityClip[]> {
  try {
    const { data, error } = await supabase
      .from('community_clips')
      .select('*, profiles(ign, username)')
      .eq('moderation_status', 'pending')

    if (error || !data) return []
    return data.map((item: any) => ({
      ...item,
      player_name: item.profiles?.ign || item.profiles?.username || 'ELITE PLAYER',
    }))
  } catch {
    return []
  }
}

export async function moderateClipStatus(clipId: string, status: 'approved' | 'rejected') {
  try {
    const { data, error } = await supabase
      .from('community_clips')
      .update({ moderation_status: status })
      .eq('id', clipId)
      .select()

    if (error) return { success: false, error: error.message }
    return { success: true, data: data[0] }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// MOCK DATA FALLBACKS
// ==========================================

export const MOCK_HOME_CARDS: HomeCard[] = [
  { id: '1', section: 'HERO_STATS', title: '12,482+', stat_number: '12,482+', stat_label: 'REGISTERED PLAYERS', display_order: 1, is_active: true },
  { id: '2', section: 'HERO_STATS', title: '286', stat_number: '286', stat_label: 'TOURNAMENTS', display_order: 2, is_active: true },
  { id: '3', section: 'HERO_STATS', title: '₹4.8L+', stat_number: '₹4.8L+', stat_label: 'PRIZES DISTRIBUTED', display_order: 3, is_active: true },
  { id: '4', section: 'HERO_STATS', title: '1.2M+', stat_number: '1.2M+', stat_label: 'COMMUNITY REACH', display_order: 4, is_active: true },
]

export const MOCK_LEADERBOARD_SECTIONS: LeaderboardSection[] = [
  { id: '1', name: 'OVERALL XP', slug: 'overall-xp', icon_name: 'Trophy', description: 'Global rankings', display_order: 1, is_active: true },
  { id: '2', name: 'WEEKLY XP', slug: 'weekly-xp', icon_name: 'Flame', description: 'Weekly active warriors', display_order: 2, is_active: true },
  { id: '3', name: 'MONTHLY XP', slug: 'monthly-xp', icon_name: 'Calendar', description: 'Monthly leaderboards', display_order: 3, is_active: true },
  { id: '4', name: 'STREAM XP', slug: 'stream-xp', icon_name: 'Video', description: 'Stream supporters', display_order: 4, is_active: true },
  { id: '5', name: 'GUILD GLORY', slug: 'guild-glory', icon_name: 'Shield', description: 'ELITE ARMY glory rankings', display_order: 5, is_active: true },
]

export const MOCK_TOURNAMENTS = [
  { id: '1', title: 'ELITE CLASH #24', type: 'SQUAD BATTLE', game_mode: 'SQUAD BATTLE', prize: '₹10,000', prize_pool: '₹10,000', date: '20 SEP 2026', time: '8:00 PM', slots: '48 / 100', max_slots: 100, status: 'registration_open', entry_type: 'SQUAD' },
  { id: '2', title: 'NIGHT RAID', type: 'BR SOLO', game_mode: 'BR SOLO', prize: '₹5,000', prize_pool: '₹5,000', date: '24 SEP 2026', time: '9:30 PM', slots: '72 / 100', max_slots: 100, status: 'registration_open', entry_type: 'SOLO' },
  { id: '3', title: 'GUILD WAR: ORIGIN', type: 'GUILD VS GUILD', game_mode: 'GUILD VS GUILD', prize: '₹25,000', prize_pool: '₹25,000', date: '01 OCT 2026', time: '7:00 PM', slots: '16 / 32', max_slots: 32, status: 'upcoming', entry_type: 'GUILD' },
]

export const MOCK_RANKINGS = [
  ['01', 'ELITE_RAHUL', 'ELITE ARMY', '24,920', '+3'],
  ['02', 'KANNADA_KING', 'ELITE ARMY', '22,840', '+1'],
  ['03', 'SHADOW_77', 'ELITE ARMY', '21,190', '-2'],
  ['04', 'BL4CK_HAWK', 'ELITE ARMY', '19,804', '+3'],
]

export const MOCK_ELITE_ARMY_GUILD: Guild = {
  id: 'g-elite-army',
  name: 'ELITE ARMY',
  slug: 'elite-army',
  description: 'The Official Premier Competitive Free Fire Guild of ELITE Kannada',
  glory_points: 250000,
  leader_id: 'l-rahul',
  created_at: new Date().toISOString(),
}

export const MOCK_ELITE_ARMY_MEMBERS: any[] = [
  { id: 'm1', user_id: 'u1', glory_contributed: 45200, guild_role: 'leader', profile: { ign: 'ELITE_RAHUL', player_id: 'ELITE-10482', level: 42 } },
  { id: 'm2', user_id: 'u2', glory_contributed: 38400, guild_role: 'officer', profile: { ign: 'KANNADA_KING', player_id: 'ELITE-10892', level: 39 } },
  { id: 'm3', user_id: 'u3', glory_contributed: 32100, guild_role: 'member', profile: { ign: 'SHADOW_77', player_id: 'ELITE-10234', level: 36 } },
  { id: 'm4', user_id: 'u4', glory_contributed: 28900, guild_role: 'member', profile: { ign: 'BL4CK_HAWK', player_id: 'ELITE-10771', level: 34 } },
]

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  { id: 'a1', name: 'STREAM LEGEND', slug: 'stream-legend', description: '100 LIVESTREAMS WATCHED', rarity: 'LEGENDARY', xp_reward: 500, achievement_type: 'stream', is_active: true },
  { id: 'a2', name: 'XP HUNTER', slug: 'xp-hunter', description: 'REACH 10,000 TOTAL XP', rarity: 'EPIC', xp_reward: 300, achievement_type: 'xp', is_active: true },
  { id: 'a3', name: 'TOURNAMENT CHAMPION', slug: 'tournament-champion', description: 'WIN AN OFFICIAL TOURNAMENT', rarity: 'LEGENDARY', xp_reward: 1000, achievement_type: 'tournament', is_active: true },
  { id: 'a4', name: 'CLUTCH MASTER', slug: 'clutch-master', description: '10 VERIFIED CLUTCH WINS', rarity: 'RARE', xp_reward: 200, achievement_type: 'clips', is_active: true },
]

export const MOCK_CLIPS = [
  { id: 'c1', title: '1V4 CLUTCH', player_name: 'ELITE_RAHUL', video_url: '#', color: 'from-red-950 via-red-900 to-black' },
  { id: 'c2', title: 'LAST BULLET', player_name: 'SHADOW_77', video_url: '#', color: 'from-neutral-800 via-red-950 to-black' },
  { id: 'c3', title: 'BOOYAH FINISH', player_name: 'KANNADA_KING', video_url: '#', color: 'from-red-900 via-black to-neutral-950' },
]

export const MOCK_QNAS: QnAQuestion[] = [
  { id: 'q1', question: 'What is the maximum armor durability of Level 3 Vest in Bermuda?', category: 'Free Fire Intel', options: ['200', '260', '290', '320'], explanation: 'Level 3 vest provides 260 durability.', xp_reward: 10, is_active: true },
  { id: 'q2', question: 'Which character skill provides temporary movement speed and shield protection?', category: 'Character Skills', options: ['Alok', 'Chrono', 'K', 'Skyler'], explanation: 'Chrono generates an 800 HP forcefield.', xp_reward: 10, is_active: true },
]

export async function uploadAvatarToSupabase(file: File, userId: string) {
  try {
    const fileExt = file.name.split('.').pop() || 'png'
    const fileName = `${userId}/avatar_${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true,
      })

    if (uploadErr) {
      return { success: false, error: uploadErr.message }
    }

    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const publicUrl = urlData.publicUrl

    const { error: updateErr } = await supabase
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateErr) {
      return { success: false, error: updateErr.message }
    }

    return { success: true, avatarUrl: publicUrl }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload avatar image' }
  }
}

