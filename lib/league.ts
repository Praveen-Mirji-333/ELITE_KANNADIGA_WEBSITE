// Pure league scheduling / standings logic.
// No Supabase imports here so the algorithms can be tested in isolation.

import type {
  LeagueMatchResult,
  LeaguePairing,
  LeaguePairingStatus,
  LeagueSeasonTeam,
  LeagueStanding,
} from './types'

export const BYE = '__BYE__'

export interface ScheduledPair {
  round: number
  matchNumber: number
  teamAId: string
  teamBId: string
}

export interface ScheduledBye {
  round: number
  teamId: string
}

export interface ScheduleResult {
  pairs: ScheduledPair[]
  byes: ScheduledBye[]
  roundCount: number
  target: number
  warnings: string[]
}

export interface PairingDraft {
  id?: string
  round_number: number
  team_a_id: string
  team_b_id: string
  status: LeaguePairingStatus
}

/** Stable key for an unordered pair of teams. */
export function pairKey(teamA: string, teamB: string): string {
  return [teamA, teamB].sort().join('::')
}

/** Human readable match label, e.g. S2-R3-M04. */
export function matchCode(seasonNumber: number, round: number, matchNumber: number): string {
  const pad = (value: number, size = 2) => String(value).padStart(size, '0')
  return `S${seasonNumber}-R${pad(round)}-M${pad(matchNumber)}`
}

/** Fisher-Yates shuffle on a copy. */
export function shuffle<T>(items: T[], random: () => number = Math.random): T[] {
  const arr = [...items]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    const tmp = arr[i]
    arr[i] = arr[j]
    arr[j] = tmp
  }
  return arr
}

/** Pick a random integer in [0, length). Returns -1 for an empty pool. */
export function randomIndex(length: number, random: () => number = Math.random): number {
  if (length <= 0) return -1
  return Math.floor(random() * length)
}

/**
 * Build a complete pre-generated schedule.
 *
 * Uses the circle (polygon) method for the first `target` rounds, which
 * guarantees:
 *   - every team appears at most once per round
 *   - no pair of teams ever meets twice
 *   - every team receives `target` matches when the team count is even
 *
 * Odd team counts add one BYE per round (math: N * target must be even for
 * every team to reach the target). A catch-up round then pairs the teams
 * that fell one match short, so at most one team finishes below target.
 *
 * If a catch-up round cannot be built without a repeat, the remaining
 * teams simply stay one match short and a warning is returned.
 */
export function buildSchedule(teamIds: string[], matchesPerTeam = 5): ScheduleResult {
  const unique = Array.from(new Set(teamIds.filter(Boolean)))
  const warnings: string[] = []
  const n = unique.length

  if (n < 2) {
    return {
      pairs: [],
      byes: [],
      roundCount: 0,
      target: 0,
      warnings: ['At least 2 teams are required to build a schedule.'],
    }
  }

  const requested = Math.max(1, Math.floor(matchesPerTeam))
  const target = Math.min(requested, n - 1)
  if (target < requested) {
    warnings.push(
      `Only ${n} teams are in this season, so each team can face at most ${target} unique opponents. Target reduced from ${requested} to ${target}.`
    )
  }

  if (n % 2 === 1) {
    if (target % 2 === 1) {
      warnings.push(
        `Odd team count (${n}) with a ${target}-match target: a perfect schedule is impossible. A catch-up round will be added, and one team will finish with ${target - 1} matches.`
      )
    } else {
      warnings.push(
        `Odd team count (${n}): every round has one bye. A catch-up round will bring every team to ${target} matches.`
      )
    }
  }

  const ids = shuffle(unique)
  const ring = n % 2 === 0 ? [...ids] : [...ids, BYE]
  const pairs: ScheduledPair[] = []
  const byes: ScheduledBye[] = []
  const used = new Set<string>()
  const degree = new Map<string, number>(ids.map((id) => [id, 0]))

  const roundsToBuild = Math.min(target, ring.length - 1)

  for (let r = 0; r < roundsToBuild; r++) {
    let matchNumber = 0
    for (let i = 0; i < ring.length / 2; i++) {
      const a = ring[i]
      const b = ring[ring.length - 1 - i]

      if (a === BYE || b === BYE) {
        const teamId = a === BYE ? b : a
        if (teamId !== BYE) byes.push({ round: r + 1, teamId })
        continue
      }

      const key = pairKey(a, b)
      // The circle method cannot repeat a pair; this guard is defensive.
      if (used.has(key)) continue
      used.add(key)
      degree.set(a, (degree.get(a) || 0) + 1)
      degree.set(b, (degree.get(b) || 0) + 1)
      pairs.push({
        round: r + 1,
        matchNumber: ++matchNumber,
        teamAId: a,
        teamBId: b,
      })
    }

    // Rotate every team except the first one.
    const last = ring.pop()
    if (last !== undefined) ring.splice(1, 0, last)
  }

  // Catch-up round for odd team counts / targets that leave teams short.
  const under = ids.filter((id) => (degree.get(id) || 0) < target)
  if (under.length >= 2) {
    const catchUp = pairUnderTarget(under, used)
    if (catchUp.length > 0) {
      const round = roundsToBuild + 1
      let matchNumber = 0
      for (const [a, b] of catchUp) {
        used.add(pairKey(a, b))
        degree.set(a, (degree.get(a) || 0) + 1)
        degree.set(b, (degree.get(b) || 0) + 1)
        pairs.push({
          round,
          matchNumber: ++matchNumber,
          teamAId: a,
          teamBId: b,
        })
      }
    }

    const stillShort = ids.filter((id) => (degree.get(id) || 0) < target)
    if (stillShort.length > 1) {
      warnings.push(
        `${stillShort.length} teams could not reach ${target} unique matches without repeating an opponent.`
      )
    }
  }

  const roundCount = pairs.reduce((max, pair) => Math.max(max, pair.round), 0)
  return { pairs, byes, roundCount, target, warnings }
}

