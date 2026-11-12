import { createClient } from '@supabase/supabase-js'
import type {
  Profile,
  Tournament,
  TournamentRegistration,
  ArchivedTournamentTeamSnapshot,
  TournamentArchive,
  Guild,
  GuildMember,
  GuildChallenge,
  GuildChallengeStatus,
  XPTransaction,
  Achievement,
  QnAQuestion,
  CommunityClip,
  HomeCard,
  LeaderboardSection,
  TopTeamDetail,
} from './types'
import { canMemberChallengeTarget } from './guild-challenges'

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
      email: data.email || (currentUser && currentUser.id === uid ? currentUser.email : undefined),
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

    const { id, player_id, total_xp, level, role, email, free_fire_uid, ...rest } = updates as any
    const allowed: Record<string, any> = { ...rest }

    // Enforce immutable binding once Free Fire UID is set on a profile
    const { data: existingProf } = await supabase
      .from('profiles')
      .select('free_fire_uid')
      .eq('id', u.id)
      .maybeSingle()

    const currentBoundUid = (existingProf?.free_fire_uid || '').trim()
    const requestedUid = typeof free_fire_uid === 'string' ? free_fire_uid.trim() : undefined

    if (currentBoundUid) {
      if (requestedUid !== undefined && requestedUid !== currentBoundUid) {
        return {
          success: false,
          error: 'Your Free Fire UID is permanently bound to your registered email and cannot be changed.',
        }
      }
    } else if (requestedUid) {
      if (!/^\d+$/.test(requestedUid)) {
        return { success: false, error: 'Free Fire UID must contain numbers only.' }
      }
      const { data: uidOwner } = await supabase
        .from('profiles')
        .select('id')
        .eq('free_fire_uid', requestedUid)
        .neq('id', u.id)
        .maybeSingle()
      if (uidOwner) {
        return {
          success: false,
          error: `Free Fire UID "${requestedUid}" is already bound to another account.`,
        }
      }
      allowed.free_fire_uid = requestedUid
    }

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

function isMissingRpcError(err: any): boolean {
  if (!err) return false
  const msg = String(err.message || '').toLowerCase()
  return (
    err.code === '42883' ||
    err.code === 'PGRST202' ||
    msg.includes('could not find the function') ||
    msg.includes('does not exist')
  )
}

export async function registerWithEmailPasswordUid(params: {
  email: string
  password: string
  freeFireUid: string
}) {
  const cleanEmail = params.email.trim().toLowerCase()
  const cleanPassword = params.password || ''
  const cleanUid = params.freeFireUid.trim()

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (cleanPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters.' }
  }
  if (!cleanUid || !/^\d+$/.test(cleanUid)) {
    return { success: false, error: 'Free Fire UID must contain numbers only (digits 0-9).' }
  }

  // 1. Pre-check Email & UID uniqueness and binding
  try {
    const { data: bindCheck, error: bindErr } = await supabase.rpc('check_registration_binding', {
      p_email: cleanEmail,
      p_uid: cleanUid,
    })
    if (!bindErr && bindCheck && bindCheck.available === false) {
      return { success: false, error: bindCheck.message || 'Email or Free Fire UID is already registered.' }
    }
  } catch {
    // RPC may not be installed yet; client checks below still guard uniqueness
  }

  const { data: uidConflict } = await supabase
    .from('profiles')
    .select('id, free_fire_uid')
    .eq('free_fire_uid', cleanUid)
    .maybeSingle()

  if (uidConflict) {
    return {
      success: false,
      error: `Free Fire UID "${cleanUid}" is already registered and bound to another email. Please log in with that email and password.`,
    }
  }

  // Also check profiles.email if column exists
  try {
    const { data: emailConflict, error: emailColErr } = await supabase
      .from('profiles')
      .select('id, free_fire_uid')
      .ilike('email', cleanEmail)
      .maybeSingle()

    if (!emailColErr && emailConflict) {
      const boundUid = emailConflict.free_fire_uid?.trim()
      if (boundUid && boundUid !== cleanUid) {
        return {
          success: false,
          error: `This email is already bound to a different Free Fire UID (${boundUid}). Please log in with your email and password.`,
        }
      }
      return {
        success: false,
        error: 'An account with this email already exists. Please log in with your email and password.',
      }
    }
  } catch {
    // Ignore if email column has not been added yet
  }

  const defaultIgn = cleanEmail.split('@')[0] || `Player_${cleanUid}`
  let createdUserId: string | null = null
  let alreadyHasSession = false

  // 2. Register via dedicated Email+UID RPC first (auto-confirms & binds at DB layer)
  const { data: rpcReg, error: rpcRegErr } = await supabase.rpc('register_with_email_and_uid', {
    p_email: cleanEmail,
    p_password: cleanPassword,
    p_uid: cleanUid,
    p_ign: defaultIgn,
  })

  if (!rpcRegErr && rpcReg) {
    if (rpcReg.success === false) {
      return { success: false, error: rpcReg.error || 'Registration failed.' }
    }
    createdUserId = rpcReg.user_id || null
  } else if (!rpcRegErr || isMissingRpcError(rpcRegErr)) {
    // Fallback A: existing create_player_account RPC with real email + password + UID
    const { data: legacyRpc, error: legacyRpcErr } = await supabase.rpc('create_player_account', {
      p_email: cleanEmail,
      p_password: cleanPassword,
      p_ign: defaultIgn,
      p_uid: cleanUid,
    })

    if (!legacyRpcErr && (!legacyRpc || legacyRpc.success !== false)) {
      createdUserId =
        (typeof legacyRpc === 'string' ? legacyRpc : null) ||
        legacyRpc?.user_id ||
        legacyRpc?.id ||
        null
    } else {
      const legacyMsg =
        legacyRpcErr?.message || (legacyRpc && legacyRpc.success === false ? legacyRpc.error : '') || ''
      if (legacyMsg.includes('UID_ALREADY_EXISTS')) {
        return {
          success: false,
          error: `Free Fire UID "${cleanUid}" is already bound to an account. Please log in with your email and password.`,
        }
      }
      if (
        legacyMsg.toLowerCase().includes('already') ||
        legacyMsg.toLowerCase().includes('duplicate')
      ) {
        return {
          success: false,
          error: 'This email or Free Fire UID is already registered. Please log in instead.',
        }
      }

      // Fallback B: standard Supabase signUp
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password: cleanPassword,
        options: {
          data: {
            email: cleanEmail,
            free_fire_uid: cleanUid,
            ign: defaultIgn,
            username: defaultIgn,
          },
        },
      })

      if (authErr) {
        const msg = authErr.message || ''
        if (msg.toLowerCase().includes('already registered')) {
          return {
            success: false,
            error: 'This email is already registered and bound to an account. Please log in with your email and password.',
          }
        }
        return { success: false, error: msg || 'Failed to create account.' }
      }

      createdUserId = authData.user?.id || null
      alreadyHasSession = Boolean(authData.session)

      // If email confirmation is enabled on Supabase Auth and no session was returned
      if (authData.user && !authData.session) {
        return {
          success: false,
          error:
            'Account created! Please check your email inbox to confirm your email address, then sign in with your Email & Password.',
        }
      }
    }
  } else {
    return {
      success: false,
      error: rpcRegErr?.message || 'Failed to register account.',
    }
  }

  // 3. Sign in with the newly registered Email & Password if not already signed in
  let activeUserId = createdUserId
  if (!alreadyHasSession) {
    const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: cleanPassword,
    })

    if (loginErr || !loginData.user) {
      return {
        success: false,
        error: loginErr?.message || 'Account created, please log in with your email and password.',
      }
    }
    activeUserId = loginData.user.id
  }

  // 4. Bind free_fire_uid (and email if column exists) on profile
  if (activeUserId) {
    const { error: bindErr } = await supabase
      .from('profiles')
      .update({
        free_fire_uid: cleanUid,
        email: cleanEmail,
      })
      .eq('id', activeUserId)

    if (bindErr && (bindErr.message?.includes('email') || bindErr.code === '42703')) {
      await supabase
        .from('profiles')
        .update({ free_fire_uid: cleanUid })
        .eq('id', activeUserId)
    }
  }

  const profile = await getUserProfile(activeUserId || undefined)
  await trackPageVisit(true)
  return {
    success: true,
    profile,
    role: profile?.role === 'admin' ? 'admin' : 'user',
  }
}

