// Supabase data access for the league / season system.

import { supabase } from './supabase'
import type {
  LeagueMatchResult,
  LeaguePairing,
  LeagueSeason,
  LeagueSeasonTeam,
  LeagueTeamStatus,
} from './types'
import { buildSchedule, matchCode, validatePairing } from './league'

export interface LeagueData {
  season: LeagueSeason
  teams: LeagueSeasonTeam[]
  pairings: LeaguePairing[]
  results: LeagueMatchResult[]
}

export interface LeagueResult {
  success: boolean
  error?: string
  data?: any
}

const ERROR_MESSAGES: Record<string, string> = {
  TEAM_BUSY_IN_ROUND: 'One of these teams already has a match in this round.',
  REPEAT_OPPONENT: 'These two teams have already played each other this season.',
  MAX_MATCHES_TEAM_A: 'Team A has already played the maximum number of matches.',
  MAX_MATCHES_TEAM_B: 'Team B has already played the maximum number of matches.',
  TEAM_A_NOT_ACTIVE: 'Team A is excluded or is not part of this season.',
  TEAM_B_NOT_ACTIVE: 'Team B is excluded or is not part of this season.',
  BAD_ROUND: 'That round is outside this season\'s range.',
  SEASON_NOT_FOUND: 'This season no longer exists.',
  PAIRING_NOT_FOUND: 'This pairing no longer exists.',
  PAIRING_CANCELLED: 'This pairing has been cancelled.',
  PAIRING_NOT_LOCKED: 'Lock this pairing on the wheel before entering a result.',
  WINNER_NOT_IN_PAIRING: 'The winning team must be one of the two teams in this match.',
  SEASON_MISMATCH: 'The result does not belong to this season.',
}

export function isLeagueTablesMissing(error: any): boolean {
  const message = error?.message || ''
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    /relation .* does not exist/i.test(message) ||
    /could not find the table/i.test(message)
  )
}

export function friendlyLeagueError(error: any): string {
  if (!error) return 'Something went wrong. Please try again.'
  if (isLeagueTablesMissing(error)) {
    return 'League tables are not installed yet. Run supabase/league_system_migration.sql in the Supabase SQL editor, then reload.'
  }
  const message = error?.message || String(error)
  for (const [code, text] of Object.entries(ERROR_MESSAGES)) {
    if (message.includes(code)) return text
  }
  if (error?.code === '23505' || /duplicate key/i.test(message)) {
    return 'That record already exists. A season with this number may already exist for this tournament.'
  }
  return message
}

function mapTeamRow(row: any): LeagueSeasonTeam {
  const registration = row?.tournament_registrations || {}
  return {
    id: row.id,
    season_id: row.season_id,
    registration_id: row.registration_id,
    status: row.status,
    team_name: registration.team_name || registration.captain_name || 'Unnamed Team',
    captain_name: registration.captain_name || null,
    created_at: row.created_at,
  }
}

export async function fetchLeagueSeasons(
  tournamentId: string
): Promise<{ seasons: LeagueSeason[]; error?: string }> {
  if (!tournamentId) return { seasons: [] }
  const { data, error } = await supabase
    .from('league_seasons')
    .select('*')
    .eq('tournament_id', tournamentId)
    .order('season_number', { ascending: true })

  if (error) {
    const message = friendlyLeagueError(error)
    console.warn('fetchLeagueSeasons:', message)
    return { seasons: [], error: message }
  }
  return { seasons: (data || []) as LeagueSeason[] }
}