/**
 * Maximum matching among the teams that are still below target. Returns the
 * largest set of non-repeating pairs.
 *
 * The under-target list is at most `matches_per_team` (which the database
 * caps at 20), so an exact bitmask DP is both fast and reliable. A greedy
 * pass is not enough here: it can leave three teams a match short on odd
 * team counts.
 */
function pairUnderTarget(teams: string[], used: Set<string>): Array<[string, string]> {
  const pool = shuffle(teams)
  const n = pool.length
  if (n < 2) return []

  // available[i] is a bitmask of teams i can still play.
  const available = pool.map((team, index) => {
    let mask = 0
    for (let other = 0; other < n; other++) {
      if (other === index) continue
      if (!used.has(pairKey(team, pool[other]))) mask |= 1 << other
    }
    return mask
  })

  const memo = new Map<number, number>()
  const choice = new Map<number, number>()

  const solve = (mask: number): number => {
    if (mask === 0) return 0
    const cached = memo.get(mask)
    if (cached !== undefined) return cached

    const firstBit = mask & -mask
    const first = Math.log2(firstBit) | 0

    // Leave the first available team unmatched.
    let best = solve(mask & ~firstBit)
    let bestPartner = -1

    let partners = available[first] & mask & ~firstBit
    while (partners) {
      const partnerBit = partners & -partners
      const partner = Math.log2(partnerBit) | 0
      const candidate = 1 + solve(mask & ~firstBit & ~partnerBit)
      if (candidate > best) {
        best = candidate
        bestPartner = partner
      }
      partners &= partners - 1
    }

    memo.set(mask, best)
    choice.set(mask, bestPartner)
    return best
  }

  let mask = (1 << n) - 1
  solve(mask)

  const result: Array<[string, string]> = []
  while (mask) {
    const firstBit = mask & -mask
    const first = Math.log2(firstBit) | 0
    const partner = choice.get(mask) ?? -1

    if (partner >= 0) {
      result.push([pool[first], pool[partner]])
      mask &= ~firstBit
      mask &= ~(1 << partner)
    } else {
      mask &= ~firstBit
    }
  }

  return result
}

export interface PairingValidation {
  ok: boolean
  error?: string
}

/**
 * Validate a manual pairing against the current schedule. The database
 * trigger enforces the same rules, but this gives instant UI feedback.
 */