export async function loginWithEmailAndPassword(email: string, password: string) {
  const cleanEmail = email.trim().toLowerCase()
  const cleanPassword = password || ''

  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { success: false, error: 'Please enter a valid email address.' }
  }
  if (!cleanPassword) {
    return { success: false, error: 'Password is required.' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password: cleanPassword,
  })

  if (error || !data.user) {
    const msg = error?.message || ''
    if (msg.toLowerCase().includes('invalid login credentials')) {
      return {
        success: false,
        error: 'Invalid email or password. If you are new, switch to Register first.',
      }
    }
    return { success: false, error: msg || 'Failed to sign in.' }
  }

  // Backfill profile binding if missing on legacy rows
  const metaUid = String(data.user.user_metadata?.free_fire_uid || '').trim()
  const { data: existingProf } = await supabase
    .from('profiles')
    .select('free_fire_uid')
    .eq('id', data.user.id)
    .maybeSingle()

  if (existingProf && !existingProf.free_fire_uid && metaUid) {
    await supabase
      .from('profiles')
      .update({ free_fire_uid: metaUid })
      .eq('id', data.user.id)
  }

  const profile = await getUserProfile(data.user.id)
  await trackPageVisit(true)

  return {
    success: true,
    profile,
    role: profile?.role === 'admin' ? 'admin' : 'user',
  }
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
    // 1. Registered Players (actual registered accounts in profiles only — never tournament registrations)
    const uniqueUids = new Set<string>()

    const { data: profiles } = await supabase.from('profiles').select('id, free_fire_uid, player_id')
    if (profiles) {
      for (const p of profiles) {
        const uid = (p.free_fire_uid || p.player_id || p.id || '').trim()
        if (uid) uniqueUids.add(uid)
      }
    }

    const totalRegistrations = uniqueUids.size

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
    const [{ data, error }, archives] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, tournament_registrations(id)')
        .order('tournament_start', { ascending: true }),
      fetchTournamentArchives(),
    ])

    if (error && archives.length === 0) {
      return []
    }

    const archiveMap = new Map<string, TournamentArchive>(
      archives.map((a) => [a.tournament_id, a])
    )
    const seenIds = new Set<string>()

    const merged = (data || []).map((t: any) => {
      seenIds.add(t.id)
      const archive = archiveMap.get(t.id)
      let localOverride: any = null
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(`tourney_media_${t.id}`)
          if (raw) localOverride = JSON.parse(raw)
        } catch {}
      }

      const top3FromTourney =
        localOverride?.top_3_teams && localOverride.top_3_teams.length > 0
          ? localOverride.top_3_teams
          : t.top_3_teams && t.top_3_teams.length > 0
            ? t.top_3_teams
            : archive?.top_3_teams

      const champImg =
        localOverride?.champions_image_url ||
        t.champions_image_url ||
        top3FromTourney?.[0]?.champions_image_url ||
        archive?.champions_image_url ||
        undefined

      const bgmUrl =
        localOverride?.results_bgm_url ||
        t.results_bgm_url ||
        top3FromTourney?.[0]?.results_bgm_url ||
        archive?.results_bgm_url ||
        undefined

      const liveSlots = Array.isArray(t.tournament_registrations)
        ? t.tournament_registrations.length
        : (t.slots_filled || 0)

      const archivedSlots =
        archive?.slots_filled || archive?.registrations_snapshot?.length || 0

      return {
        ...t,
        slots_filled: Math.max(liveSlots, archivedSlots),
        champions_image_url: champImg,
        results_bgm_url: bgmUrl,
        top_3_teams: top3FromTourney,
      }
    })

    // Include any archived completed tournaments whose row is no longer in `tournaments`
    for (const arch of archives) {
      if (!seenIds.has(arch.tournament_id)) {
        merged.push({
          id: arch.tournament_id,
          title: arch.title,
          slug: arch.slug || arch.tournament_id,
          description: arch.description,
          banner_url: arch.banner_url,
          game_mode: arch.game_mode,
          map: arch.map,
          tournament_type: (arch.tournament_type as any) || 'FREE',
          entry_type: (arch.entry_type as any) || 'SQUAD',
          prize_pool: arch.prize_pool,
          max_slots: arch.max_slots,
          slots_filled: arch.slots_filled || arch.registrations_snapshot?.length || 0,
          registration_start: arch.archived_at,
          tournament_start: arch.tournament_start,
          status: (arch.status as any) || 'completed',
          rules: arch.rules,
          champions_image_url: arch.champions_image_url,
          results_bgm_url: arch.results_bgm_url,
          top_3_teams: arch.top_3_teams,
          created_at: arch.archived_at,
        })
      }
    }

    return merged
  } catch {
    return []
  }
}

// Team Registration with Strict Duplicate Free Fire UID Prevention & Field Validations
export async function registerTournamentTeam(regData: {
  tournamentId: string
  captainName: string
  captainUid: string
  phone: string
  teamName?: string
  teammateUids?: string[]
  teammateNames?: string[]
  isAdmin?: boolean
}) {
  try {
    const cleanCaptainName = regData.captainName?.trim() || ''
    const cleanCaptainUid = regData.captainUid?.trim() || ''
    const cleanPhone = regData.phone?.trim() || (regData.isAdmin ? '+91 9000000000' : '')
    const cleanTeamName = regData.teamName?.trim() || cleanCaptainName

    // 1. All required fields must be non-empty
    if (!cleanCaptainName) {
      return { success: false, error: 'Captain Gamer Name (IGN) cannot be empty.' }
    }
    if (!cleanCaptainUid) {
      return { success: false, error: 'Captain Free Fire UID cannot be empty.' }
    }
    if (!cleanPhone) {
      return { success: false, error: 'Phone number / WhatsApp cannot be empty.' }
    }
    if (!cleanTeamName) {
      return { success: false, error: 'Team / Squad name cannot be empty.' }
    }

    // 2. UID must contain numbers only
    if (!/^\d+$/.test(cleanCaptainUid)) {
      return { success: false, error: 'Captain Free Fire UID must contain numbers only (digits 0-9).' }
    }

    // Process teammates
    const rawTmUids = regData.teammateUids || []
    const rawTmNames = regData.teammateNames || []
    const cleanTeammateUids: string[] = []
    const cleanTeammateNames: string[] = []

    for (let i = 0; i < rawTmUids.length; i++) {
      const tUid = (rawTmUids[i] || '').trim()
      const tName = (rawTmNames[i] || '').trim()

      if (!tName || !tUid) {
        return { success: false, error: `Teammate ${i + 1} details cannot be empty. Both Name and UID are required.` }
      }
      if (!/^\d+$/.test(tUid)) {
        return { success: false, error: `Teammate ${i + 1} UID ("${tUid}") must contain numbers only (digits 0-9).` }
      }
      cleanTeammateUids.push(tUid)
      cleanTeammateNames.push(tName)
    }

    // 3. Internal duplicate check within this team
    const allSubmittedUids = [cleanCaptainUid, ...cleanTeammateUids]
    const seenUids = new Set<string>()
    for (const uid of allSubmittedUids) {
      if (seenUids.has(uid)) {
        return {
          success: false,
          error: `Duplicate Free Fire UID (${uid}) detected within your team. Each player must have a unique UID.`,
        }
      }
      seenUids.add(uid)
    }

    // 4. Cross-team check: If a player is already registered in any team for this tournament, reject
    const { data: existingRegs, error: fetchErr } = await supabase
      .from('tournament_registrations')
      .select('id, team_name, captain_name, captain_free_fire_uid, teammate_names, teammate_uids, user_id')
      .eq('tournament_id', regData.tournamentId)

    if (fetchErr) {
      console.warn('Error fetching existing registrations for duplicate check:', fetchErr.message)
    }

    const u = await getCurrentUser()
    let userId = u ? u.id : null

    if (existingRegs && existingRegs.length > 0) {
      for (const reg of existingRegs) {
        const teamLabel = reg.team_name || reg.captain_name || 'an existing team'
        const existingUidsInReg = [
          reg.captain_free_fire_uid?.trim(),
          ...(Array.isArray(reg.teammate_uids) ? reg.teammate_uids.map((t: any) => String(t).trim()) : []),
        ].filter(Boolean) as string[]

        for (const submittedUid of allSubmittedUids) {
          if (existingUidsInReg.includes(submittedUid)) {
            // If not admin, block duplicate UID registration across teams
            if (!regData.isAdmin) {
              return {
                success: false,
                error: `Player with Free Fire UID "${submittedUid}" is already registered in team "${teamLabel}" for this tournament! A player cannot register in a second team.`,
              }
            }
          }
        }

        // Only block duplicate user account for regular players. Admins can register multiple teams!
        if (!regData.isAdmin && userId && reg.user_id === userId) {
          return {
            success: false,
            error: `You are already registered for this tournament under team "${teamLabel}". A player cannot register in a second team!`,
          }
        }
      }
    }

    // For admin manual registrations:
    // Lookup if the captain has a profile by UID. If so, link to that player profile, otherwise null
    if (regData.isAdmin) {
      try {
        const { data: playerProf } = await supabase
          .from('profiles')
          .select('id')
          .eq('free_fire_uid', cleanCaptainUid)
          .maybeSingle()
        userId = playerProf?.id || null
      } catch {
        userId = null
      }
    }

    // 5. Direct table insertion
    const { data: directData, error: directError } = await supabase
      .from('tournament_registrations')
      .insert([
        {
          tournament_id: regData.tournamentId,
          user_id: userId,
          team_name: cleanTeamName,
          captain_name: cleanCaptainName,
          captain_free_fire_uid: cleanCaptainUid,
          phone_number: cleanPhone,
          teammate_names: cleanTeammateNames,
          teammate_uids: cleanTeammateUids,
          registration_status: 'confirmed',
          result_verified: false,
        },
      ])
      .select()

    if (directError) {
      return { success: false, error: directError.message || 'Failed to register team' }
    }

    return {
      success: true,
      message: `Team "${cleanTeamName}" registered successfully for this tournament!`,
      data: directData?.[0],
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'An error occurred during registration.' }
  }
}

function mapArchivedSnapshotToRegistration(
  snap: ArchivedTournamentTeamSnapshot
): TournamentRegistration {
  return {
    id: snap.id,
    tournament_id: snap.tournament_id,
    user_id: null,
    team_name: snap.team_name,
    captain_name: snap.captain_name,
    captain_free_fire_uid: snap.captain_free_fire_uid,
    teammate_uids: snap.teammate_uids || [],
    teammate_names: snap.teammate_names || [],
    registration_status: snap.registration_status || 'confirmed',
    registered_at: snap.registered_at,
    placement: snap.placement ?? undefined,
    kills: snap.kills ?? 0,
    result_verified: Boolean(snap.result_verified),
  }
}