export async function fetchLeagueData(seasonId: string, tournamentId?: string): Promise<LeagueResult> {
  if (!seasonId) return { success: false, error: 'No season selected.' }

  try {
    const queries = [
      supabase.from('league_seasons').select('*').eq('id', seasonId).single(),
      supabase
        .from('league_season_teams')
        .select('*, tournament_registrations(id, team_name, captain_name)')
        .eq('season_id', seasonId)
        .order('created_at', { ascending: true }),
      supabase
        .from('league_pairings')
        .select('*')
        .eq('season_id', seasonId)
        .order('round_number', { ascending: true })
        .order('match_number', { ascending: true }),
      supabase.from('league_match_results').select('*').eq('season_id', seasonId),
    ] as const

    const [seasonRes, teamsRes, pairingsRes, resultsRes] = await Promise.all(queries)

    if (seasonRes.error) return { success: false, error: friendlyLeagueError(seasonRes.error) }
    if (teamsRes.error) return { success: false, error: friendlyLeagueError(teamsRes.error) }
    if (pairingsRes.error) return { success: false, error: friendlyLeagueError(pairingsRes.error) }
    if (resultsRes.error) return { success: false, error: friendlyLeagueError(resultsRes.error) }

    const season = seasonRes.data as LeagueSeason
    if (tournamentId && season.tournament_id !== tournamentId) {
      return { success: false, error: 'This season belongs to a different tournament.' }
    }

    return {
      success: true,
      data: {
        season,
        teams: (teamsRes.data || []).map(mapTeamRow),
        pairings: (pairingsRes.data || []) as LeaguePairing[],
        results: (resultsRes.data || []) as LeagueMatchResult[],
      } as LeagueData,
    }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function fetchTournamentTeamCount(tournamentId: string): Promise<number> {
  if (!tournamentId) return 0
  const { count, error } = await supabase
    .from('tournament_registrations')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)

  if (error) {
    console.warn('fetchTournamentTeamCount:', friendlyLeagueError(error))
    return 0
  }
  return count || 0
}

export async function createLeagueSeason(input: {
  tournamentId: string
  seasonNumber: number
  name: string
  matchesPerTeam: number
  winPoints: number
}): Promise<LeagueResult> {
  try {
    const { data: registrations, error: regError } = await supabase
      .from('tournament_registrations')
      .select('id, team_name, captain_name')
      .eq('tournament_id', input.tournamentId)

    if (regError) return { success: false, error: friendlyLeagueError(regError) }

    const teams = Array.from(new Map((registrations || []).map((row: any) => [row.id, row])).values())
    if (teams.length < 2) {
      return {
        success: false,
        error: 'At least 2 registered teams are required to create a season.',
      }
    }

    const { data: seasonRow, error: seasonError } = await supabase
      .from('league_seasons')
      .insert([
        {
          tournament_id: input.tournamentId,
          season_number: input.seasonNumber,
          name: input.name,
          matches_per_team: input.matchesPerTeam,
          win_points: input.winPoints,
          current_round: 1,
          status: 'active',
        },
      ])
      .select()
      .single()

    if (seasonError || !seasonRow) {
      return { success: false, error: friendlyLeagueError(seasonError) }
    }

    const cleanup = async () => {
      await supabase.from('league_seasons').delete().eq('id', seasonRow.id)
    }

    const { error: teamError } = await supabase.from('league_season_teams').insert(
      teams.map((team: any) => ({
        season_id: seasonRow.id,
        registration_id: team.id,
        status: 'active' as LeagueTeamStatus,
      }))
    )

    if (teamError) {
      await cleanup()
      return { success: false, error: friendlyLeagueError(teamError) }
    }

    const schedule = buildSchedule(
      teams.map((team: any) => team.id),
      input.matchesPerTeam
    )

    if (!schedule.pairs.length) {
      await cleanup()
      return {
        success: false,
        error: schedule.warnings[0] || 'Could not generate any matches for this season.',
      }
    }

    const pairingRows = schedule.pairs.map((pair) => ({
      season_id: seasonRow.id,
      round_number: pair.round,
      match_number: pair.matchNumber,
      team_a_id: pair.teamAId,
      team_b_id: pair.teamBId,
      status: 'scheduled',
      label: matchCode(input.seasonNumber, pair.round, pair.matchNumber),
    }))

    const { error: pairingError } = await supabase.from('league_pairings').insert(pairingRows)
    if (pairingError) {
      await cleanup()
      return { success: false, error: friendlyLeagueError(pairingError) }
    }

    return {
      success: true,
      data: {
        season: seasonRow as LeagueSeason,
        warnings: schedule.warnings,
        target: schedule.target,
        roundCount: schedule.roundCount,
        matchCount: schedule.pairs.length,
        teamCount: teams.length,
      },
    }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function updateLeagueSeason(
  seasonId: string,
  updates: Partial<Pick<LeagueSeason, 'name' | 'current_round' | 'status' | 'win_points'>>
): Promise<LeagueResult> {
  try {
    const { data, error } = await supabase
      .from('league_seasons')
      .update(updates)
      .eq('id', seasonId)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: friendlyLeagueError(error) }
    if (!data) return { success: false, error: 'This season no longer exists.' }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function deleteLeagueSeason(seasonId: string): Promise<LeagueResult> {
  try {
    const { error } = await supabase.from('league_seasons').delete().eq('id', seasonId)
    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

/** Add tournament registrations that are not yet in the season snapshot. */
export async function syncSeasonTeams(seasonId: string): Promise<LeagueResult> {
  try {
    const { data: season, error: seasonError } = await supabase
      .from('league_seasons')
      .select('*')
      .eq('id', seasonId)
      .single()
    if (seasonError || !season) return { success: false, error: friendlyLeagueError(seasonError) }

    const [regsRes, existingRes] = await Promise.all([
      supabase
        .from('tournament_registrations')
        .select('id')
        .eq('tournament_id', (season as LeagueSeason).tournament_id),
      supabase.from('league_season_teams').select('registration_id').eq('season_id', seasonId),
    ])

    if (regsRes.error) return { success: false, error: friendlyLeagueError(regsRes.error) }
    if (existingRes.error) return { success: false, error: friendlyLeagueError(existingRes.error) }

    const existing = new Set((existingRes.data || []).map((row: any) => row.registration_id))
    const missing = (regsRes.data || []).filter((row: any) => !existing.has(row.id))
    if (!missing.length) return { success: true, data: { added: 0 } }

    const { error } = await supabase.from('league_season_teams').insert(
      missing.map((row: any) => ({
        season_id: seasonId,
        registration_id: row.id,
        status: 'active',
      }))
    )
    if (error) return { success: false, error: friendlyLeagueError(error) }

    return { success: true, data: { added: missing.length } }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

/**
 * Exclude / restore a team. Excluding cancels every scheduled or locked
 * pairing for that team; completed results are kept for the record.
 */
export async function setSeasonTeamStatus(
  seasonId: string,
  registrationId: string,
  status: LeagueTeamStatus
): Promise<LeagueResult> {
  try {
    const { error } = await supabase
      .from('league_season_teams')
      .update({ status })
      .eq('season_id', seasonId)
      .eq('registration_id', registrationId)

    if (error) return { success: false, error: friendlyLeagueError(error) }

    let cancelled = 0
    if (status !== 'active') {
      const { data, error: cancelError } = await supabase
        .from('league_pairings')
        .update({ status: 'cancelled' })
        .eq('season_id', seasonId)
        .in('status', ['scheduled', 'locked'])
        .or(`team_a_id.eq.${registrationId},team_b_id.eq.${registrationId}`)
        .select('id')

      if (cancelError) return { success: false, error: friendlyLeagueError(cancelError) }
      cancelled = (data || []).length
    }

    return { success: true, data: { cancelled } }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function regenerateLeagueSchedule(seasonId: string): Promise<LeagueResult> {
  try {
    const { data: season, error: seasonError } = await supabase
      .from('league_seasons')
      .select('*')
      .eq('id', seasonId)
      .single()
    if (seasonError || !season) return { success: false, error: friendlyLeagueError(seasonError) }

    const [pairingsRes, teamsRes] = await Promise.all([
      supabase.from('league_pairings').select('id, status').eq('season_id', seasonId),
      supabase
        .from('league_season_teams')
        .select('registration_id')
        .eq('season_id', seasonId)
        .eq('status', 'active'),
    ])

    if (pairingsRes.error) return { success: false, error: friendlyLeagueError(pairingsRes.error) }
    if (teamsRes.error) return { success: false, error: friendlyLeagueError(teamsRes.error) }

    if ((pairingsRes.data || []).some((row: any) => row.status === 'locked' || row.status === 'completed')) {
      return {
        success: false,
        error: 'Unlock or delete all locked/completed pairings before regenerating the schedule.',
      }
    }

    const teamIds = (teamsRes.data || []).map((row: any) => row.registration_id)
    if (teamIds.length < 2) return { success: false, error: 'At least 2 active teams are required.' }

    const { error: deleteError } = await supabase
      .from('league_pairings')
      .delete()
      .eq('season_id', seasonId)
    if (deleteError) return { success: false, error: friendlyLeagueError(deleteError) }

    const typedSeason = season as LeagueSeason
    const schedule = buildSchedule(teamIds, typedSeason.matches_per_team)
    if (!schedule.pairs.length) {
      return { success: false, error: schedule.warnings[0] || 'Could not generate a schedule.' }
    }

    const rows = schedule.pairs.map((pair) => ({
      season_id: seasonId,
      round_number: pair.round,
      match_number: pair.matchNumber,
      team_a_id: pair.teamAId,
      team_b_id: pair.teamBId,
      status: 'scheduled',
      label: matchCode(typedSeason.season_number, pair.round, pair.matchNumber),
    }))

    const { error: insertError } = await supabase.from('league_pairings').insert(rows)
    if (insertError) return { success: false, error: friendlyLeagueError(insertError) }

    await supabase
      .from('league_seasons')
      .update({ current_round: 1 })
      .eq('id', seasonId)

    return {
      success: true,
      data: {
        warnings: schedule.warnings,
        target: schedule.target,
        roundCount: schedule.roundCount,
        matchCount: rows.length,
      },
    }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

async function getSeasonContext(seasonId: string) {
  const [seasonRes, teamsRes, pairingsRes] = await Promise.all([
    supabase.from('league_seasons').select('*').eq('id', seasonId).single(),
    supabase
      .from('league_season_teams')
      .select('registration_id')
      .eq('season_id', seasonId)
      .eq('status', 'active'),
    supabase.from('league_pairings').select('id, round_number, match_number, team_a_id, team_b_id, status').eq('season_id', seasonId),
  ])

  if (seasonRes.error) return { error: friendlyLeagueError(seasonRes.error) }
  if (teamsRes.error) return { error: friendlyLeagueError(teamsRes.error) }
  if (pairingsRes.error) return { error: friendlyLeagueError(pairingsRes.error) }

  return {
    season: seasonRes.data as LeagueSeason,
    activeTeamIds: new Set((teamsRes.data || []).map((row: any) => row.registration_id)),
    pairings: (pairingsRes.data || []) as LeaguePairing[],
  }
}

export async function createPairing(input: {
  seasonId: string
  round: number
  teamAId: string
  teamBId: string
}): Promise<LeagueResult> {
  try {
    const context = await getSeasonContext(input.seasonId)
    if ('error' in context) return { success: false, error: context.error }
    if (!context.activeTeamIds.has(input.teamAId) || !context.activeTeamIds.has(input.teamBId)) {
      return { success: false, error: 'Both teams must be active in this season.' }
    }

    const validation = validatePairing({
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      round: input.round,
      pairings: context.pairings,
      matchesPerTeam: context.season.matches_per_team,
      maxRound: context.season.matches_per_team + 1,
    })
    if (!validation.ok) return { success: false, error: validation.error }

    const roundMatches = context.pairings.filter((p) => p.round_number === input.round)
    const nextMatch = roundMatches.reduce((max, p) => Math.max(max, p.match_number), 0) + 1

    const { data, error } = await supabase
      .from('league_pairings')
      .insert([
        {
          season_id: input.seasonId,
          round_number: input.round,
          match_number: nextMatch,
          team_a_id: input.teamAId,
          team_b_id: input.teamBId,
          status: 'scheduled',
          label: matchCode(context.season.season_number, input.round, nextMatch),
        },
      ])
      .select()
      .single()

    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function updatePairing(input: {
  pairingId: string
  round: number
  teamAId: string
  teamBId: string
}): Promise<LeagueResult> {
  try {
    const { data: pairingRow, error: pairingError } = await supabase
      .from('league_pairings')
      .select('*')
      .eq('id', input.pairingId)
      .single()
    if (pairingError || !pairingRow) return { success: false, error: friendlyLeagueError(pairingError) }

    const pairing = pairingRow as LeaguePairing
    if (pairing.status === 'completed') {
      return { success: false, error: 'Delete the result before editing this pairing.' }
    }

    const context = await getSeasonContext(pairing.season_id)
    if ('error' in context) return { success: false, error: context.error }

    const validation = validatePairing({
      teamAId: input.teamAId,
      teamBId: input.teamBId,
      round: input.round,
      pairings: context.pairings,
      matchesPerTeam: context.season.matches_per_team,
      maxRound: context.season.matches_per_team + 1,
      excludeId: input.pairingId,
    })
    if (!validation.ok) return { success: false, error: validation.error }

    // Moving a pairing to another round needs a free match number there.
    const targetRoundMatches = context.pairings.filter(
      (row) => row.round_number === input.round && row.id !== input.pairingId
    )
    const nextMatch =
      input.round === pairing.round_number
        ? pairing.match_number
        : targetRoundMatches.reduce((max, row) => Math.max(max, row.match_number), 0) + 1

    const { data, error } = await supabase
      .from('league_pairings')
      .update({
        round_number: input.round,
        match_number: nextMatch,
        team_a_id: input.teamAId,
        team_b_id: input.teamBId,
        label: matchCode(context.season.season_number, input.round, nextMatch),
      })
      .eq('id', input.pairingId)
      .select()
      .maybeSingle()

    if (error) return { success: false, error: friendlyLeagueError(error) }
    if (!data) return { success: false, error: 'This pairing no longer exists.' }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function lockPairing(pairingId: string): Promise<LeagueResult> {
  try {
    const { data, error } = await supabase
      .from('league_pairings')
      .update({ status: 'locked', locked_at: new Date().toISOString() })
      .eq('id', pairingId)
      .in('status', ['scheduled', 'locked'])
      .select()
      .maybeSingle()

    if (error) return { success: false, error: friendlyLeagueError(error) }
    if (!data) {
      return {
        success: false,
        error: 'This pairing is no longer available to lock. Refresh the wheel and try again.',
      }
    }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function cancelPairing(pairingId: string): Promise<LeagueResult> {
  try {
    const { data: pairing, error: pairingError } = await supabase
      .from('league_pairings')
      .select('status')
      .eq('id', pairingId)
      .single()
    if (pairingError || !pairing) return { success: false, error: friendlyLeagueError(pairingError) }
    if (pairing.status === 'completed') {
      return { success: false, error: 'Delete the result before cancelling this pairing.' }
    }

    const { error } = await supabase
      .from('league_pairings')
      .update({ status: 'cancelled' })
      .eq('id', pairingId)
      .in('status', ['scheduled', 'locked'])
    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function restorePairing(pairingId: string): Promise<LeagueResult> {
  try {
    const { data: pairing, error: pairingError } = await supabase
      .from('league_pairings')
      .select('status')
      .eq('id', pairingId)
      .single()
    if (pairingError || !pairing) return { success: false, error: friendlyLeagueError(pairingError) }
    if (pairing.status === 'completed') {
      return { success: false, error: 'This pairing is completed. Delete its result first.' }
    }

    const { error } = await supabase
      .from('league_pairings')
      .update({ status: 'scheduled', locked_at: null })
      .eq('id', pairingId)
      .in('status', ['cancelled', 'locked'])
    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true, data: { restored: true } }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function deletePairing(pairingId: string): Promise<LeagueResult> {
  try {
    const { error } = await supabase.from('league_pairings').delete().eq('id', pairingId)
    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function saveMatchResult(input: {
  pairingId: string
  seasonId: string
  teamAScore: number
  teamBScore: number
  winnerId: string
}): Promise<LeagueResult> {
  try {
    if (!Number.isFinite(input.teamAScore) || !Number.isFinite(input.teamBScore)) {
      return { success: false, error: 'Scores must be numbers.' }
    }
    if (input.teamAScore < 0 || input.teamBScore < 0) {
      return { success: false, error: 'Scores cannot be negative.' }
    }
    if (!input.winnerId) return { success: false, error: 'Choose the winner of this match.' }

    const { data, error } = await supabase
      .from('league_match_results')
      .upsert(
        [
          {
            pairing_id: input.pairingId,
            season_id: input.seasonId,
            team_a_score: Math.floor(input.teamAScore),
            team_b_score: Math.floor(input.teamBScore),
            winner_id: input.winnerId,
          },
        ],
        { onConflict: 'pairing_id' }
      )
      .select()
      .single()

    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true, data }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}

export async function deleteMatchResult(pairingId: string): Promise<LeagueResult> {
  try {
    const { error } = await supabase
      .from('league_match_results')
      .delete()
      .eq('pairing_id', pairingId)
    if (error) return { success: false, error: friendlyLeagueError(error) }
    return { success: true }
  } catch (err: any) {
    return { success: false, error: friendlyLeagueError(err) }
  }
}