export function validatePairing(params: {
  teamAId: string
  teamBId: string
  round: number
  pairings: PairingDraft[]
  matchesPerTeam: number
  maxRound: number
  excludeId?: string
}): PairingValidation {
  const { teamAId, teamBId, round, pairings, matchesPerTeam, maxRound, excludeId } = params

  if (!teamAId || !teamBId) return { ok: false, error: 'Select both teams.' }
  if (teamAId === teamBId) return { ok: false, error: 'A team cannot play itself.' }
  if (!Number.isFinite(round) || round < 1 || round > maxRound) {
    return { ok: false, error: `Round must be between 1 and ${maxRound}.` }
  }

  const active = pairings.filter(
    (p) => p.status !== 'cancelled' && (!excludeId || p.id !== excludeId)
  )

  if (
    active.some(
      (p) =>
        p.round_number === round &&
        (p.team_a_id === teamAId ||
          p.team_b_id === teamAId ||
          p.team_a_id === teamBId ||
          p.team_b_id === teamBId)
    )
  ) {
    return { ok: false, error: 'One of these teams already has a match in this round.' }
  }

  const targetKey = pairKey(teamAId, teamBId)
  if (active.some((p) => pairKey(p.team_a_id, p.team_b_id) === targetKey)) {
    return { ok: false, error: 'These teams have already been paired this season.' }
  }

  const countA = active.filter((p) => p.team_a_id === teamAId || p.team_b_id === teamAId).length
  if (countA >= matchesPerTeam) {
    return { ok: false, error: `Team A has already reached ${matchesPerTeam} matches.` }
  }

  const countB = active.filter((p) => p.team_a_id === teamBId || p.team_b_id === teamBId).length
  if (countB >= matchesPerTeam) {
    return { ok: false, error: `Team B has already reached ${matchesPerTeam} matches.` }
  }

  return { ok: true }
}

/**
 * Build standings from completed pairings + results. Standings are always
 * derived on read so editing or deleting a result can never leave stale
 * totals behind.
 */
export function computeStandings(
  teams: Pick<LeagueSeasonTeam, 'registration_id' | 'team_name'>[],
  pairings: LeaguePairing[],
  results: LeagueMatchResult[],
  winPoints = 3
): LeagueStanding[] {
  const table = new Map<string, LeagueStanding>()

  for (const team of teams) {
    table.set(team.registration_id, {
      teamId: team.registration_id,
      teamName: team.team_name,
      played: 0,
      wins: 0,
      losses: 0,
      points: 0,
      roundsLost: 0,
      scoreFor: 0,
      scoreAgainst: 0,
      diff: 0,
      rank: 0,
    })
  }

  const resultByPairing = new Map(results.map((result) => [result.pairing_id, result]))

  for (const pairing of pairings) {
    if (pairing.status !== 'completed') continue

    const result = resultByPairing.get(pairing.id)
    if (!result) continue

    const teamA = table.get(pairing.team_a_id)
    const teamB = table.get(pairing.team_b_id)
    if (!teamA || !teamB) continue

    teamA.played += 1
    teamB.played += 1

    teamA.scoreFor += result.team_a_score
    teamA.scoreAgainst += result.team_b_score
    teamB.scoreFor += result.team_b_score
    teamB.scoreAgainst += result.team_a_score

    const aLost = result.team_a_rounds_lost ?? 0
    const bLost = result.team_b_rounds_lost ?? 0
    teamA.roundsLost += aLost
    teamB.roundsLost += bLost

    if (result.winner_id === pairing.team_a_id) {
      teamA.wins += 1
      teamA.points += winPoints
      teamB.losses += 1
    } else {
      teamB.wins += 1
      teamB.points += winPoints
      teamA.losses += 1
    }
  }

  const standings = Array.from(table.values())
  for (const row of standings) row.diff = row.scoreFor - row.scoreAgainst

  // Priority 1: Points (descending)
  // Priority 2: Rounds Lost (ascending - team with MORE rounds lost stays at bottom)
  // Priority 3: Goal/Score Diff (descending)
  // Priority 4: Score For (descending)
  // Priority 5: Total Wins (descending)
  // Tie-break fallback: alphabetical by team name
  standings.sort(
    (a, b) =>
      b.points - a.points ||
      a.roundsLost - b.roundsLost ||
      b.diff - a.diff ||
      b.scoreFor - a.scoreFor ||
      b.wins - a.wins ||
      a.teamName.localeCompare(b.teamName)
  )

  return standings.map((row, index) => ({ ...row, rank: index + 1 }))
}

/** Round numbers that currently contain at least one pairing. */
export function usedRounds(pairings: LeaguePairing[]): number[] {
  return Array.from(new Set(pairings.map((pairing) => pairing.round_number))).sort((a, b) => a - b)
}