export async function fetchTournamentRegistrationsForAdmin(tournamentId: string): Promise<TournamentRegistration[]> {
  try {
    const [{ data, error }, archive] = await Promise.all([
      supabase
        .from('tournament_registrations')
        .select('*, profiles(ign, player_id)')
        .eq('tournament_id', tournamentId),
      fetchTournamentArchiveByTournamentId(tournamentId),
    ])

    const liveRows = (!error && Array.isArray(data) ? data : []) as TournamentRegistration[]
    const snapshotRows = (archive?.registrations_snapshot || []).map(mapArchivedSnapshotToRegistration)

    if (liveRows.length === 0) {
      return snapshotRows
    }
    if (snapshotRows.length === 0) {
      return liveRows
    }

    // Merge live rows + any snapshot rows whose registrations were pruned
    const seenIds = new Set(liveRows.map((r) => r.id))
    const combined = [...liveRows]
    for (const snap of snapshotRows) {
      if (!seenIds.has(snap.id)) {
        combined.push(snap)
      }
    }
    return combined
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
    if (data && data.length > 0) {
      return { success: true, data: data[0] }
    }

    // Fallback for static archived completed tournaments whose live registrations were pruned
    const archives = await fetchTournamentArchives()
    for (const arch of archives) {
      const snaps = Array.isArray(arch.registrations_snapshot) ? arch.registrations_snapshot : []
      const idx = snaps.findIndex((s) => s.id === registrationId)
      if (idx >= 0) {
        const updatedTeam = {
          ...snaps[idx],
          placement,
          kills,
          result_verified: true,
        }
        const nextSnaps = [...snaps]
        nextSnaps[idx] = updatedTeam
        const nowIso = new Date().toISOString()

        await supabase
          .from('tournament_archives')
          .update({ registrations_snapshot: nextSnaps, updated_at: nowIso })
          .eq('tournament_id', arch.tournament_id)

        const settingList = await fetchSiteSettingJson<TournamentArchive[]>(ARCHIVED_TOURNAMENTS_KEY, [])
        if (Array.isArray(settingList)) {
          const nextSettings = settingList.map((item) =>
            item.tournament_id === arch.tournament_id
              ? { ...item, registrations_snapshot: nextSnaps, updated_at: nowIso }
              : item
          )
          await updateSiteSettingJson(ARCHIVED_TOURNAMENTS_KEY, nextSettings)
        }
        return { success: true, data: updatedTeam }
      }
    }

    return { success: false, error: 'Registration record not found.' }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateTournamentTop3AndResults(
  tournamentId: string,
  top3: TopTeamDetail[],
  status: string = 'completed',
  extra?: { championsImageUrl?: string; resultsBgmUrl?: string }
) {
  try {
    // Always persist media URLs in top_3_teams[0] for guaranteed JSONB compatibility
    if (top3 && top3.length > 0) {
      if (extra?.championsImageUrl) top3[0].champions_image_url = extra.championsImageUrl
      if (extra?.resultsBgmUrl) top3[0].results_bgm_url = extra.resultsBgmUrl
    }

    // Save instant local override so changes reflect immediately across all tabs
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          `tourney_media_${tournamentId}`,
          JSON.stringify({
            champions_image_url: extra?.championsImageUrl,
            results_bgm_url: extra?.resultsBgmUrl,
            top_3_teams: top3,
            status,
            updated_at: Date.now(),
          })
        )
        window.dispatchEvent(new Event('tournaments_updated'))
      } catch {}
    }

    const updatePayload: any = {
      top_3_teams: top3,
      status,
    }
    if (extra?.championsImageUrl !== undefined) {
      updatePayload.champions_image_url = extra.championsImageUrl
    }
    if (extra?.resultsBgmUrl !== undefined) {
      updatePayload.results_bgm_url = extra.resultsBgmUrl
    }

    let { data, error } = await supabase
      .from('tournaments')
      .update(updatePayload)
      .eq('id', tournamentId)
      .select()

    // If an error occurred due to missing columns in DB schema, fallback safely
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      console.warn('Tournament column mismatch in database, saving media info inside top_3_teams payload:', error.message)
      const safePayload: any = {
        top_3_teams: top3,
        status,
      }
      const retry = await supabase
        .from('tournaments')
        .update(safePayload)
        .eq('id', tournamentId)
        .select()
      data = retry.data
      error = retry.error
    }

    if (error) {
      console.warn('Remote Supabase update notice:', error.message)
      if (status === 'completed') {
        await archiveCompletedTournament(tournamentId)
      }
      // If network/remote error occurs, local storage was already updated, so return success for user flow
      return { success: true, data: { id: tournamentId, top_3_teams: top3 } }
    }
    if (status === 'completed') {
      await archiveCompletedTournament(tournamentId)
    }
    return { success: true, data: data?.[0] }
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

export async function fetchUserTournamentRegistrations(userId?: string, freeFireUid?: string): Promise<TournamentRegistration[]> {
  try {
    let uid = userId
    let ffUid = freeFireUid?.trim()
    if (!uid) {
      const u = await getCurrentUser()
      if (u) uid = u.id
    }
    if (!ffUid && uid) {
      const prof = await getUserProfile(uid)
      if (prof?.free_fire_uid) ffUid = prof.free_fire_uid.trim()
    }

    const { data, error } = await supabase
      .from('tournament_registrations')
      .select('*, tournaments(*)')

    if (error || !data) return []
    if (!uid && !ffUid) return []

    return data.filter((r: any) => {
      if (uid && r.user_id === uid) return true
      // Do not match unlinked/archived completed tournament rows to newly registered UIDs
      if (r.tournaments?.status === 'completed' || r.user_id === null) return false
      if (ffUid) {
        if (r.captain_free_fire_uid && r.captain_free_fire_uid.trim() === ffUid) return true
        if (Array.isArray(r.teammate_uids) && r.teammate_uids.some((t: any) => String(t).trim() === ffUid)) return true
      }
      return false
    })
  } catch {
    return []
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
    return fetchUserTournamentRegistrations(uid)
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
    // Only fetch active registered user profiles — never pull tournament_registrations into Leaderboard
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, player_id, username, ign, free_fire_uid, avatar_url, login_streak, longest_login_streak, last_login_date, total_xp, level, guild_id, guilds!fk_profiles_guild(name)')
      .eq('is_public', true)
      .order('login_streak', { ascending: false })
      .order('longest_login_streak', { ascending: false })
      .order('total_xp', { ascending: false })

    const playerMap = new Map<string, any>()

    // Add profiles keyed by UID or ID
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
          xp: p.total_xp ?? 0,
          level: p.level || 1,
        })
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
      return allPlayers.map((item, index) => {
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
    }
  } catch (err) {
    console.error('[fetchRankings] Error:', err)
  }

  return []
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
  avatar_url?: string | null
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
    const [{ data: profiles }, archives] = await Promise.all([
      supabase
        .from('profiles')
        .select('free_fire_uid, ign, username, player_id, avatar_url'),
      fetchTournamentArchives(),
    ])

    // Seed archived avatars first so live profile avatars take priority when both exist
    for (const arch of archives) {
      if (arch.player_avatars && typeof arch.player_avatars === 'object') {
        for (const [k, url] of Object.entries(arch.player_avatars)) {
          if (k && typeof url === 'string' && url.trim() !== '') {
            avatarMap.set(k.trim().toLowerCase(), url)
          }
        }
      }
      if (Array.isArray(arch.registrations_snapshot)) {
        for (const team of arch.registrations_snapshot) {
          if (team.captain_avatar_url) {
            if (team.captain_free_fire_uid) {
              avatarMap.set(team.captain_free_fire_uid.trim().toLowerCase(), team.captain_avatar_url)
            }
            if (team.captain_name) {
              avatarMap.set(team.captain_name.trim().toLowerCase(), team.captain_avatar_url)
            }
          }
          if (Array.isArray(team.teammate_avatar_urls)) {
            team.teammate_avatar_urls.forEach((url, idx) => {
              if (!url) return
              const tUid = team.teammate_uids?.[idx]
              const tName = team.teammate_names?.[idx]
              if (tUid) avatarMap.set(String(tUid).trim().toLowerCase(), url)
              if (tName) avatarMap.set(String(tName).trim().toLowerCase(), url)
            })
          }
        }
      }
    }

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

// ==========================================
// COMPLETED TOURNAMENT ARCHIVE & SAFE USER PURGE
// ==========================================

const ARCHIVED_TOURNAMENTS_KEY = 'archived_tournaments'

function mergeArchivePair(primary: TournamentArchive, fallback: TournamentArchive): TournamentArchive {
  const primRegs = Array.isArray(primary.registrations_snapshot) ? primary.registrations_snapshot : []
  const fallRegs = Array.isArray(fallback.registrations_snapshot) ? fallback.registrations_snapshot : []
  const regs = primRegs.length >= fallRegs.length ? primRegs : fallRegs

  const primTop3 = Array.isArray(primary.top_3_teams) ? primary.top_3_teams : []
  const fallTop3 = Array.isArray(fallback.top_3_teams) ? fallback.top_3_teams : []
  const top3 = primTop3.length > 0 ? primTop3 : fallTop3

  return {
    ...fallback,
    ...primary,
    champions_image_url: primary.champions_image_url || fallback.champions_image_url,
    results_bgm_url: primary.results_bgm_url || fallback.results_bgm_url,
    top_3_teams: top3,
    registrations_snapshot: regs,
    slots_filled: Math.max(primary.slots_filled || 0, fallback.slots_filled || 0, regs.length),
    player_avatars: {
      ...(fallback.player_avatars || {}),
      ...(primary.player_avatars || {}),
    },
    league_snapshot: primary.league_snapshot || fallback.league_snapshot || null,
    playoff_snapshot: primary.playoff_snapshot || fallback.playoff_snapshot || null,
  }
}

