import { fetchSiteSettingJson, updateSiteSettingJson } from './supabase'
import type { LeagueStanding } from './types'
import type {
  PlayoffBracketData,
  PlayoffMatchId,
  PlayoffMatchState,
  PlayoffParticipant,
} from './playoff-types'

export const PLAYOFF_SETTING_KEY_PREFIX = 'league_playoffs_'

export function getPlayoffSettingKey(seasonId: string): string {
  return `${PLAYOFF_SETTING_KEY_PREFIX}${seasonId}`
}

/**
 * Builds the initial Playoff Bracket from the top 6 standings.
 */
export function initPlayoffBracketFromStandings(
  standings: LeagueStanding[],
  seasonId: string,
  tournamentId: string
): PlayoffBracketData {
  const sorted = [...standings].sort((a, b) => a.rank - b.rank)
  const top6 = sorted.slice(0, 6)

  const top6Participants: PlayoffParticipant[] = top6.map((s, idx) => ({
    id: s.teamId,
    name: s.teamName,
    seedRank: idx + 1,
    sourceDescription: `Points Table #${idx + 1} Seed (${s.points} pts)`,
  }))

  // Pad to 6 if fewer teams exist
  while (top6Participants.length < 6) {
    const seed = top6Participants.length + 1
    top6Participants.push({
      id: `tbd-seed-${seed}`,
      name: `TBD Seed #${seed}`,
      seedRank: seed,
      sourceDescription: `Seed #${seed} Slot`,
      isTBD: true,
    })
  }

  const matches: Record<PlayoffMatchId, PlayoffMatchState> = {
    M1_QUALIFIER_1: {
      id: 'M1_QUALIFIER_1',
      matchNumber: 1,
      stageName: 'QUALIFIER 1',
      shortLabel: 'Match 1',
      tagline: 'Winner to Grand Finale • Loser to Semi-Final (Double Chance)',
      ruleExplanation: 'Team 1 vs Team 2: Winner qualifies directly for Grand Finale, loser drops into Semi-Final.',
      teamA: top6Participants[0],
      teamB: top6Participants[1],
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
    M2_ELIMINATOR_1: {
      id: 'M2_ELIMINATOR_1',
      matchNumber: 2,
      stageName: 'ELIMINATOR 1',
      shortLabel: 'Match 2',
      tagline: 'Winner to Quarter-Final • Loser Disqualified',
      ruleExplanation: 'Team 3 vs Team 4: Winner advances to Quarter-Final, loser is knocked out.',
      teamA: top6Participants[2],
      teamB: top6Participants[3],
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
    M3_ELIMINATOR_2: {
      id: 'M3_ELIMINATOR_2',
      matchNumber: 3,
      stageName: 'ELIMINATOR 2',
      shortLabel: 'Match 3',
      tagline: 'Winner to Quarter-Final • Loser Disqualified',
      ruleExplanation: 'Team 5 vs Team 6: Winner advances to Quarter-Final, loser is knocked out.',
      teamA: top6Participants[4],
      teamB: top6Participants[5],
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
    M4_QUARTER_FINAL: {
      id: 'M4_QUARTER_FINAL',
      matchNumber: 4,
      stageName: 'QUARTER-FINAL',
      shortLabel: 'Match 4',
      tagline: 'Winner to Semi-Final • Loser Disqualified',
      ruleExplanation: 'Match between two winning teams from Eliminator 1 and Eliminator 2. Winner enters Semi-Final.',
      teamA: null,
      teamB: null,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
    M5_SEMI_FINAL: {
      id: 'M5_SEMI_FINAL',
      matchNumber: 5,
      stageName: 'SEMI-FINAL',
      shortLabel: 'Match 5',
      tagline: 'Winner to Grand Finale • Loser Eliminated (3rd Place)',
      ruleExplanation: 'Quarter-Final winner plays against the Qualifier 1 loser. Winner enters the Grand Finale.',
      teamA: null,
      teamB: null,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
    M6_GRAND_FINALE: {
      id: 'M6_GRAND_FINALE',
      matchNumber: 6,
      stageName: 'GRAND FINALE',
      shortLabel: 'Match 6',
      tagline: 'Championship Match • Winner Crowns the Champion 🏆',
      ruleExplanation: 'Qualifier 1 winner plays Semi-Final winner for the Championship title.',
      teamA: null,
      teamB: null,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      loserId: null,
      status: 'pending',
    },
  }

  return {
    seasonId,
    tournamentId,
    finalizedAt: new Date().toISOString(),
    top6Teams: top6Participants,
    matches,
    champion: null,
    runnerUp: null,
    thirdPlace: null,
  }
}

/**
 * Recalculates all dependent match participants based on results.
 */
export function recalculatePlayoffGraph(current: PlayoffBracketData): PlayoffBracketData {
  const data: PlayoffBracketData = JSON.parse(JSON.stringify(current))
  const m = data.matches

  // 1. Check M1
  const m1Winner = m.M1_QUALIFIER_1.winnerId
    ? m.M1_QUALIFIER_1.teamA?.id === m.M1_QUALIFIER_1.winnerId
      ? m.M1_QUALIFIER_1.teamA
      : m.M1_QUALIFIER_1.teamB
    : null
  const m1Loser = m.M1_QUALIFIER_1.winnerId
    ? m.M1_QUALIFIER_1.teamA?.id === m.M1_QUALIFIER_1.winnerId
      ? m.M1_QUALIFIER_1.teamB
      : m.M1_QUALIFIER_1.teamA
    : null

  // 2. Check M2
  const m2Winner = m.M2_ELIMINATOR_1.winnerId
    ? m.M2_ELIMINATOR_1.teamA?.id === m.M2_ELIMINATOR_1.winnerId
      ? m.M2_ELIMINATOR_1.teamA
      : m.M2_ELIMINATOR_1.teamB
    : null

  // 3. Check M3
  const m3Winner = m.M3_ELIMINATOR_2.winnerId
    ? m.M3_ELIMINATOR_2.teamA?.id === m.M3_ELIMINATOR_2.winnerId
      ? m.M3_ELIMINATOR_2.teamA
      : m.M3_ELIMINATOR_2.teamB
    : null

  // Propagate to M4 (Quarter Final)
  m.M4_QUARTER_FINAL.teamA = m2Winner
    ? { ...m2Winner, sourceDescription: 'Eliminator 1 Winner' }
    : null
  m.M4_QUARTER_FINAL.teamB = m3Winner
    ? { ...m3Winner, sourceDescription: 'Eliminator 2 Winner' }
    : null

  // If M4 had a winner but either team changed/cleared, invalidate M4
  if (
    m.M4_QUARTER_FINAL.winnerId &&
    (!m.M4_QUARTER_FINAL.teamA ||
      !m.M4_QUARTER_FINAL.teamB ||
      (m.M4_QUARTER_FINAL.winnerId !== m.M4_QUARTER_FINAL.teamA.id &&
        m.M4_QUARTER_FINAL.winnerId !== m.M4_QUARTER_FINAL.teamB.id))
  ) {
    m.M4_QUARTER_FINAL.winnerId = null
    m.M4_QUARTER_FINAL.loserId = null
    m.M4_QUARTER_FINAL.scoreA = null
    m.M4_QUARTER_FINAL.scoreB = null
    m.M4_QUARTER_FINAL.status = 'pending'
  }

  // 4. Check M4
  const m4Winner = m.M4_QUARTER_FINAL.winnerId
    ? m.M4_QUARTER_FINAL.teamA?.id === m.M4_QUARTER_FINAL.winnerId
      ? m.M4_QUARTER_FINAL.teamA
      : m.M4_QUARTER_FINAL.teamB
    : null

  // Propagate to M5 (Semi Final)
  // Team A is M1 Loser (Double chance)
  m.M5_SEMI_FINAL.teamA = m1Loser
    ? { ...m1Loser, sourceDescription: 'Qualifier 1 Loser (2nd Chance)' }
    : null
  // Team B is M4 Winner (Quarter Final Winner)
  m.M5_SEMI_FINAL.teamB = m4Winner
    ? { ...m4Winner, sourceDescription: 'Quarter-Final Winner' }
    : null

  // If M5 had a winner but either team changed/cleared, invalidate M5
  if (
    m.M5_SEMI_FINAL.winnerId &&
    (!m.M5_SEMI_FINAL.teamA ||
      !m.M5_SEMI_FINAL.teamB ||
      (m.M5_SEMI_FINAL.winnerId !== m.M5_SEMI_FINAL.teamA.id &&
        m.M5_SEMI_FINAL.winnerId !== m.M5_SEMI_FINAL.teamB.id))
  ) {
    m.M5_SEMI_FINAL.winnerId = null
    m.M5_SEMI_FINAL.loserId = null
    m.M5_SEMI_FINAL.scoreA = null
    m.M5_SEMI_FINAL.scoreB = null
    m.M5_SEMI_FINAL.status = 'pending'
  }

  // 5. Check M5
  const m5Winner = m.M5_SEMI_FINAL.winnerId
    ? m.M5_SEMI_FINAL.teamA?.id === m.M5_SEMI_FINAL.winnerId
      ? m.M5_SEMI_FINAL.teamA
      : m.M5_SEMI_FINAL.teamB
    : null
  const m5Loser = m.M5_SEMI_FINAL.winnerId
    ? m.M5_SEMI_FINAL.teamA?.id === m.M5_SEMI_FINAL.winnerId
      ? m.M5_SEMI_FINAL.teamB
      : m.M5_SEMI_FINAL.teamA
    : null

  data.thirdPlace = m5Loser || null

  // Propagate to M6 (Grand Finale)
  // Team A is M1 Winner
  m.M6_GRAND_FINALE.teamA = m1Winner
    ? { ...m1Winner, sourceDescription: 'Qualifier 1 Winner' }
    : null
  // Team B is M5 Winner (Semi Final Winner)
  m.M6_GRAND_FINALE.teamB = m5Winner
    ? { ...m5Winner, sourceDescription: 'Semi-Final Winner' }
    : null

  // If M6 had a winner but either team changed/cleared, invalidate M6
  if (
    m.M6_GRAND_FINALE.winnerId &&
    (!m.M6_GRAND_FINALE.teamA ||
      !m.M6_GRAND_FINALE.teamB ||
      (m.M6_GRAND_FINALE.winnerId !== m.M6_GRAND_FINALE.teamA.id &&
        m.M6_GRAND_FINALE.winnerId !== m.M6_GRAND_FINALE.teamB.id))
  ) {
    m.M6_GRAND_FINALE.winnerId = null
    m.M6_GRAND_FINALE.loserId = null
    m.M6_GRAND_FINALE.scoreA = null
    m.M6_GRAND_FINALE.scoreB = null
    m.M6_GRAND_FINALE.status = 'pending'
  }

  // 6. Check M6 Champion & Runner-up
  if (m.M6_GRAND_FINALE.winnerId) {
    const winner =
      m.M6_GRAND_FINALE.teamA?.id === m.M6_GRAND_FINALE.winnerId
        ? m.M6_GRAND_FINALE.teamA
        : m.M6_GRAND_FINALE.teamB
    const loser =
      m.M6_GRAND_FINALE.teamA?.id === m.M6_GRAND_FINALE.winnerId
        ? m.M6_GRAND_FINALE.teamB
        : m.M6_GRAND_FINALE.teamA
    data.champion = winner || null
    data.runnerUp = loser || null
  } else {
    data.champion = null
    data.runnerUp = null
  }

  return data
}

/**
 * Record or update match result in playoff bracket.
 */
export function updatePlayoffMatchResult(
  current: PlayoffBracketData,
  matchId: PlayoffMatchId,
  scoreA: number,
  scoreB: number,
  winnerId: string
): PlayoffBracketData {
  const copy: PlayoffBracketData = JSON.parse(JSON.stringify(current))
  const match = copy.matches[matchId]
  if (!match) return current

  if (!match.teamA || !match.teamB) {
    throw new Error('Both teams must be determined before recording this match.')
  }

  if (winnerId !== match.teamA.id && winnerId !== match.teamB.id) {
    throw new Error('Winner must be one of the two competing teams.')
  }

  const loserId = winnerId === match.teamA.id ? match.teamB.id : match.teamA.id

  match.scoreA = scoreA
  match.scoreB = scoreB
  match.winnerId = winnerId
  match.loserId = loserId
  match.status = 'completed'
  match.completedAt = new Date().toISOString()

  return recalculatePlayoffGraph(copy)
}

/**
 * Reset match result and cascade clears downstream dependent matches.
 */
export function resetPlayoffMatchResult(
  current: PlayoffBracketData,
  matchId: PlayoffMatchId
): PlayoffBracketData {
  const copy: PlayoffBracketData = JSON.parse(JSON.stringify(current))
  const match = copy.matches[matchId]
  if (!match) return current

  match.scoreA = null
  match.scoreB = null
  match.winnerId = null
  match.loserId = null
  match.status = 'pending'
  match.completedAt = null

  return recalculatePlayoffGraph(copy)
}

/**
 * Supabase read & write operations using site_settings
 */
export async function fetchPlayoffData(seasonId: string): Promise<PlayoffBracketData | null> {
  if (!seasonId) return null
  const key = getPlayoffSettingKey(seasonId)
  return await fetchSiteSettingJson<PlayoffBracketData | null>(key, null)
}

export async function savePlayoffData(
  seasonId: string,
  data: PlayoffBracketData
): Promise<{ success: boolean; error?: string }> {
  if (!seasonId) return { success: false, error: 'Missing season ID' }
  const key = getPlayoffSettingKey(seasonId)
  return await updateSiteSettingJson(key, data)
}

export async function deletePlayoffData(
  seasonId: string
): Promise<{ success: boolean; error?: string }> {
  if (!seasonId) return { success: false, error: 'Missing season ID' }
  const key = getPlayoffSettingKey(seasonId)
  return await updateSiteSettingJson(key, null)
}
