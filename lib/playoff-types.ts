export type PlayoffMatchId =
  | 'M1_QUALIFIER_1'
  | 'M2_ELIMINATOR_1'
  | 'M3_ELIMINATOR_2'
  | 'M4_QUARTER_FINAL'
  | 'M5_SEMI_FINAL'
  | 'M6_GRAND_FINALE'

export interface PlayoffParticipant {
  id: string
  name: string
  seedRank?: number
  sourceDescription: string
  isTBD?: boolean
}

export interface PlayoffMatchState {
  id: PlayoffMatchId
  matchNumber: number
  stageName: string
  shortLabel: string
  tagline: string
  ruleExplanation: string
  teamA: PlayoffParticipant | null
  teamB: PlayoffParticipant | null
  scoreA?: number | null
  scoreB?: number | null
  winnerId?: string | null
  loserId?: string | null
  status: 'pending' | 'completed'
  completedAt?: string | null
  scheduledTime?: string | null
}

export interface PlayoffBracketData {
  seasonId: string
  tournamentId: string
  finalizedAt: string
  finalizedBy?: string
  top6Teams: PlayoffParticipant[]
  matches: Record<PlayoffMatchId, PlayoffMatchState>
  champion?: PlayoffParticipant | null
  runnerUp?: PlayoffParticipant | null
  thirdPlace?: PlayoffParticipant | null
}