export async function fetchTournamentArchives(): Promise<TournamentArchive[]> {
  const byTournamentId = new Map<string, TournamentArchive>()

  try {
    const settingList = await fetchSiteSettingJson<TournamentArchive[]>(ARCHIVED_TOURNAMENTS_KEY, [])
    if (Array.isArray(settingList)) {
      for (const item of settingList) {
        if (item && item.tournament_id) {
          byTournamentId.set(item.tournament_id, item)
        }
      }
    }
  } catch {
    // ignore site_settings fallback errors
  }

  try {
    const { data, error } = await supabase
      .from('tournament_archives')
      .select('*')
      .order('tournament_start', { ascending: false })

    if (!error && Array.isArray(data)) {
      for (const row of data as TournamentArchive[]) {
        if (!row?.tournament_id) continue
        const existing = byTournamentId.get(row.tournament_id)
        byTournamentId.set(row.tournament_id, existing ? mergeArchivePair(row, existing) : row)
      }
    } else if (error && !isMissingRelationError(error)) {
      console.warn('fetchTournamentArchives notice:', error.message)
    }
  } catch {
    // ignore
  }

  return Array.from(byTournamentId.values()).sort(
    (a, b) => new Date(b.tournament_start || b.archived_at).getTime() - new Date(a.tournament_start || a.archived_at).getTime()
  )
}

export async function fetchTournamentArchiveByTournamentId(
  tournamentId: string
): Promise<TournamentArchive | null> {
  if (!tournamentId) return null
  const all = await fetchTournamentArchives()
  return all.find((a) => a.tournament_id === tournamentId) || null
}

export async function archiveCompletedTournament(
  tournamentId: string
): Promise<{ success: boolean; archive?: TournamentArchive; error?: string }> {
  try {
    if (!tournamentId) {
      return { success: false, error: 'Tournament ID is required.' }
    }

    // Attempt SQL archival helper first if installed
    try {
      await supabase.rpc('archive_completed_tournament', { p_tournament_id: tournamentId })
    } catch {
      // Optional RPC not installed yet — continue cleanly with client/app archival
    }

    const [{ data: tRow, error: tErr }, { data: regRows }, existingArchive, { data: profRows }] =
      await Promise.all([
        supabase.from('tournaments').select('*').eq('id', tournamentId).maybeSingle(),
        supabase.from('tournament_registrations').select('*').eq('tournament_id', tournamentId),
        fetchTournamentArchiveByTournamentId(tournamentId),
        supabase
          .from('profiles')
          .select('free_fire_uid, ign, username, player_id, avatar_url'),
      ])

    if (tErr && !existingArchive) {
      return { success: false, error: tErr.message }
    }

    const baseTourney = tRow || existingArchive
    if (!baseTourney) {
      return { success: false, error: 'Tournament record not found.' }
    }

    // Build avatar lookup map preserving previously archived avatars too
    const avatarLookup: Record<string, string> = {
      ...(existingArchive?.player_avatars || {}),
    }
    if (Array.isArray(profRows)) {
      for (const p of profRows) {
        if (!p.avatar_url || p.avatar_url.trim() === '') continue
        if (p.free_fire_uid) avatarLookup[p.free_fire_uid.trim().toLowerCase()] = p.avatar_url
        if (p.ign) avatarLookup[p.ign.trim().toLowerCase()] = p.avatar_url
        if (p.username) avatarLookup[p.username.trim().toLowerCase()] = p.avatar_url
        if (p.player_id) avatarLookup[p.player_id.trim().toLowerCase()] = p.avatar_url
      }
    }

    const resolveAvatar = (uid?: string | null, name?: string | null): string | null => {
      if (uid && avatarLookup[uid.trim().toLowerCase()]) {
        return avatarLookup[uid.trim().toLowerCase()]
      }
      if (name && avatarLookup[name.trim().toLowerCase()]) {
        return avatarLookup[name.trim().toLowerCase()]
      }
      return null
    }

    const liveRegs = Array.isArray(regRows) ? regRows : []
    const existingSnaps = Array.isArray(existingArchive?.registrations_snapshot)
      ? existingArchive.registrations_snapshot
      : []

    const teamSnapshots: ArchivedTournamentTeamSnapshot[] =
      liveRegs.length > 0
        ? liveRegs
            .slice()
            .sort((a: any, b: any) => (a.placement ?? 9999) - (b.placement ?? 9999))
            .map((r: any) => {
              const tUids = Array.isArray(r.teammate_uids) ? r.teammate_uids : []
              const tNames = Array.isArray(r.teammate_names) ? r.teammate_names : []
              return {
                id: r.id,
                tournament_id: r.tournament_id,
                team_name: r.team_name,
                captain_name: r.captain_name,
                captain_free_fire_uid: r.captain_free_fire_uid,
                teammate_uids: tUids,
                teammate_names: tNames,
                registration_status: r.registration_status || 'confirmed',
                registered_at: r.registered_at || r.created_at || new Date().toISOString(),
                placement: r.placement ?? null,
                kills: r.kills ?? 0,
                result_verified: Boolean(r.result_verified),
                captain_avatar_url: resolveAvatar(r.captain_free_fire_uid, r.captain_name),
                teammate_avatar_urls: tNames.map((n: string, idx: number) =>
                  resolveAvatar(tUids[idx], n)
                ),
              }
            })
        : existingSnaps

    // Capture full league & playoff snapshots (seasons, teams, pairings, results) so archived data works statically
    let leagueSnapshot = existingArchive?.league_snapshot || null
    let playoffSnapshot = existingArchive?.playoff_snapshot || null
    try {
      const { data: seasons } = await supabase
        .from('league_seasons')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('season_number', { ascending: true })
      if (Array.isArray(seasons) && seasons.length > 0) {
        const seasonIds = seasons.map((s: any) => s.id)
        const [{ data: lTeams }, { data: lPairings }, { data: lResults }] = await Promise.all([
          supabase
            .from('league_season_teams')
            .select('*, tournament_registrations(id, team_name, captain_name)')
            .in('season_id', seasonIds),
          supabase
            .from('league_pairings')
            .select('*')
            .in('season_id', seasonIds)
            .order('round_number', { ascending: true })
            .order('match_number', { ascending: true }),
          supabase.from('league_match_results').select('*').in('season_id', seasonIds),
        ])

        const teamsBySeason: Record<string, any[]> = {}
        for (const row of lTeams || []) {
          const reg = (row as any).tournament_registrations || {}
          const list = teamsBySeason[row.season_id] || []
          list.push({
            id: row.id,
            season_id: row.season_id,
            registration_id: row.registration_id,
            status: row.status,
            team_name: reg.team_name || reg.captain_name || 'Unnamed Team',
            captain_name: reg.captain_name || null,
            created_at: row.created_at,
          })
          teamsBySeason[row.season_id] = list
        }

        const pairingsBySeason: Record<string, any[]> = {}
        for (const p of lPairings || []) {
          const list = pairingsBySeason[p.season_id] || []
          list.push(p)
          pairingsBySeason[p.season_id] = list
        }

        const resultsBySeason: Record<string, any[]> = {}
        for (const r of lResults || []) {
          const list = resultsBySeason[r.season_id] || []
          list.push(r)
          resultsBySeason[r.season_id] = list
        }

        leagueSnapshot = {
          seasons,
          teamsBySeason:
            Object.keys(teamsBySeason).length > 0
              ? teamsBySeason
              : existingArchive?.league_snapshot?.teamsBySeason || {},
          pairingsBySeason:
            Object.keys(pairingsBySeason).length > 0
              ? pairingsBySeason
              : existingArchive?.league_snapshot?.pairingsBySeason || {},
          resultsBySeason:
            Object.keys(resultsBySeason).length > 0
              ? resultsBySeason
              : existingArchive?.league_snapshot?.resultsBySeason || {},
        }

        const playoffsBySeason: Record<string, any> = {
          ...(existingArchive?.playoff_snapshot || {}),
        }
        for (const s of seasons) {
          const bracket = await fetchSiteSettingJson<any>(`league_playoffs_${s.id}`, null)
          if (bracket) playoffsBySeason[s.id] = bracket
        }
        if (Object.keys(playoffsBySeason).length > 0) {
          playoffSnapshot = playoffsBySeason
        }
      }
    } catch {
      // Optional league tables may not exist
    }

    const nowIso = new Date().toISOString()
    const top3 =
      Array.isArray((tRow as any)?.top_3_teams) && (tRow as any).top_3_teams.length > 0
        ? (tRow as any).top_3_teams
        : existingArchive?.top_3_teams || []

    const archiveRecord: TournamentArchive = {
      id: existingArchive?.id || tournamentId,
      tournament_id: tournamentId,
      title: baseTourney.title,
      slug: baseTourney.slug,
      description: baseTourney.description,
      banner_url: baseTourney.banner_url,
      game_mode: baseTourney.game_mode,
      map: baseTourney.map,
      tournament_type: baseTourney.tournament_type,
      entry_type: baseTourney.entry_type,
      prize_pool: baseTourney.prize_pool,
      max_slots: baseTourney.max_slots || 100,
      slots_filled: Math.max(teamSnapshots.length, existingArchive?.slots_filled || 0),
      tournament_start: baseTourney.tournament_start,
      status: baseTourney.status || 'completed',
      rules: baseTourney.rules,
      champions_image_url:
        (tRow as any)?.champions_image_url ||
        top3?.[0]?.champions_image_url ||
        existingArchive?.champions_image_url,
      results_bgm_url:
        (tRow as any)?.results_bgm_url ||
        top3?.[0]?.results_bgm_url ||
        existingArchive?.results_bgm_url,
      top_3_teams: top3,
      registrations_snapshot: teamSnapshots,
      player_avatars: avatarLookup,
      league_snapshot: leagueSnapshot,
      playoff_snapshot: playoffSnapshot,
      archived_at: existingArchive?.archived_at || nowIso,
      updated_at: nowIso,
    }

    // 1. Upsert into dedicated tournament_archives table (if migrated)
    try {
      const { error: upErr } = await supabase
        .from('tournament_archives')
        .upsert(
          [
            {
              tournament_id: archiveRecord.tournament_id,
              title: archiveRecord.title,
              slug: archiveRecord.slug,
              description: archiveRecord.description,
              banner_url: archiveRecord.banner_url,
              game_mode: archiveRecord.game_mode,
              map: archiveRecord.map,
              tournament_type: archiveRecord.tournament_type,
              entry_type: archiveRecord.entry_type,
              prize_pool: archiveRecord.prize_pool,
              max_slots: archiveRecord.max_slots,
              slots_filled: archiveRecord.slots_filled,
              tournament_start: archiveRecord.tournament_start,
              status: archiveRecord.status,
              rules: archiveRecord.rules,
              champions_image_url: archiveRecord.champions_image_url,
              results_bgm_url: archiveRecord.results_bgm_url,
              top_3_teams: archiveRecord.top_3_teams || [],
              registrations_snapshot: archiveRecord.registrations_snapshot,
              player_avatars: archiveRecord.player_avatars || {},
              league_snapshot: archiveRecord.league_snapshot,
              playoff_snapshot: archiveRecord.playoff_snapshot,
              updated_at: nowIso,
            },
          ],
          { onConflict: 'tournament_id' }
        )

      if (upErr && !isMissingRelationError(upErr)) {
        console.warn('tournament_archives upsert notice:', upErr.message)
      }
    } catch {
      // ignore table upsert errors and keep site_settings backup
    }

    // 2. Always persist backup in site_settings (`archived_tournaments`)
    const existingList = await fetchSiteSettingJson<TournamentArchive[]>(ARCHIVED_TOURNAMENTS_KEY, [])
    const nextList = Array.isArray(existingList)
      ? existingList.filter((item) => item.tournament_id !== tournamentId)
      : []
    nextList.unshift(archiveRecord)
    await updateSiteSettingJson(ARCHIVED_TOURNAMENTS_KEY, nextList)

    // 3. Best-effort unlink user_id on completed tournament registrations
    if (liveRegs.length > 0 && archiveRecord.status === 'completed') {
      try {
        await supabase
          .from('tournament_registrations')
          .update({ user_id: null })
          .eq('tournament_id', tournamentId)
      } catch {
        // Fails softly if FK NOT NULL still exists until SQL migration is applied
      }
    }

    return { success: true, archive: archiveRecord }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to archive tournament' }
  }
}

