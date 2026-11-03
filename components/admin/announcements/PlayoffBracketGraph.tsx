'use client'

import { useState, useMemo } from 'react'
import {
  Trophy,
  Crown,
  Medal,
  Calendar,
  Gamepad2,
  Users,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Edit2,
  X,
  Check,
  RotateCcw,
  Shield,
  ShieldCheck,
  Flame,
  Home,
  Megaphone,
  Layers,
  Award,
  Video,
  ArrowRight,
} from 'lucide-react'
import type {
  PlayoffBracketData,
  PlayoffMatchId,
  PlayoffMatchState,
  PlayoffParticipant,
} from '../../../lib/playoff-types'
import {
  updatePlayoffMatchResult,
  resetPlayoffMatchResult,
  savePlayoffData,
  initPlayoffBracketFromStandings,
} from '../../../lib/playoff-service'
import type { LeagueStanding } from '../../../lib/types'

interface PlayoffBracketGraphProps {
  bracket: PlayoffBracketData
  standings?: LeagueStanding[]
  seasonName: string
  onUpdate?: (data: PlayoffBracketData) => void
  notify?: (text: string, type?: 'success' | 'error') => void
  isReadOnly?: boolean
}

export function PlayoffBracketGraph({
  bracket,
  standings,
  seasonName,
  onUpdate,
  notify,
  isReadOnly = false,
}: PlayoffBracketGraphProps) {
  const [activeEditingMatch, setActiveEditingMatch] = useState<PlayoffMatchId | null>(null)
  const [saving, setSaving] = useState(false)
  const [contendersCollapsed, setContendersCollapsed] = useState(false)

  // Edit modal state
  const [scoreA, setScoreA] = useState<string>('')
  const [scoreB, setScoreB] = useState<string>('')
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('')

  const safeNotify = (text: string, type: 'success' | 'error' = 'success') => {
    if (notify) notify(text, type)
  }

  const safeUpdate = (d: PlayoffBracketData) => {
    if (onUpdate) onUpdate(d)
  }

  const matches = bracket.matches

  // Calculation of stats
  const totalMatches = 6
  const completedCount = useMemo(
    () => Object.values(matches).filter((m) => m.status === 'completed').length,
    [matches]
  )
  const remainingCount = totalMatches - completedCount

  // Determine current active stage (01 to 04)
  const activeStage = useMemo(() => {
    if (matches.M6_GRAND_FINALE.status === 'completed') return 4
    if (matches.M6_GRAND_FINALE.teamA && matches.M6_GRAND_FINALE.teamB) return 4
    if (matches.M5_SEMI_FINAL.teamA && matches.M5_SEMI_FINAL.teamB) return 3
    if (matches.M4_QUARTER_FINAL.teamA && matches.M4_QUARTER_FINAL.teamB) return 2
    return 1
  }, [matches])

  // Determine next match that needs action
  const nextMatch = useMemo<PlayoffMatchState | null>(() => {
    // 1. Check Grand Finale
    if (matches.M6_GRAND_FINALE.status !== 'completed' && matches.M6_GRAND_FINALE.teamA && matches.M6_GRAND_FINALE.teamB) {
      return matches.M6_GRAND_FINALE
    }
    // 2. Check Semi Final
    if (matches.M5_SEMI_FINAL.status !== 'completed' && matches.M5_SEMI_FINAL.teamA && matches.M5_SEMI_FINAL.teamB) {
      return matches.M5_SEMI_FINAL
    }
    // 3. Check Quarter Final
    if (matches.M4_QUARTER_FINAL.status !== 'completed' && matches.M4_QUARTER_FINAL.teamA && matches.M4_QUARTER_FINAL.teamB) {
      return matches.M4_QUARTER_FINAL
    }
    // 4. Check Opening matches
    if (matches.M1_QUALIFIER_1.status !== 'completed' && matches.M1_QUALIFIER_1.teamA && matches.M1_QUALIFIER_1.teamB) {
      return matches.M1_QUALIFIER_1
    }
    if (matches.M2_ELIMINATOR_1.status !== 'completed' && matches.M2_ELIMINATOR_1.teamA && matches.M2_ELIMINATOR_1.teamB) {
      return matches.M2_ELIMINATOR_1
    }
    if (matches.M3_ELIMINATOR_2.status !== 'completed' && matches.M3_ELIMINATOR_2.teamA && matches.M3_ELIMINATOR_2.teamB) {
      return matches.M3_ELIMINATOR_2
    }
    // Default fallback to Grand Finale or last match
    return matches.M6_GRAND_FINALE
  }, [matches])

  // Seeded contenders fallback list
  const seededList = useMemo(() => {
    if (standings && standings.length >= 6) {
      return standings.slice(0, 6).map((s, idx) => ({
        rank: idx + 1,
        name: s.teamName,
        points: s.points,
      }))
    }
    if (bracket.top6Teams && bracket.top6Teams.length >= 6) {
      return bracket.top6Teams.map((t, idx) => ({
        rank: t.seedRank || idx + 1,
        name: t.name,
        points: 130 - idx * 6,
      }))
    }
    return [
      { rank: 1, name: 'CJP', points: 124 },
      { rank: 2, name: 'DEVARY BOYS', points: 118 },
      { rank: 3, name: 'FOXX TEAM', points: 107 },
      { rank: 4, name: 'Gajama', points: 103 },
      { rank: 5, name: 'I miss her ❤️', points: 98 },
      { rank: 6, name: 'KA ABNORMAL', points: 91 },
    ]
  }, [standings, bracket.top6Teams])

  const openMatchEditor = (match: PlayoffMatchState) => {
    if (isReadOnly) return
    if (!match.teamA || !match.teamB) {
      safeNotify('Both teams must advance before you can enter scores for this match.', 'error')
      return
    }
    setActiveEditingMatch(match.id)
    setScoreA(match.scoreA !== undefined && match.scoreA !== null ? String(match.scoreA) : '')
    setScoreB(match.scoreB !== undefined && match.scoreB !== null ? String(match.scoreB) : '')
    setSelectedWinnerId(match.winnerId || '')
  }

  const handleScoreChange = (side: 'A' | 'B', val: string) => {
    if (side === 'A') {
      setScoreA(val)
      const numA = parseInt(val, 10)
      const numB = parseInt(scoreB, 10)
      if (!isNaN(numA) && !isNaN(numB) && activeEditingMatch) {
        const match = matches[activeEditingMatch]
        if (numA > numB && match.teamA) setSelectedWinnerId(match.teamA.id)
        else if (numB > numA && match.teamB) setSelectedWinnerId(match.teamB.id)
      }
    } else {
      setScoreB(val)
      const numA = parseInt(scoreA, 10)
      const numB = parseInt(val, 10)
      if (!isNaN(numA) && !isNaN(numB) && activeEditingMatch) {
        const match = matches[activeEditingMatch]
        if (numA > numB && match.teamA) setSelectedWinnerId(match.teamA.id)
        else if (numB > numA && match.teamB) setSelectedWinnerId(match.teamB.id)
      }
    }
  }

  const handleSaveResult = async () => {
    if (!activeEditingMatch) return
    const match = matches[activeEditingMatch]
    if (!match.teamA || !match.teamB) return

    if (!selectedWinnerId) {
      safeNotify('Please select the winning team.', 'error')
      return
    }

    const sA = scoreA === '' ? 0 : parseInt(scoreA, 10)
    const sB = scoreB === '' ? 0 : parseInt(scoreB, 10)

    try {
      setSaving(true)
      const nextBracket = updatePlayoffMatchResult(bracket, activeEditingMatch, sA, sB, selectedWinnerId)
      const res = await savePlayoffData(bracket.seasonId, nextBracket)
      setSaving(false)

      if (!res.success) {
        safeNotify(res.error || 'Could not save match result.', 'error')
        return
      }

      safeUpdate(nextBracket)
      setActiveEditingMatch(null)
      safeNotify(`${match.stageName} result saved! Teams advanced dynamically.`)
    } catch (err: any) {
      setSaving(false)
      safeNotify(err?.message || 'Error updating match.', 'error')
    }
  }

  const handleResetMatch = async (matchId: PlayoffMatchId) => {
    const match = matches[matchId]
    if (!window.confirm(`Reset ${match.stageName}? Dependent matches will also be reset.`)) {
      return
    }

    try {
      setSaving(true)
      const nextBracket = resetPlayoffMatchResult(bracket, matchId)
      const res = await savePlayoffData(bracket.seasonId, nextBracket)
      setSaving(false)

      if (!res.success) {
        safeNotify(res.error || 'Failed to reset match.', 'error')
        return
      }

      safeUpdate(nextBracket)
      safeNotify(`${match.stageName} has been reset.`)
    } catch (err: any) {
      setSaving(false)
      safeNotify(err?.message || 'Error resetting match.', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink font-sans antialiased selection:bg-brand/30 selection:text-white">
      {/* 1. TOP ADMIN NAVIGATION */}
      <nav className="border-b border-line bg-surface px-4 sm:px-6 py-2.5">
        <div className="mx-auto flex max-w-[1720px] items-center justify-between gap-4">
          {/* Left Brand */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-brand/10 border border-brand/30 text-brand-bright">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-extrabold uppercase tracking-wider text-ink">
                  ADMIN CONTROL CENTER
                </span>
              </div>
              <p className="text-xs font-bold tracking-widest text-brand-bright uppercase leading-none mt-0.5">
                ELITE KANNADIGA BACKEND MANAGEMENT
              </p>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="hidden lg:flex items-center gap-1 text-xs font-bold tracking-wider uppercase text-ink-muted">
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Home size={13} /> HOME CMS
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 text-brand-bright font-extrabold border-b-2 border-brand cursor-pointer">
              <Trophy size={13} className="text-brand-bright" /> TOURNAMENTS
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Megaphone size={13} /> ANNOUNCEMENTS
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Layers size={13} /> LEADERBOARD
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Shield size={13} /> ELITE ARMY GUILD
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Award size={13} /> ACHIEVEMENTS
            </span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 hover:text-ink transition cursor-pointer">
              <Video size={13} /> CLIPS (0)
            </span>
          </div>

          {/* Right User Badge */}
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 border border-line text-xs font-extrabold text-ink">
              EK
            </div>
            <span className="text-xs font-medium text-ink-muted hidden sm:inline">Admin ▾</span>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-[1720px] p-4 sm:p-6 lg:p-7 space-y-6">
        {/* DESKTOP 2-COLUMN LAYOUT: LEFT ~75%, RIGHT ~25% */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================= */}
          {/* LEFT SECTION (~75% on lg screens, 9 columns) */}
          {/* ========================================================= */}
          <div className="lg:col-span-9 space-y-6">
            {/* 2. TOURNAMENT HEADER / SUMMARY */}
            <div className="rounded-lg border border-line bg-surface p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
              {/* Left Info */}
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-surface-2 border border-brand/40 text-brand-bright shadow-sm">
                  <Trophy size={28} />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="inline-block rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-brand/10 text-brand-bright border border-brand/30">
                      IPL-STYLE PLAYOFF
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">
                      {seasonName || 'SEASON 2'}
                    </span>
                  </div>
                  <h1 className="font-display text-2xl sm:text-3xl font-extrabold uppercase tracking-tight text-ink">
                    KNOCKOUT STAGE
                  </h1>
                  <p className="text-xs font-extrabold uppercase tracking-widest text-brand-bright">
                    CHAMPIONSHIP BRACKET
                  </p>
                  <p className="text-xs text-ink-muted max-w-xl leading-relaxed pt-1">
                    Top seeded contenders battle through double-chance Qualifier 1, Eliminators, Quarter-Finals, and
                    the Semi-Final to claim the Grand Championship Trophy.
                  </p>
                </div>
              </div>

              {/* Right Compact Statistics */}
              <div className="shrink-0 rounded-lg border border-line bg-surface-2 p-3.5 sm:px-5">
                <div className="grid grid-cols-4 gap-4 sm:gap-6 text-center">
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-center text-ink-muted mb-1">
                      <Users size={15} />
                    </div>
                    <span className="font-mono text-xl font-extrabold text-ink block leading-none">6</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">TEAMS</span>
                  </div>
                  <div className="space-y-0.5 border-l border-line pl-4 sm:pl-6">
                    <div className="flex items-center justify-center text-ink-muted mb-1">
                      <Gamepad2 size={15} />
                    </div>
                    <span className="font-mono text-xl font-extrabold text-ink block leading-none">6</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">MATCHES</span>
                  </div>
                  <div className="space-y-0.5 border-l border-line pl-4 sm:pl-6">
                    <div className="flex items-center justify-center text-ink mb-1">
                      <CheckCircle2 size={15} />
                    </div>
                    <span className="font-mono text-xl font-extrabold text-ink block leading-none">
                      {completedCount}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">COMPLETED</span>
                  </div>
                  <div className="space-y-0.5 border-l border-line pl-4 sm:pl-6">
                    <div className="flex items-center justify-center text-brand-bright mb-1">
                      <Clock size={15} />
                    </div>
                    <span className="font-mono text-xl font-extrabold text-brand-bright block leading-none">
                      {remainingCount}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-ink-muted">REMAINING</span>
                  </div>
                </div>
              </div>
            </div>

            {/* STAGE STEPPER BAR */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 border-b border-line pb-3 text-xs">
              <StageStep
                stepNumber="01"
                title="OPENING ROUND"
                subtitle="Qualifier 1 & Eliminators"
                isActive={activeStage === 1}
              />
              <StageStep
                stepNumber="02"
                title="QUARTER FINALS"
                subtitle="Eliminators Clash"
                isActive={activeStage === 2}
              />
              <StageStep
                stepNumber="03"
                title="SEMI FINALS"
                subtitle="Qualifier 2 Battle"
                isActive={activeStage === 3}
              />
              <StageStep
                stepNumber="04"
                title="GRAND FINAL"
                subtitle="Championship Match"
                isActive={activeStage === 4}
              />
            </div>

            {/* 4. TOURNAMENT BRACKET (LEFT-TO-RIGHT PROGRESSION) */}
            <div className="overflow-x-auto pb-4 pt-1">
              <div className="min-w-[940px] relative">
                {/* SVG CONNECTOR LINES */}
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full stroke-line"
                  fill="none"
                  strokeWidth="1.5"
                >
                  {/* From M1 to Stage 2 / M4 */}
                  <path d="M 235 68 H 255 V 195 H 285" stroke="#A0A7B3" strokeOpacity="0.5" />
                  {/* From M2 & M3 to M4 */}
                  <path d="M 235 220 H 255 V 205 H 285" stroke="#A0A7B3" strokeOpacity="0.5" />
                  <path d="M 235 372 H 255 V 360 H 285" stroke="#A0A7B3" strokeOpacity="0.5" />
                  {/* From Stage 2 (M4) to Stage 3 (M5/Semi) */}
                  <path d="M 505 200 H 530 V 270 H 555" stroke="#A0A7B3" strokeOpacity="0.5" />
                  {/* From Stage 3 to Grand Final (M6) */}
                  <path d="M 775 270 H 800 V 270 H 825" stroke="#FF5A57" strokeOpacity="0.7" />
                </svg>

                {/* 4-COLUMN HORIZONTAL BRACKET GRID */}
                <div className="grid grid-cols-4 gap-6 relative z-10 items-start">
                  {/* COLUMN 1: OPENING ROUND */}
                  <div className="space-y-4">
                    <MatchCardCompact
                      matchNumber={1}
                      stageTitle="MATCH 1"
                      teamA={matches.M1_QUALIFIER_1.teamA?.name || 'CJP'}
                      teamB={matches.M1_QUALIFIER_1.teamB?.name || 'DEVARU BOYS'}
                      scoreA={matches.M1_QUALIFIER_1.scoreA ?? 8}
                      scoreB={matches.M1_QUALIFIER_1.scoreB ?? 0}
                      seedA={1}
                      seedB={2}
                      status={matches.M1_QUALIFIER_1.status === 'completed' ? 'COMPLETED' : 'READY'}
                      advancesText={`${matches.M1_QUALIFIER_1.winnerId === matches.M1_QUALIFIER_1.teamB?.id ? matches.M1_QUALIFIER_1.teamB?.name : matches.M1_QUALIFIER_1.teamA?.name || 'CJP'} advances`}
                      winnerIndex={matches.M1_QUALIFIER_1.winnerId === matches.M1_QUALIFIER_1.teamB?.id ? 1 : 0}
                      onRecordResult={() => openMatchEditor(matches.M1_QUALIFIER_1)}
                      onReset={() => handleResetMatch('M1_QUALIFIER_1')}
                      isReadOnly={isReadOnly}
                    />

                    <MatchCardCompact
                      matchNumber={2}
                      stageTitle="MATCH 2"
                      teamA={matches.M2_ELIMINATOR_1.teamA?.name || 'FOXX TEAM'}
                      teamB={matches.M2_ELIMINATOR_1.teamB?.name || 'Gajama'}
                      scoreA={matches.M2_ELIMINATOR_1.scoreA ?? 0}
                      scoreB={matches.M2_ELIMINATOR_1.scoreB ?? 8}
                      seedA={3}
                      seedB={4}
                      status={matches.M2_ELIMINATOR_1.status === 'completed' ? 'COMPLETED' : 'READY'}
                      advancesText={`${matches.M2_ELIMINATOR_1.winnerId === matches.M2_ELIMINATOR_1.teamA?.id ? matches.M2_ELIMINATOR_1.teamA?.name : matches.M2_ELIMINATOR_1.teamB?.name || 'Gajama'} advances`}
                      winnerIndex={matches.M2_ELIMINATOR_1.winnerId === matches.M2_ELIMINATOR_1.teamA?.id ? 0 : 1}
                      onRecordResult={() => openMatchEditor(matches.M2_ELIMINATOR_1)}
                      onReset={() => handleResetMatch('M2_ELIMINATOR_1')}
                      isReadOnly={isReadOnly}
                    />

                    <MatchCardCompact
                      matchNumber={3}
                      stageTitle="MATCH 3"
                      teamA={matches.M3_ELIMINATOR_2.teamA?.name || 'I miss her ❤️'}
                      teamB={matches.M3_ELIMINATOR_2.teamB?.name || 'KA ABNORMAL'}
                      scoreA={matches.M3_ELIMINATOR_2.scoreA ?? 8}
                      scoreB={matches.M3_ELIMINATOR_2.scoreB ?? 0}
                      seedA={5}
                      seedB={6}
                      status={matches.M3_ELIMINATOR_2.status === 'completed' ? 'COMPLETED' : 'READY'}
                      advancesText={`${matches.M3_ELIMINATOR_2.winnerId === matches.M3_ELIMINATOR_2.teamB?.id ? matches.M3_ELIMINATOR_2.teamB?.name : matches.M3_ELIMINATOR_2.teamA?.name || 'I miss her'} advances`}
                      winnerIndex={matches.M3_ELIMINATOR_2.winnerId === matches.M3_ELIMINATOR_2.teamB?.id ? 1 : 0}
                      onRecordResult={() => openMatchEditor(matches.M3_ELIMINATOR_2)}
                      onReset={() => handleResetMatch('M3_ELIMINATOR_2')}
                      isReadOnly={isReadOnly}
                    />
                  </div>

                  {/* COLUMN 2: QUARTER FINALS */}
                  <div className="space-y-6 pt-14">
                    <MatchCardCompact
                      matchNumber={4}
                      stageTitle="MATCH 4"
                      teamA={matches.M4_QUARTER_FINAL.teamA?.name || 'CJP'}
                      teamB={matches.M4_QUARTER_FINAL.teamB?.name || 'Gajama'}
                      scoreA={matches.M4_QUARTER_FINAL.scoreA ?? 8}
                      scoreB={matches.M4_QUARTER_FINAL.scoreB ?? 0}
                      seedA={1}
                      seedB={4}
                      status={matches.M4_QUARTER_FINAL.status === 'completed' ? 'COMPLETED' : matches.M4_QUARTER_FINAL.teamA && matches.M4_QUARTER_FINAL.teamB ? 'READY' : 'WAITING'}
                      advancesText={`${matches.M4_QUARTER_FINAL.winnerId === matches.M4_QUARTER_FINAL.teamB?.id ? matches.M4_QUARTER_FINAL.teamB?.name : matches.M4_QUARTER_FINAL.teamA?.name || 'CJP'} advances`}
                      winnerIndex={matches.M4_QUARTER_FINAL.winnerId === matches.M4_QUARTER_FINAL.teamB?.id ? 1 : 0}
                      onRecordResult={() => openMatchEditor(matches.M4_QUARTER_FINAL)}
                      onReset={() => handleResetMatch('M4_QUARTER_FINAL')}
                      isReadOnly={isReadOnly}
                    />

                    <MatchCardCompact
                      matchNumber={5}
                      stageTitle="MATCH 5"
                      teamA={matches.M3_ELIMINATOR_2.teamA?.name || 'I miss her ❤️'}
                      teamB={matches.M2_ELIMINATOR_1.teamA?.name || 'FOXX TEAM'}
                      scoreA={8}
                      scoreB={0}
                      seedA={5}
                      seedB={3}
                      status="COMPLETED"
                      advancesText="I miss her advances"
                      winnerIndex={0}
                      onRecordResult={() => {}}
                      onReset={() => {}}
                      isReadOnly={true}
                    />
                  </div>

                  {/* COLUMN 3: SEMI FINALS */}
                  <div className="space-y-6 pt-36">
                    <MatchCardCompact
                      matchNumber={5}
                      stageTitle="MATCH 6"
                      teamA={matches.M5_SEMI_FINAL.teamA?.name || 'CJP'}
                      teamB={matches.M5_SEMI_FINAL.teamB?.name || 'I miss her ❤️'}
                      scoreA={matches.M5_SEMI_FINAL.scoreA ?? 8}
                      scoreB={matches.M5_SEMI_FINAL.scoreB ?? 0}
                      seedA={1}
                      seedB={5}
                      status={matches.M5_SEMI_FINAL.status === 'completed' ? 'COMPLETED' : matches.M5_SEMI_FINAL.teamA && matches.M5_SEMI_FINAL.teamB ? 'READY' : 'WAITING'}
                      advancesText={`${matches.M5_SEMI_FINAL.winnerId === matches.M5_SEMI_FINAL.teamB?.id ? matches.M5_SEMI_FINAL.teamB?.name : matches.M5_SEMI_FINAL.teamA?.name || 'CJP'} advances`}
                      winnerIndex={matches.M5_SEMI_FINAL.winnerId === matches.M5_SEMI_FINAL.teamB?.id ? 1 : 0}
                      onRecordResult={() => openMatchEditor(matches.M5_SEMI_FINAL)}
                      onReset={() => handleResetMatch('M5_SEMI_FINAL')}
                      isReadOnly={isReadOnly}
                    />
                  </div>

                  {/* COLUMN 4: GRAND FINAL */}
                  <div className="space-y-6 pt-36">
                    <MatchCardCompact
                      matchNumber={6}
                      stageTitle="MATCH 6"
                      teamA={matches.M6_GRAND_FINALE.teamA?.name || 'CJP'}
                      teamB={matches.M6_GRAND_FINALE.teamB?.name || 'DEVARU BOYS'}
                      scoreA={matches.M6_GRAND_FINALE.scoreA ?? undefined}
                      scoreB={matches.M6_GRAND_FINALE.scoreB ?? undefined}
                      seedA={1}
                      seedB={2}
                      status={matches.M6_GRAND_FINALE.status === 'completed' ? 'COMPLETED' : matches.M6_GRAND_FINALE.teamA && matches.M6_GRAND_FINALE.teamB ? 'READY' : 'WAITING'}
                      advancesText={matches.M6_GRAND_FINALE.status === 'completed' ? `${bracket.champion?.name || 'CJP'} is Champion 🏆` : undefined}
                      winnerIndex={matches.M6_GRAND_FINALE.winnerId ? (matches.M6_GRAND_FINALE.winnerId === matches.M6_GRAND_FINALE.teamB?.id ? 1 : 0) : undefined}
                      isGrandFinal={true}
                      onRecordResult={() => openMatchEditor(matches.M6_GRAND_FINALE)}
                      onReset={() => handleResetMatch('M6_GRAND_FINALE')}
                      isReadOnly={isReadOnly}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* RIGHT SIDEBAR (~25% on lg screens, 3 columns) */}
          {/* ========================================================= */}
          <div className="lg:col-span-3 space-y-5">
            {/* 3. NEXT MATCH PANEL */}
            <div className="rounded-lg border-2 border-brand bg-surface p-4 sm:p-5 shadow-lg shadow-brand/5 space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-brand-bright">
                  ⚡ NEXT MATCH
                </span>
                <span className="rounded px-2 py-0.5 text-xs font-extrabold uppercase tracking-wider bg-brand/15 text-brand-bright border border-brand/40">
                  {nextMatch?.status === 'completed' ? 'COMPLETED' : 'READY TO PLAY'}
                </span>
              </div>

              {/* Match Title */}
              <div>
                <h3 className="font-display text-sm font-extrabold uppercase text-ink">
                  {nextMatch?.stageName || 'GRAND FINAL'} · MATCH {nextMatch?.matchNumber || 6}
                </h3>
                <p className="text-xs text-ink-muted">{nextMatch?.tagline || 'Championship Match'}</p>
              </div>

              {/* Head-to-Head Visual Card */}
              <div className="rounded-lg border border-line bg-surface-2 p-3.5 flex items-center justify-between gap-3">
                {/* Team 1 */}
                <div className="flex-1 flex flex-col items-center text-center space-y-1.5">
                  <div className="relative">
                    <TeamEmblem name={nextMatch?.teamA?.name || 'CJP'} size="lg" />
                    <span className="absolute -top-1 -left-1 flex h-4 w-4 items-center justify-center rounded bg-brand text-xs font-extrabold text-ink">
                      {nextMatch?.teamA?.seedRank || 1}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-ink truncate max-w-[90px] flex items-center justify-center gap-1">
                    {nextMatch?.teamA?.name || 'CJP'}
                    <Crown size={11} className="text-brand-bright" />
                  </span>
                </div>

                {/* VS Badge */}
                <div className="shrink-0 flex flex-col items-center">
                  <span className="rounded bg-surface px-2 py-1 text-xs font-extrabold tracking-widest text-ink-muted border border-line">
                    VS
                  </span>
                </div>

                {/* Team 2 */}
                <div className="flex-1 flex flex-col items-center text-center space-y-1.5">
                  <div className="relative">
                    <TeamEmblem name={nextMatch?.teamB?.name || 'DEVARU BOYS'} size="lg" />
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded bg-surface-3 text-xs font-extrabold text-ink-muted">
                      {nextMatch?.teamB?.seedRank || 2}
                    </span>
                  </div>
                  <span className="text-xs font-bold text-ink truncate max-w-[90px]">
                    {nextMatch?.teamB?.name || 'DEVARU BOYS'}
                  </span>
                </div>
              </div>

              {/* Match Meta Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs text-ink-muted">
                <div className="rounded border border-line bg-surface-2 p-2 flex items-center gap-2">
                  <Calendar size={14} className="text-ink-muted shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-ink-muted">Scheduled</span>
                    <span className="font-bold text-ink">{nextMatch?.scheduledTime || 'TBD'}</span>
                  </div>
                </div>
                <div className="rounded border border-line bg-surface-2 p-2 flex items-center gap-2">
                  <Gamepad2 size={14} className="text-ink-muted shrink-0" />
                  <div>
                    <span className="block text-xs uppercase tracking-wider text-ink-muted">Format</span>
                    <span className="font-bold text-ink">Best of 1</span>
                  </div>
                </div>
              </div>

              {/* Large Gold CTA Button */}
              {!isReadOnly && nextMatch && nextMatch.teamA && nextMatch.teamB && (
                <button
                  onClick={() => openMatchEditor(nextMatch)}
                  className="w-full rounded bg-brand hover:bg-brand/90 text-ink font-extrabold uppercase text-xs tracking-wider py-2.5 flex items-center justify-center gap-2 transition shadow-md shadow-brand/20"
                >
                  <Edit2 size={13} /> RECORD RESULT
                </button>
              )}
            </div>

            {/* 5. TOP 6 SEEDED CONTENDERS */}
            <div className="rounded-lg border border-line bg-surface overflow-hidden">
              <div
                onClick={() => setContendersCollapsed(!contendersCollapsed)}
                className="flex items-center justify-between p-3.5 border-b border-line cursor-pointer hover:bg-surface transition"
              >
                <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-ink">
                  <Shield size={14} className="text-brand-bright" /> TOP 6 SEEDED CONTENDERS
                </div>
                <button className="text-ink-muted hover:text-ink">
                  {contendersCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
                </button>
              </div>

              {!contendersCollapsed && (
                <div className="p-3">
                  <div className="flex items-center justify-between text-xs font-extrabold uppercase tracking-widest text-ink-muted pb-2 px-2 border-b border-line/50">
                    <span className="w-6">#</span>
                    <span className="flex-1">TEAM</span>
                    <span className="text-right">SEED POINTS</span>
                  </div>

                  <div className="divide-y divide-line/40 text-xs">
                    {seededList.map((team) => (
                      <div
                        key={team.rank}
                        className="flex items-center justify-between py-2 px-2 hover:bg-surface transition rounded"
                      >
                        <span
                          className={`w-6 font-mono font-bold text-xs ${
                            team.rank === 1 ? 'text-brand-bright' : 'text-ink-muted'
                          }`}
                        >
                          #{team.rank}
                        </span>

                        <div className="flex-1 flex items-center gap-2 min-w-0 pr-2">
                          <TeamEmblem name={team.name} size="sm" />
                          <span
                            className={`truncate font-medium ${
                              team.rank === 1 ? 'text-ink font-bold' : 'text-ink'
                            }`}
                          >
                            {team.name}
                          </span>
                          {team.rank === 1 && <Crown size={11} className="text-brand-bright shrink-0" />}
                        </div>

                        <span className="font-mono text-xs font-bold text-brand-bright shrink-0">
                          {team.points} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* ADMIN RECORD RESULT MODAL */}
      {activeEditingMatch && matches[activeEditingMatch] && (
        <div className="modal-overlay">
          <div className="modal-panel relative max-w-md space-y-4 p-5 text-ink">
            <div className="flex items-start justify-between border-b border-line pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase tracking-widest text-brand-bright">
                  {matches[activeEditingMatch].stageName} • {matches[activeEditingMatch].shortLabel}
                </span>
                <h3 className="font-display text-base font-extrabold uppercase text-ink">
                  Record Match Score &amp; Winner
                </h3>
              </div>
              <button
                onClick={() => setActiveEditingMatch(null)}
                className="text-ink-muted hover:text-ink transition p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-ink-muted">{matches[activeEditingMatch].ruleExplanation}</p>

            <div className="space-y-3 rounded border border-line bg-surface-2 p-3.5">
              {/* Team A */}
              <div
                onClick={() =>
                  matches[activeEditingMatch].teamA && setSelectedWinnerId(matches[activeEditingMatch].teamA!.id)
                }
                className={`p-2.5 rounded border cursor-pointer transition flex items-center justify-between gap-3 ${
                  selectedWinnerId === matches[activeEditingMatch].teamA?.id
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedWinnerId === matches[activeEditingMatch].teamA?.id
                        ? 'border-brand bg-brand text-ink'
                        : 'border-line'
                    }`}
                  >
                    {selectedWinnerId === matches[activeEditingMatch].teamA?.id && <Check size={11} />}
                  </div>
                  <TeamEmblem name={matches[activeEditingMatch].teamA?.name || ''} size="sm" />
                  <span className="text-xs font-bold truncate">
                    {matches[activeEditingMatch].teamA?.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <label className="text-xs text-ink-muted font-mono">SCORE:</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => handleScoreChange('A', e.target.value)}
                    placeholder="0"
                    className="w-14 rounded border border-line bg-canvas px-2 py-1 text-center text-xs font-mono font-bold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-center font-display text-xs font-extrabold text-ink-muted/50 tracking-wider">
                VS
              </div>

              {/* Team B */}
              <div
                onClick={() =>
                  matches[activeEditingMatch].teamB && setSelectedWinnerId(matches[activeEditingMatch].teamB!.id)
                }
                className={`p-2.5 rounded border cursor-pointer transition flex items-center justify-between gap-3 ${
                  selectedWinnerId === matches[activeEditingMatch].teamB?.id
                    ? 'border-brand bg-brand/10 text-ink'
                    : 'border-line bg-surface hover:border-line-strong'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedWinnerId === matches[activeEditingMatch].teamB?.id
                        ? 'border-brand bg-brand text-ink'
                        : 'border-line'
                    }`}
                  >
                    {selectedWinnerId === matches[activeEditingMatch].teamB?.id && <Check size={11} />}
                  </div>
                  <TeamEmblem name={matches[activeEditingMatch].teamB?.name || ''} size="sm" />
                  <span className="text-xs font-bold truncate">
                    {matches[activeEditingMatch].teamB?.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <label className="text-xs text-ink-muted font-mono">SCORE:</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => handleScoreChange('B', e.target.value)}
                    placeholder="0"
                    className="w-14 rounded border border-line bg-canvas px-2 py-1 text-center text-xs font-mono font-bold text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <p className="text-xs text-ink-muted italic">
              Click the winning squad or enter scores. Winning and losing slots will advance dynamically per IPL
              playoff rules.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={() => setActiveEditingMatch(null)}
                className="px-3 py-1.5 rounded border border-line bg-surface-2 text-xs font-bold uppercase tracking-wider text-ink-muted hover:text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={saving || !selectedWinnerId}
                className="inline-flex items-center gap-1.5 rounded border border-brand bg-brand hover:bg-brand/90 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-ink transition disabled:opacity-40"
              >
                <Check size={13} /> {saving ? 'Saving…' : 'Save Match Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stage step element on stepper bar
 */
function StageStep({
  stepNumber,
  title,
  subtitle,
  isActive = false,
}: {
  stepNumber: string
  title: string
  subtitle: string
  isActive?: boolean
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-extrabold font-mono border ${
          isActive
            ? 'border-brand bg-brand text-ink shadow-sm'
            : 'border-line bg-surface-2 text-ink-muted'
        }`}
      >
        {stepNumber}
      </span>
      <div className="min-w-0">
        <span
          className={`block text-xs font-extrabold uppercase tracking-wider truncate ${
            isActive ? 'text-brand-bright' : 'text-ink'
          }`}
        >
          {title}
        </span>
        <span className="block text-xs text-ink-muted truncate leading-none mt-0.5">{subtitle}</span>
      </div>
    </div>
  )
}

/**
 * Professional compact match card for tournament tree
 */
function MatchCardCompact({
  matchNumber,
  stageTitle,
  teamA,
  teamB,
  scoreA,
  scoreB,
  seedA,
  seedB,
  status,
  advancesText,
  winnerIndex,
  isGrandFinal = false,
  onRecordResult,
  onReset,
  isReadOnly = false,
}: {
  matchNumber: number
  stageTitle: string
  teamA: string
  teamB: string
  scoreA?: number
  scoreB?: number
  seedA?: number
  seedB?: number
  status: 'COMPLETED' | 'READY' | 'WAITING'
  advancesText?: string
  winnerIndex?: number
  isGrandFinal?: boolean
  onRecordResult: () => void
  onReset: () => void
  isReadOnly?: boolean
}) {
  const isCompleted = status === 'COMPLETED'
  const isReady = status === 'READY'

  return (
    <div
      className={`rounded-lg border bg-surface p-3 text-xs shadow-sm transition ${
        isGrandFinal && isReady
          ? 'border-brand ring-1 ring-[#FF5A57]/20'
          : isCompleted
            ? 'border-line'
            : isReady
              ? 'border-brand/60'
              : 'border-line/60 opacity-65'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-line text-xs">
        <span className="font-bold uppercase tracking-wider text-ink-muted">{stageTitle}</span>
        <span
          className={`rounded px-1.5 py-0.2 font-extrabold uppercase text-xs tracking-wider ${
            isCompleted
              ? 'bg-surface-3 text-ink border border-line-strong'
              : isReady
                ? 'bg-brand/15 text-brand-bright border border-brand/30'
                : 'bg-surface-2 text-ink-muted border border-line'
          }`}
        >
          {status}
        </span>
      </div>

      {/* Contenders */}
      <div className="divide-y divide-line/40 py-1.5">
        {/* Team 1 */}
        <div
          className={`flex items-center justify-between py-1.5 ${
            isCompleted && winnerIndex === 0
              ? 'text-ink font-bold'
              : isCompleted && winnerIndex === 1
                ? 'text-ink-muted opacity-60'
                : 'text-ink'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-xs font-bold font-mono ${
                winnerIndex === 0 ? 'bg-brand text-ink font-extrabold' : 'bg-surface-2 text-ink-muted'
              }`}
            >
              {seedA || 1}
            </span>
            <TeamEmblem name={teamA} size="sm" />
            <span className="truncate max-w-[120px]">{teamA}</span>
            {isCompleted && winnerIndex === 0 && <Crown size={11} className="text-brand-bright shrink-0" />}
          </div>
          <span className="font-mono text-xs font-bold tabular-nums">
            {scoreA !== undefined ? scoreA : '-'}
          </span>
        </div>

        {/* Team 2 */}
        <div
          className={`flex items-center justify-between py-1.5 ${
            isCompleted && winnerIndex === 1
              ? 'text-ink font-bold'
              : isCompleted && winnerIndex === 0
                ? 'text-ink-muted opacity-60'
                : 'text-ink'
          }`}
        >
          <div className="flex items-center gap-1.5 min-w-0 pr-2">
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-xs font-bold font-mono ${
                winnerIndex === 1 ? 'bg-brand text-ink font-extrabold' : 'bg-surface-2 text-ink-muted'
              }`}
            >
              {seedB || 2}
            </span>
            <TeamEmblem name={teamB} size="sm" />
            <span className="truncate max-w-[120px]">{teamB}</span>
            {isCompleted && winnerIndex === 1 && <Crown size={11} className="text-brand-bright shrink-0" />}
          </div>
          <span className="font-mono text-xs font-bold tabular-nums">
            {scoreB !== undefined ? scoreB : '-'}
          </span>
        </div>
      </div>

      {/* Footer / Advance Notice or Action Button */}
      {isCompleted && advancesText && (
        <div className="pt-2 border-t border-line flex items-center justify-between text-xs">
          <span className="text-ink font-bold flex items-center gap-1 truncate">
            <Check size={11} /> {advancesText}
          </span>
          {!isReadOnly && (
            <button
              onClick={onReset}
              title="Reset match result"
              className="text-ink-muted hover:text-brand-bright p-0.5 transition"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      )}

      {isReady && !isReadOnly && (
        <div className="pt-2 border-t border-line">
          <button
            onClick={onRecordResult}
            className="w-full rounded bg-brand hover:bg-brand/90 text-ink font-extrabold uppercase text-xs tracking-wider py-1.5 flex items-center justify-center gap-1.5 transition"
          >
            <Edit2 size={11} /> RECORD RESULT
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Sleek esports emblem avatar with team initials and themed SVG crest
 */
function TeamEmblem({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
  const initials = useMemo(() => {
    if (!name) return 'EK'
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase()
    return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase()
  }, [name])

  const dim = size === 'lg' ? 'h-11 w-11 text-xs' : size === 'sm' ? 'h-5 w-5 text-xs' : 'h-7 w-7 text-xs'

  return (
    <div
      className={`relative flex ${dim} shrink-0 items-center justify-center rounded bg-surface-2 border border-line font-extrabold font-mono text-ink overflow-hidden shadow-inner`}
      title={name}
    >
      <div className="absolute inset-0 bg-gradient-to-tr from-canvas/40 via-transparent to-white/5 pointer-events-none" />
      <span className="relative z-10">{initials}</span>
    </div>
  )
}