export async function archiveAllCompletedTournaments(): Promise<{
  success: boolean
  count: number
  archives: TournamentArchive[]
  error?: string
}> {
  try {
    const { data: completedRows, error } = await supabase
      .from('tournaments')
      .select('id')
      .eq('status', 'completed')

    if (error) {
      return { success: false, count: 0, archives: [], error: error.message }
    }

    const archives: TournamentArchive[] = []
    for (const row of completedRows || []) {
      const res = await archiveCompletedTournament(row.id)
      if (res.success && res.archive) {
        archives.push(res.archive)
      }
    }
    return { success: true, count: archives.length, archives }
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      archives: [],
      error: err?.message || 'Failed to archive completed tournaments',
    }
  }
}

export async function fetchUserCleanupStats(): Promise<{
  totalProfiles: number
  adminProfiles: number
  nonAdminProfiles: number
  staleHonors: number
  staleAchievements: number
}> {
  try {
    const [{ data: profiles }, { data: adminRoles }, { data: honors }, { data: achs }] =
      await Promise.all([
        supabase.from('profiles').select('id, free_fire_uid, ign, username'),
        supabase.from('user_roles').select('user_id').eq('role', 'admin'),
        supabase.from('player_honors').select('id, player_uid'),
        supabase.from('achievements').select('id, player_uid, player_name'),
      ])

    const adminIdSet = new Set((adminRoles || []).map((r: any) => r.user_id))
    const adminProfilesList = (profiles || []).filter((p: any) => adminIdSet.has(p.id))
    const adminUidSet = new Set(
      adminProfilesList
        .map((p: any) => (p.free_fire_uid || '').trim())
        .filter(Boolean)
    )
    const adminNameSet = new Set(
      adminProfilesList
        .flatMap((p: any) => [p.ign, p.username])
        .map((v: any) => String(v || '').trim().toLowerCase())
        .filter(Boolean)
    )

    const total = Array.isArray(profiles) ? profiles.length : 0
    const admins = adminIdSet.size
    const nonAdmins = (profiles || []).filter((p: any) => !adminIdSet.has(p.id)).length

    const staleHonors = (honors || []).filter(
      (h: any) => !adminUidSet.has(String(h.player_uid || '').trim())
    ).length

    const staleAchievements = (achs || []).filter((a: any) => {
      const pUid = String(a.player_uid || '').trim()
      const pName = String(a.player_name || '').trim().toLowerCase()
      if (!pUid && !pName) return false
      if (pUid && adminUidSet.has(pUid)) return false
      if (pName && adminNameSet.has(pName)) return false
      return true
    }).length

    return {
      totalProfiles: total,
      adminProfiles: admins,
      nonAdminProfiles: nonAdmins,
      staleHonors,
      staleAchievements,
    }
  } catch {
    return {
      totalProfiles: 0,
      adminProfiles: 0,
      nonAdminProfiles: 0,
      staleHonors: 0,
      staleAchievements: 0,
    }
  }
}

export async function purgeNonAdminUsers(): Promise<{
  success: boolean
  archivedTournaments?: number
  deletedProfiles?: number
  deletedAuthUsers?: number
  preservedAdmins?: number
  needsSqlMigration?: boolean
  error?: string
}> {
  try {
    // Always snapshot completed tournaments first before attempting cleanup
    await archiveAllCompletedTournaments()

    const { data, error } = await supabase.rpc('purge_non_admin_users')
    if (error) {
      const msg = String(error.message || '').toLowerCase()
      if (
        error.code === '42883' ||
        error.code === 'PGRST202' ||
        msg.includes('could not find the function') ||
        msg.includes('does not exist')
      ) {
        return {
          success: false,
          needsSqlMigration: true,
          error:
            'Run supabase/archive_tournaments_and_cleanup_users.sql in your Supabase SQL Editor to archive Season 1 & 2 and delete non-admin Auth accounts.',
        }
      }
      return { success: false, error: error.message }
    }

    if (data && data.success === false) {
      return { success: false, error: data.error || 'Failed to clean non-admin users.' }
    }

    return {
      success: true,
      archivedTournaments: data?.archived_tournaments ?? 0,
      deletedProfiles: data?.deleted_profiles ?? 0,
      deletedAuthUsers: data?.deleted_auth_users ?? 0,
      preservedAdmins: data?.preserved_admins ?? 1,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to purge non-admin users.' }
  }
}

async function emptyStorageBucketsViaApi(): Promise<number> {
  const buckets = ['avatars', 'tournaments', 'banners', 'clips', 'uploads', 'media']
  let removed = 0

  async function listFolderFiles(bucket: string, prefix = ''): Promise<string[]> {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, { limit: 1000 })
    if (error || !data || data.length === 0) return []
    const paths: string[] = []
    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      if (item.id === null) {
        const nested = await listFolderFiles(bucket, fullPath)
        paths.push(...nested)
      } else {
        paths.push(fullPath)
      }
    }
    return paths
  }

  for (const bucket of buckets) {
    try {
      const filePaths = await listFolderFiles(bucket)
      for (let i = 0; i < filePaths.length; i += 100) {
        const batch = filePaths.slice(i, i + 100)
        const { error } = await supabase.storage.from(bucket).remove(batch)
        if (!error) removed += batch.length
      }
    } catch {
      // Skip non-existent or restricted buckets
    }
  }
  return removed
}

export async function factoryResetKeepAdmin(): Promise<{
  success: boolean
  deletedProfiles?: number
  deletedAuthUsers?: number
  deletedStorageObjects?: number
  preservedAdmins?: number
  needsSqlMigration?: boolean
  error?: string
}> {
  try {
    const { data, error } = await supabase.rpc('factory_reset_keep_admin')
    if (error) {
      const msg = String(error.message || '').toLowerCase()
      if (
        error.code === '42883' ||
        error.code === 'PGRST202' ||
        msg.includes('could not find the function') ||
        msg.includes('does not exist')
      ) {
        return {
          success: false,
          needsSqlMigration: true,
          error:
            'Run supabase/full_data_reset.sql in your Supabase SQL Editor to wipe all tournaments, results, users, UIDs, and images cleanly.',
        }
      }
      return { success: false, error: error.message }
    }

    if (data && data.success === false) {
      return { success: false, error: data.error || 'Factory reset failed.' }
    }

    const removedFromStorage = await emptyStorageBucketsViaApi()

    if (typeof window !== 'undefined') {
      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith('tourney_media_')) localStorage.removeItem(k)
        })
      } catch {}
    }

    return {
      success: true,
      deletedProfiles: data?.deleted_profiles ?? 0,
      deletedAuthUsers: data?.deleted_auth_users ?? 0,
      deletedStorageObjects: removedFromStorage,
      preservedAdmins: data?.preserved_admins ?? 1,
    }
  } catch (err: any) {
    return { success: false, error: err?.message || 'Factory reset failed.' }
  }
}

export async function findPlayerProfileByUid(uid: string): Promise<{ ign: string; avatar_url: string | null; level: number; player_id: string } | null> {
  const cleanUid = uid.trim()
  if (!cleanUid) return null

  try {
    // Only search registered site user profiles — never pull tournament registrations
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

export async function fetchSiteSettingText(key: string, defaultValue: string = ''): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle()

    if (error || !data || data.setting_value === null || data.setting_value === undefined) {
      return defaultValue
    }
    return String(data.setting_value)
  } catch {
    return defaultValue
  }
}

export async function updateSiteSetting(key: string, value: any) {
  let strVal = 'true'
  if (typeof value === 'boolean') {
    strVal = value ? 'true' : 'false'
  } else if (typeof value === 'object') {
    strVal = JSON.stringify(value)
  } else {
    strVal = String(value)
  }

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

export async function fetchSiteSettingJson<T = any>(key: string, defaultValue: T): Promise<T> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .maybeSingle()

    if (error || !data || !data.setting_value) {
      return defaultValue
    }
    if (data.setting_value === 'true' || data.setting_value === 'false') {
      return defaultValue
    }
    try {
      const parsed = typeof data.setting_value === 'string' ? JSON.parse(data.setting_value) : data.setting_value
      if (parsed && typeof parsed === 'object') {
        return parsed as T
      }
      return defaultValue
    } catch {
      return defaultValue
    }
  } catch {
    return defaultValue
  }
}

export async function updateSiteSettingJson(key: string, value: any): Promise<{ success: boolean; error?: string }> {
  try {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value)
    const { error } = await supabase
      .from('site_settings')
      .upsert(
        [{ setting_key: key, setting_value: strVal, updated_at: new Date().toISOString() }],
        { onConflict: 'setting_key' }
      )

    if (error) return { success: false, error: error.message }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

// ==========================================
// 5. ELITE ARMY SINGLE GUILD SERVICES
// ==========================================

export async function fetchRegisteredPlayers(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, player_id, username, ign, free_fire_uid, avatar_url, level')
      .eq('is_public', true)
      .order('ign', { ascending: true })

    if (error || !data) return []
    return data as Profile[]
  } catch {
    return []
  }
}

export const GUILD_ROLES = [
  { rank: 1, name: '👑 Leader' },
  { rank: 2, name: '🎖️ Co-Leader' },
  { rank: 3, name: '⭐⭐⭐ Commander' },
  { rank: 4, name: '⭐⭐ Senior Officer' },
  { rank: 5, name: '⭐ Officer' },
  { rank: 6, name: '🔰 Junior Officer' },
  { rank: 7, name: '🛡️ Elder' },
  { rank: 8, name: '👤 Member' },
] as const

export function normalizeGuildRole(role?: string): string {
  if (!role) return '👤 Member'
  if (role === 'leader') return '👑 Leader'
  if (role === 'officer') return '⭐ Officer'
  if (role === 'member') return '👤 Member'
  return role
}

export function mapToDbGuildRole(role: string): 'leader' | 'officer' | 'member' {
  if (role.includes('Leader')) return 'leader'
  if (role.includes('Commander') || role.includes('Officer')) return 'officer'
  return 'member'
}

type GuildMemberMetaRecord = {
  ranking?: number
  kills?: number
  guild_role?: string
  player_name?: string
  free_fire_uid?: string
}

function createEphemeralSupabaseClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'ephemeral-admin-register-player',
    },
  })
}

async function findProfileByUidOrId(cleanUid: string, userId?: string | null) {
  if (cleanUid) {
    const { data: byUid } = await supabase
      .from('profiles')
      .select('id, player_id, username, ign, free_fire_uid, avatar_url, level')
      .eq('free_fire_uid', cleanUid)
      .limit(1)
    if (byUid && byUid.length > 0) return byUid[0] as Profile
  }
  if (userId) {
    const { data: byId } = await supabase
      .from('profiles')
      .select('id, player_id, username, ign, free_fire_uid, avatar_url, level')
      .eq('id', userId)
      .limit(1)
    if (byId && byId.length > 0) return byId[0] as Profile
  }
  return null
}

async function signInAndSyncEphemeralProfile(
  eph: ReturnType<typeof createEphemeralSupabaseClient>,
  email: string,
  password: string,
  cleanUid: string,
  cleanName: string
): Promise<string | null> {
  const { data: ephLogin } = await eph.auth.signInWithPassword({ email, password })
  if (!ephLogin?.user) return null
  await eph
    .from('profiles')
    .update({ free_fire_uid: cleanUid, ign: cleanName, username: cleanName })
    .eq('id', ephLogin.user.id)
  return ephLogin.user.id
}

export async function ensurePlayerAccountByUid(
  gameUid: string,
  playerName: string
): Promise<{
  success: boolean
  userId?: string
  profile?: Profile
  wasNewlyRegistered?: boolean
  error?: string
}> {
  try {
    const cleanUid = gameUid.trim()
    const cleanName = playerName.trim()

    if (!cleanUid) {
      return { success: false, error: 'Free Fire UID is required.' }
    }
    if (/\s/.test(cleanUid)) {
      return { success: false, error: 'Free Fire UID cannot contain spaces.' }
    }

    // 1. Check if UID already exists in profiles
    const existing = await findProfileByUidOrId(cleanUid)
    if (existing) {
      return {
        success: true,
        userId: existing.id,
        profile: existing,
        wasNewlyRegistered: false,
      }
    }

    if (!cleanName) {
      return { success: false, error: 'Name of the player is required to register a new UID.' }
    }

    const { syntheticEmail, syntheticPassword } = getUidCredentials(cleanUid)
    const eph = createEphemeralSupabaseClient()
    let userId: string | null = null
    let wasNewlyRegistered = false

    // 2. Register via create_player_account RPC (does not alter admin browser session)
    const { data: rpcData, error: rpcErr } = await supabase.rpc('create_player_account', {
      p_email: syntheticEmail,
      p_password: syntheticPassword,
      p_ign: cleanName,
      p_uid: cleanUid,
    })

    const rpcErrMsg = rpcErr?.message || (rpcData && rpcData.success === false ? rpcData.error : '') || ''

    if (!rpcErr && (!rpcData || rpcData.success !== false)) {
      wasNewlyRegistered = true
      userId =
        (typeof rpcData === 'string' ? rpcData : null) ||
        rpcData?.user_id ||
        rpcData?.id ||
        (Array.isArray(rpcData) ? rpcData[0]?.user_id || rpcData[0]?.id : null)
    } else if (
      rpcErrMsg.includes('UID_ALREADY_EXISTS') ||
      rpcErrMsg.toLowerCase().includes('already') ||
      rpcErrMsg.toLowerCase().includes('duplicate')
    ) {
      userId = await signInAndSyncEphemeralProfile(eph, syntheticEmail, syntheticPassword, cleanUid, cleanName)
    } else {
      // Fallback to isolated signUp on ephemeral client so Admin stays logged in
      const { data: authData, error: authErr } = await eph.auth.signUp({
        email: syntheticEmail,
        password: syntheticPassword,
        options: {
          data: {
            ign: cleanName,
            free_fire_uid: cleanUid,
            username: cleanName,
          },
        },
      })

      if (authErr) {
        if (authErr.message?.toLowerCase().includes('already')) {
          userId = await signInAndSyncEphemeralProfile(eph, syntheticEmail, syntheticPassword, cleanUid, cleanName)
        } else {
          return { success: false, error: authErr.message || 'Failed to register player UID.' }
        }
      } else {
        wasNewlyRegistered = true
        userId = authData.user?.id || null
        if (userId && authData.session) {
          await eph
            .from('profiles')
            .update({ free_fire_uid: cleanUid, ign: cleanName, username: cleanName })
            .eq('id', userId)
        }
      }
    }

    // 3. Ensure profile row is visible and properly populated with free_fire_uid & ign
    let profile = await findProfileByUidOrId(cleanUid, userId)
    if (!profile || !profile.free_fire_uid || profile.free_fire_uid !== cleanUid || !profile.ign) {
      const syncedId = await signInAndSyncEphemeralProfile(eph, syntheticEmail, syntheticPassword, cleanUid, cleanName)
      if (syncedId) {
        userId = syncedId
        profile = await findProfileByUidOrId(cleanUid, syncedId)
      }
    }

    const resolvedUserId = profile?.id || userId
    if (!resolvedUserId) {
      return {
        success: false,
        error: 'UID could not be registered automatically. Please check Supabase player registration setup.',
      }
    }

    return {
      success: true,
      userId: resolvedUserId,
      profile: profile || undefined,
      wasNewlyRegistered,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to auto-register player UID.' }
  }
}

export async function fetchEliteArmyGuild() {
  try {
    let { data: guild, error } = await supabase
      .from('guilds')
      .select('*')
      .eq('name', 'ELITE ARMY')
      .maybeSingle()

    if (error || !guild) {
      // Try to find any guild or create default
      const { data: anyGuild } = await supabase.from('guilds').select('*').limit(1).maybeSingle()
      guild = anyGuild
      if (!guild) {
        return { guild: null, members: [] }
      }
    }

    // Fetch members with associated profile details
    const { data: members, error: mError } = await supabase
      .from('guild_members')
      .select('*, profiles(id, ign, username, player_id, avatar_url, level, free_fire_uid)')
      .eq('guild_id', guild.id)
      .order('glory_contributed', { ascending: false })

    // Fetch ranking, kills, name and role metadata from site_settings
    const rawMeta = await fetchSiteSettingJson<Record<string, GuildMemberMetaRecord>>('guild_member_meta', {})
    const memberMeta: Record<string, GuildMemberMetaRecord> =
      rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? rawMeta : {}

    const mappedMembers: GuildMember[] = (members || []).map((m: any, idx: number) => {
      const meta = memberMeta[m.id] || memberMeta[m.user_id] || {}
      return {
        ...m,
        guild_role: normalizeGuildRole(meta.guild_role || m.guild_role),
        player_name: meta.player_name || m.profiles?.ign || m.profiles?.username || m.player_name || 'ELITE PLAYER',
        free_fire_uid: m.profiles?.free_fire_uid || meta.free_fire_uid || '',
        ranking: typeof meta.ranking === 'number' ? meta.ranking : (idx + 1),
        kills: typeof meta.kills === 'number' ? meta.kills : 0,
      }
    })

    // Sort by admin assigned ranking ascending (rank 1 first), then glory_contributed descending
    mappedMembers.sort((a, b) => {
      const rankA = typeof a.ranking === 'number' ? a.ranking : 9999
      const rankB = typeof b.ranking === 'number' ? b.ranking : 9999
      if (rankA !== rankB) return rankA - rankB
      return (b.glory_contributed || 0) - (a.glory_contributed || 0)
    })

    return {
      guild,
      members: mappedMembers,
    }
  } catch {
    return {
      guild: null,
      members: [],
    }
  }
}

export async function addGuildMember(params: {
  guildId: string
  userId: string
  role: string
  glory: number
  ranking?: number
  kills?: number
  playerName?: string
  freeFireUid?: string
}) {
  try {
    const dbRole = mapToDbGuildRole(params.role)

    // 1. Check if user already exists in guild
    const { data: existing } = await supabase
      .from('guild_members')
      .select('id')
      .eq('guild_id', params.guildId)
      .eq('user_id', params.userId)
      .maybeSingle()

    let memberId: string
    if (existing) {
      memberId = existing.id
      await supabase
        .from('guild_members')
        .update({
          guild_role: dbRole,
          glory_contributed: params.glory,
          status: 'active',
        })
        .eq('id', memberId)
    } else {
      const { data, error } = await supabase
        .from('guild_members')
        .insert([
          {
            guild_id: params.guildId,
            user_id: params.userId,
            guild_role: dbRole,
            glory_contributed: params.glory,
            status: 'active',
          },
        ])
        .select()

      if (error || !data || data.length === 0) {
        return { success: false, error: error?.message || 'Failed to add member to guild' }
      }
      memberId = data[0].id
    }

    // 2. Persist ranking, kills, player name, UID and custom role with emojis in site_settings
    const rawMeta = await fetchSiteSettingJson<Record<string, GuildMemberMetaRecord>>('guild_member_meta', {})
    const memberMeta: Record<string, GuildMemberMetaRecord> =
      rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? { ...rawMeta } : {}

    const rankingVal = typeof params.ranking === 'number' && !isNaN(params.ranking) ? params.ranking : 1
    const killsVal = typeof params.kills === 'number' && !isNaN(params.kills) ? params.kills : 0
    const cleanName = params.playerName?.trim()
    const cleanUid = params.freeFireUid?.trim()

    const record: GuildMemberMetaRecord = {
      ranking: rankingVal,
      kills: killsVal,
      guild_role: params.role,
      ...(cleanName ? { player_name: cleanName } : {}),
      ...(cleanUid ? { free_fire_uid: cleanUid } : {}),
    }
    memberMeta[memberId] = record
    if (params.userId) {
      memberMeta[params.userId] = record
    }

    await updateSiteSettingJson('guild_member_meta', memberMeta)

    return { success: true, memberId }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function addOrRegisterGuildMember(params: {
  guildId: string
  selectedPlayerId?: string
  uid?: string
  playerName?: string
  role: string
  glory: number
  ranking?: number
  kills?: number
}): Promise<{
  success: boolean
  memberId?: string
  userId?: string
  playerName?: string
  freeFireUid?: string
  wasNewlyRegistered?: boolean
  error?: string
}> {
  try {
    const cleanUid = (params.uid || '').trim()
    const cleanName = (params.playerName || '').trim()

    let targetUserId = params.selectedPlayerId || ''
    let resolvedUid = cleanUid
    let resolvedName = cleanName
    let wasNewlyRegistered = false

    if (cleanUid) {
      if (/\s/.test(cleanUid)) {
        return { success: false, error: 'Free Fire UID cannot contain spaces.' }
      }

      // Check if this UID is already registered in profiles
      const existingByUid = await findProfileByUidOrId(cleanUid)
      if (existingByUid) {
        targetUserId = existingByUid.id
        resolvedUid = existingByUid.free_fire_uid || cleanUid
        resolvedName = cleanName || existingByUid.ign || existingByUid.username || 'ELITE PLAYER'
      } else if (targetUserId) {
        const selectedProf = await findProfileByUidOrId('', targetUserId)
        if (selectedProf && selectedProf.free_fire_uid && selectedProf.free_fire_uid !== cleanUid) {
          // Admin entered a different UID that is not registered yet
          targetUserId = ''
        } else if (selectedProf) {
          resolvedName = cleanName || selectedProf.ign || selectedProf.username || 'ELITE PLAYER'
        }
      }

      if (!targetUserId) {
        if (!cleanName) {
          return { success: false, error: 'Name of the player is required to register a new UID.' }
        }
        const regRes = await ensurePlayerAccountByUid(cleanUid, cleanName)
        if (!regRes.success || !regRes.userId) {
          return { success: false, error: regRes.error || 'Failed to register player UID.' }
        }
        targetUserId = regRes.userId
        resolvedUid = regRes.profile?.free_fire_uid || cleanUid
        resolvedName = cleanName || regRes.profile?.ign || regRes.profile?.username || 'ELITE PLAYER'
        wasNewlyRegistered = !!regRes.wasNewlyRegistered
      }
    } else if (targetUserId) {
      const selectedProf = await findProfileByUidOrId('', targetUserId)
      if (!selectedProf) {
        return { success: false, error: 'Selected player profile not found.' }
      }
      resolvedUid = selectedProf.free_fire_uid || ''
      resolvedName = cleanName || selectedProf.ign || selectedProf.username || 'ELITE PLAYER'
    } else {
      return { success: false, error: 'Please enter a Free Fire UID or select a registered player.' }
    }

    if (!resolvedName) {
      return { success: false, error: 'Name of the player is required.' }
    }

    const addRes = await addGuildMember({
      guildId: params.guildId,
      userId: targetUserId,
      role: params.role,
      glory: params.glory,
      ranking: params.ranking,
      kills: params.kills,
      playerName: resolvedName,
      freeFireUid: resolvedUid,
    })

    if (!addRes.success) {
      return addRes
    }

    return {
      success: true,
      memberId: addRes.memberId,
      userId: targetUserId,
      playerName: resolvedName,
      freeFireUid: resolvedUid,
      wasNewlyRegistered,
    }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to add member to guild.' }
  }
}

export async function updateGuildMemberDetails(
  memberId: string,
  updates: {
    role?: string
    glory?: number
    ranking?: number
    kills?: number
    userId?: string
    playerName?: string
  }
) {
  try {
    // 1. Update guild_members row with mapped valid role
    const gmUpdates: any = {}
    if (updates.role) {
      gmUpdates.guild_role = mapToDbGuildRole(updates.role)
    }
    if (typeof updates.glory === 'number' && !isNaN(updates.glory)) {
      gmUpdates.glory_contributed = updates.glory
    }

    if (Object.keys(gmUpdates).length > 0) {
      await supabase.from('guild_members').update(gmUpdates).eq('id', memberId)
    }

    // 2. Update ranking, kills, player name and custom role in site_settings
    const rawMeta = await fetchSiteSettingJson<Record<string, GuildMemberMetaRecord>>('guild_member_meta', {})
    const memberMeta: Record<string, GuildMemberMetaRecord> =
      rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? { ...rawMeta } : {}

    const existing = memberMeta[memberId] || (updates.userId ? memberMeta[updates.userId] : {}) || {}
    const cleanName = updates.playerName !== undefined ? updates.playerName.trim() : existing.player_name
    const updatedMeta: GuildMemberMetaRecord = {
      ...existing,
      ranking: typeof updates.ranking === 'number' && !isNaN(updates.ranking) ? updates.ranking : (existing.ranking ?? 1),
      kills: typeof updates.kills === 'number' && !isNaN(updates.kills) ? updates.kills : (existing.kills ?? 0),
      guild_role: updates.role || existing.guild_role || '👤 Member',
      ...(cleanName ? { player_name: cleanName } : {}),
    }

    memberMeta[memberId] = updatedMeta
    if (updates.userId) {
      memberMeta[updates.userId] = updatedMeta
    }

    await updateSiteSettingJson('guild_member_meta', memberMeta)
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function deleteGuildMember(memberId: string, userId?: string) {
  try {
    const { error } = await supabase.from('guild_members').delete().eq('id', memberId)
    if (error) return { success: false, error: error.message }

    const rawMeta = await fetchSiteSettingJson<Record<string, any>>('guild_member_meta', {})
    const memberMeta: Record<string, any> =
      rawMeta && typeof rawMeta === 'object' && !Array.isArray(rawMeta) ? { ...rawMeta } : {}

    delete memberMeta[memberId]
    if (userId) delete memberMeta[userId]
    await updateSiteSettingJson('guild_member_meta', memberMeta)

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function updateGuildMemberGlory(memberId: string, glory: number) {
  return updateGuildMemberDetails(memberId, { glory })
}

export async function updateGuildMember(memberId: string, updates: Partial<GuildMember>) {
  return updateGuildMemberDetails(memberId, {
    role: updates.guild_role,
    glory: updates.glory_contributed,
    ranking: updates.ranking,
    kills: updates.kills,
    userId: updates.user_id,
  })
}

function isMissingRelationError(err: any): boolean {
  if (!err) return false
  const msg = String(err.message || '').toLowerCase()
  return (
    err.code === '42P01' ||
    err.code === 'PGRST205' ||
    msg.includes('does not exist') ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table')
  )
}

export async function fetchGuildChallenges(guildId?: string): Promise<GuildChallenge[]> {
  try {
    let query = supabase
      .from('guild_challenges')
      .select('*')
      .order('created_at', { ascending: false })

    if (guildId) {
      query = query.eq('guild_id', guildId)
    }

    const { data, error } = await query
    if (!error && Array.isArray(data)) {
      return data as GuildChallenge[]
    }

    if (error && !isMissingRelationError(error)) {
      console.warn('fetchGuildChallenges notice:', error.message)
    }

    const raw = await fetchSiteSettingJson<GuildChallenge[]>('guild_challenges', [])
    const list = Array.isArray(raw) ? raw : []
    return list
      .filter((c) => !guildId || c.guild_id === guildId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  } catch {
    return []
  }
}

export async function submitGuildChallenge(params: {
  guildId: string
  challengerMemberId: string
  defenderMemberId: string
  note?: string
}): Promise<{ success: boolean; data?: GuildChallenge; error?: string }> {
  try {
    const [guildRes, existingChallenges] = await Promise.all([
      fetchEliteArmyGuild(),
      fetchGuildChallenges(params.guildId),
    ])

    const members = guildRes.members || []
    const challenger = members.find((m) => m.id === params.challengerMemberId)
    if (!challenger) {
      return { success: false, error: 'Challenger is not an active member of this guild.' }
    }

    const defender = members.find((m) => m.id === params.defenderMemberId)

    if (!defender) {
      return { success: false, error: 'Target defender not found in guild roster.' }
    }

    const check = canMemberChallengeTarget({
      challenger,
      target: defender,
      allMembers: members,
      existingChallenges,
    })

    if (!check.allowed) {
      return { success: false, error: check.reason || 'Challenge not permitted by guild rules.' }
    }

    const now = new Date().toISOString()
    const record: GuildChallenge = {
      id:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `ch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      guild_id: params.guildId,
      challenger_member_id: challenger.id,
      challenger_user_id: challenger.user_id,
      challenger_name: challenger.player_name || challenger.profiles?.ign || 'ELITE PLAYER',
      challenger_uid: challenger.profiles?.free_fire_uid || challenger.free_fire_uid || '',
      challenger_role: normalizeGuildRole(challenger.guild_role),
      challenger_glory: challenger.glory_contributed ?? 0,
      defender_member_id: defender.id,
      defender_user_id: defender.user_id,
      defender_name: defender.player_name || defender.profiles?.ign || 'ELITE PLAYER',
      defender_uid: defender.profiles?.free_fire_uid || defender.free_fire_uid || '',
      defender_role: normalizeGuildRole(defender.guild_role),
      defender_glory: defender.glory_contributed ?? 0,
      status: 'pending',
      note: params.note?.trim() || undefined,
      created_at: now,
      updated_at: now,
    }

    // Try dedicated guild_challenges table first
    const { data: inserted, error: insertErr } = await supabase
      .from('guild_challenges')
      .insert([record])
      .select()

    if (!insertErr && inserted && inserted.length > 0) {
      return { success: true, data: inserted[0] as GuildChallenge }
    }

    if (insertErr && !isMissingRelationError(insertErr)) {
      return { success: false, error: insertErr.message }
    }

    // Fallback to site_settings JSON store
    const currentList = await fetchSiteSettingJson<GuildChallenge[]>('guild_challenges', [])
    const safeList = Array.isArray(currentList) ? [...currentList] : []
    safeList.unshift(record)
    const saveRes = await updateSiteSettingJson('guild_challenges', safeList)
    if (!saveRes.success) {
      return { success: false, error: saveRes.error || 'Failed to save challenge.' }
    }

    return { success: true, data: record }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit challenge.' }
  }
}

export async function resolveGuildChallenge(
  challengeId: string,
  nextStatus: GuildChallengeStatus,
  options?: { swapRanksOnWin?: boolean }
): Promise<{ success: boolean; error?: string }> {
  try {
    const now = new Date().toISOString()
    let targetChallenge: GuildChallenge | undefined

    // 1. Update in guild_challenges table or site_settings fallback
    const { data: tableRow, error: fetchTableErr } = await supabase
      .from('guild_challenges')
      .select('*')
      .eq('id', challengeId)
      .maybeSingle()

    if (!fetchTableErr && tableRow) {
      targetChallenge = tableRow as GuildChallenge
      const { error: updErr } = await supabase
        .from('guild_challenges')
        .update({ status: nextStatus, updated_at: now })
        .eq('id', challengeId)
      if (updErr) return { success: false, error: updErr.message }
    } else if (fetchTableErr && !isMissingRelationError(fetchTableErr)) {
      return { success: false, error: fetchTableErr.message }
    } else {
      const currentList = await fetchSiteSettingJson<GuildChallenge[]>('guild_challenges', [])
      const safeList = Array.isArray(currentList) ? [...currentList] : []
      const idx = safeList.findIndex((c) => c.id === challengeId)
      if (idx === -1) {
        return { success: false, error: 'Challenge record not found.' }
      }
      targetChallenge = safeList[idx]
      safeList[idx] = { ...targetChallenge, status: nextStatus, updated_at: now }
      const saveRes = await updateSiteSettingJson('guild_challenges', safeList)
      if (!saveRes.success) {
        return { success: false, error: saveRes.error || 'Failed to update challenge status.' }
      }
    }

    // 2. If Challenger Won and role swap requested, swap roles & roster rankings
    if (nextStatus === 'challenger_won' && options?.swapRanksOnWin !== false && targetChallenge) {
      const guildRes = await fetchEliteArmyGuild()
      const challenger = guildRes.members.find(
        (m) => m.id === targetChallenge!.challenger_member_id
      )
      const defender = guildRes.members.find(
        (m) => m.id === targetChallenge!.defender_member_id
      )

      if (challenger && defender) {
        const challengerRole = normalizeGuildRole(challenger.guild_role)
        const defenderRole = normalizeGuildRole(defender.guild_role)
        const challengerRank = challenger.ranking
        const defenderRank = defender.ranking

        await Promise.all([
          updateGuildMemberDetails(challenger.id, {
            role: defenderRole,
            ranking: defenderRank,
            userId: challenger.user_id,
          }),
          updateGuildMemberDetails(defender.id, {
            role: challengerRole,
            ranking: challengerRank,
            userId: defender.user_id,
          }),
        ])
      }
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update challenge.' }
  }
}

export async function deleteGuildChallenge(challengeId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('guild_challenges').delete().eq('id', challengeId)
    if (!error) return { success: true }
    if (!isMissingRelationError(error)) {
      return { success: false, error: error.message }
    }

    const currentList = await fetchSiteSettingJson<GuildChallenge[]>('guild_challenges', [])
    const safeList = (Array.isArray(currentList) ? currentList : []).filter(
      (c) => c.id !== challengeId
    )
    const saveRes = await updateSiteSettingJson('guild_challenges', safeList)
    if (!saveRes.success) {
      return { success: false, error: saveRes.error || 'Failed to delete challenge.' }
    }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete challenge.' }
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
      return []
    }
    return data.map((item: any) => ({
      ...item,
      player_name: item.profiles?.ign || item.profiles?.username || 'Player',
    }))
  } catch {
    return []
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

export const MOCK_HOME_CARDS: HomeCard[] = []

export const MOCK_LEADERBOARD_SECTIONS: LeaderboardSection[] = []

export const MOCK_TOURNAMENTS: any[] = []

export const MOCK_RANKINGS: string[][] = []

export const MOCK_ELITE_ARMY_GUILD: Guild | null = null

export const MOCK_ELITE_ARMY_MEMBERS: any[] = []

export const MOCK_ACHIEVEMENTS: Achievement[] = []

export const MOCK_CLIPS: any[] = []

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

