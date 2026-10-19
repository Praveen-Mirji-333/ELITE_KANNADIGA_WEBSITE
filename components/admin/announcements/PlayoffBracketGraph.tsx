'use client'

import { useState } from 'react'
import {
  Trophy,
  Crown,
  Medal,
  Swords,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Save,
  Edit2,
  X,
  Flame,
  Check,
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

  const safeNotify = (text: string, type: 'success' | 'error' = 'success') => {
    if (notify) notify(text, type)
  }

  const safeUpdate = (d: PlayoffBracketData) => {
    if (onUpdate) onUpdate(d)
  }

  // Edit form state
  const [scoreA, setScoreA] = useState<string>('')
  const [scoreB, setScoreB] = useState<string>('')
  const [selectedWinnerId, setSelectedWinnerId] = useState<string>('')

  const matches = bracket.matches
  const completedCount = Object.values(matches).filter((m) => m.status === 'completed').length

  const openMatchEditor = (match: PlayoffMatchState) => {
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
        safeNotify(res.error || 'Could not save match result to Supabase.', 'error')
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
    if (!window.confirm(`Reset ${match.stageName}? Downstream playoff matches that depend on this result will also be reset.`)) {
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

  const handleReInitFromStandings = async () => {
    if (!standings || standings.length === 0) {
      safeNotify('No current standings found to reload seeds from.', 'error')
      return
    }

    if (
      !window.confirm(
        'Re-seed the entire Playoff Bracket from the latest Points Table standings? ALL current playoff match results will be cleared!'
      )
    ) {
      return
    }

    try {
      setSaving(true)
      const fresh = initPlayoffBracketFromStandings(standings, bracket.seasonId, bracket.tournamentId)
      const res = await savePlayoffData(bracket.seasonId, fresh)
      setSaving(false)

      if (!res.success) {
        safeNotify(res.error || 'Failed to reseed playoffs.', 'error')
        return
      }

      safeUpdate(fresh)
      safeNotify('Playoff bracket re-seeded successfully from latest standings!')
    } catch (err: any) {
      setSaving(false)
      safeNotify(err?.message || 'Failed to re-seed playoffs.', 'error')
    }
  }

  return (
    <div className="space-y-6 text-white">
      {/* Top Header Banner */}
      <div className="relative overflow-hidden border border-amber-500/30 bg-gradient-to-r from-[#14120a] via-[#1a0f08] to-[#120a14] p-5">
        <div className="absolute right-0 top-0 h-full w-96 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.15),transparent_70%)] pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-widest">
                <Flame size={12} className="text-amber-400" /> IPL-STYLE PLAYOFF ROADMAP
              </span>
              <span className="text-[10px] font-mono text-white/40 tracking-wider">
                {seasonName} • FINAL STAGE
              </span>
            </div>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Knockout Stage &amp; Championship Tree
            </h2>
            <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
              Top 6 seeded contenders battle through double-chance Qualifier 1, Eliminators, Quarter-Finals, and
              the Semi-Final to claim the Grand Championship Trophy.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-2 border border-white/10 bg-black/40 rounded text-center">
              <span className="text-[9px] uppercase font-bold text-white/40 block">PLAYOFF PROGRESS</span>
              <span className="font-display text-sm font-black text-amber-400">
                {completedCount} / 6 MATCHES
              </span>
            </div>
            {!isReadOnly && standings && (
              <button
                onClick={handleReInitFromStandings}
                disabled={saving}
                className="inline-flex items-center gap-1.5 border border-white/15 bg-white/5 hover:bg-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/70 hover:text-white transition rounded disabled:opacity-50"
                title="Reseed bracket from the latest points table"
              >
                <RotateCcw size={12} /> Re-Seed Standings
              </button>
            )}
          </div>
        </div>
      </div>

      {/* CHAMPION SHOWCASE (if M6 Grand Finale has winner) */}
      {bracket.champion && (
        <div className="relative overflow-hidden border-2 border-amber-400 bg-gradient-to-b from-amber-950/40 via-black to-[#100b02] p-6 shadow-2xl shadow-amber-500/20 text-center animate-in zoom-in-95 duration-300">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.2),transparent_70%)] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            <div className="inline-flex items-center justify-center p-3.5 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-300 text-black shadow-lg shadow-amber-500/40 mb-3 animate-bounce">
              <Trophy size={36} />
            </div>

            <span className="text-xs font-black uppercase tracking-widest text-amber-400">
              OFFICIAL TOURNAMENT CHAMPION
            </span>

            <h1 className="font-display text-3xl sm:text-5xl font-black uppercase tracking-wider text-white mt-1 drop-shadow-md">
              {bracket.champion.name}
            </h1>

            <p className="mt-2 text-xs text-amber-200/80 font-mono">
              Victor of the Grand Championship Match • Eternal Glory
            </p>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs">
              {bracket.runnerUp && (
                <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-600/40 bg-slate-900/50 rounded text-slate-300">
                  <Medal size={14} className="text-slate-400" />
                  <span>
                    Runner-Up: <strong className="text-white">{bracket.runnerUp.name}</strong>
                  </span>
                </div>
              )}
              {bracket.thirdPlace && (
                <div className="flex items-center gap-2 px-3 py-1.5 border border-amber-800/40 bg-amber-950/40 rounded text-amber-300">
                  <Medal size={14} className="text-amber-500" />
                  <span>
                    3rd Place: <strong className="text-white">{bracket.thirdPlace.name}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* GRAPHICAL TOURNAMENT TREE (IPL SCHEDULE FLOW) */}
      <div className="border border-white/10 bg-[#09090b] p-4 sm:p-6 overflow-x-auto">
        <div className="min-w-[950px] space-y-6">
          {/* Stage Labels Bar */}
          <div className="grid grid-cols-4 gap-4 text-center border-b border-white/10 pb-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                STAGE 1: OPENING ROUND
              </span>
              <p className="text-[11px] font-bold text-white/50">Qualifier 1 &amp; Eliminators</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">
                STAGE 2: QUARTER-FINAL
              </span>
              <p className="text-[11px] font-bold text-white/50">Eliminators Clash</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                STAGE 3: SEMI-FINAL
              </span>
              <p className="text-[11px] font-bold text-white/50">Qualifier 2 Battle</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                STAGE 4: GRAND FINALE
              </span>
              <p className="text-[11px] font-bold text-white/50">Championship Match</p>
            </div>
          </div>

          {/* Bracket Grid */}
          <div className="grid grid-cols-4 gap-6 items-start">
            {/* COLUMN 1: Stage 1 (Match 1, Match 2, Match 3) */}
            <div className="space-y-6">
              {/* Match 1: Qualifier 1 */}
              <div className="space-y-2">
                <MatchCard
                  match={matches.M1_QUALIFIER_1}
                  accentColor="amber"
                  isEditable={true}
                  isReadOnly={isReadOnly}
                  onEdit={() => openMatchEditor(matches.M1_QUALIFIER_1)}
                  onReset={() => handleResetMatch('M1_QUALIFIER_1')}
                />
                <div className="flex flex-col gap-1 px-2 text-[9px] font-mono">
                  <span className="text-amber-400 flex items-center gap-1">
                    <ArrowRight size={10} /> Winner ➔ Direct to Grand Finale (Stage 4)
                  </span>
                  <span className="text-cyan-400 flex items-center gap-1">
                    <ArrowRight size={10} /> Loser ➔ 2nd Chance in Semi-Final (Stage 3)
                  </span>
                </div>
              </div>

              <div className="border-t border-white/10 pt-4 space-y-4">
                {/* Match 2: Eliminator 1 */}
                <div className="space-y-2">
                  <MatchCard
                    match={matches.M2_ELIMINATOR_1}
                    accentColor="blue"
                    isEditable={true}
                    isReadOnly={isReadOnly}
                    onEdit={() => openMatchEditor(matches.M2_ELIMINATOR_1)}
                    onReset={() => handleResetMatch('M2_ELIMINATOR_1')}
                  />
                  <div className="px-2 text-[9px] font-mono text-white/40 flex items-center gap-1">
                    <ArrowRight size={10} /> Winner ➔ Quarter-Final • Loser Disqualified
                  </div>
                </div>

                {/* Match 3: Eliminator 2 */}
                <div className="space-y-2">
                  <MatchCard
                    match={matches.M3_ELIMINATOR_2}
                    accentColor="blue"
                    isEditable={true}
                    isReadOnly={isReadOnly}
                    onEdit={() => openMatchEditor(matches.M3_ELIMINATOR_2)}
                    onReset={() => handleResetMatch('M3_ELIMINATOR_2')}
                  />
                  <div className="px-2 text-[9px] font-mono text-white/40 flex items-center gap-1">
                    <ArrowRight size={10} /> Winner ➔ Quarter-Final • Loser Disqualified
                  </div>
                </div>
              </div>
            </div>

            {/* COLUMN 2: Stage 2 (Quarter-Final - Match 4) */}
            <div className="space-y-4 pt-48">
              <div className="space-y-2">
                <MatchCard
                  match={matches.M4_QUARTER_FINAL}
                  accentColor="indigo"
                  isEditable={Boolean(matches.M4_QUARTER_FINAL.teamA && matches.M4_QUARTER_FINAL.teamB)}
                  isReadOnly={isReadOnly}
                  onEdit={() => openMatchEditor(matches.M4_QUARTER_FINAL)}
                  onReset={() => handleResetMatch('M4_QUARTER_FINAL')}
                />
                <div className="px-2 text-[9px] font-mono text-white/40 flex items-center gap-1">
                  <ArrowRight size={10} /> Winner ➔ Semi-Final • Loser Disqualified
                </div>
              </div>
            </div>

            {/* COLUMN 3: Stage 3 (Semi-Final - Match 5) */}
            <div className="space-y-4 pt-32">
              <div className="space-y-2">
                <MatchCard
                  match={matches.M5_SEMI_FINAL}
                  accentColor="purple"
                  isEditable={Boolean(matches.M5_SEMI_FINAL.teamA && matches.M5_SEMI_FINAL.teamB)}
                  isReadOnly={isReadOnly}
                  onEdit={() => openMatchEditor(matches.M5_SEMI_FINAL)}
                  onReset={() => handleResetMatch('M5_SEMI_FINAL')}
                />
                <div className="flex flex-col gap-1 px-2 text-[9px] font-mono">
                  <span className="text-purple-400 flex items-center gap-1">
                    <ArrowRight size={10} /> Winner ➔ Grand Finale Ticket
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <ArrowRight size={10} /> Loser ➔ Eliminated (3rd Place)
                  </span>
                </div>
              </div>
            </div>

            {/* COLUMN 4: Stage 4 (Grand Finale - Match 6) */}
            <div className="space-y-4 pt-16">
              <div className="space-y-2">
                <MatchCard
                  match={matches.M6_GRAND_FINALE}
                  accentColor="gold"
                  isGrandFinale={true}
                  isEditable={Boolean(matches.M6_GRAND_FINALE.teamA && matches.M6_GRAND_FINALE.teamB)}
                  isReadOnly={isReadOnly}
                  onEdit={() => openMatchEditor(matches.M6_GRAND_FINALE)}
                  onReset={() => handleResetMatch('M6_GRAND_FINALE')}
                />
                <div className="px-2 text-[9px] font-mono text-amber-400 flex items-center gap-1">
                  <Trophy size={11} /> Winner Becomes Champion 🏆
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TOP 6 SEEDED TEAMS POOL SUMMARY */}
      <div className="border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow flex items-center gap-2">
            <Shield size={13} className="text-red-500" /> TOP 6 SEEDED CONTENDERS SUMMARY
          </p>
          <span className="text-[10px] font-mono text-white/40 uppercase">
            Derived directly from regular season points table
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {bracket.top6Teams.map((team, idx) => {
            const isChampion = bracket.champion?.id === team.id
            const isRunnerUp = bracket.runnerUp?.id === team.id
            const isThird = bracket.thirdPlace?.id === team.id

            return (
              <div
                key={team.id}
                className={`p-2.5 border text-xs transition ${
                  isChampion
                    ? 'border-amber-400 bg-amber-950/40 text-amber-300 shadow-md shadow-amber-500/20'
                    : isRunnerUp
                      ? 'border-slate-400 bg-slate-900/40 text-slate-200'
                      : isThird
                        ? 'border-orange-500/40 bg-orange-950/20 text-orange-200'
                        : 'border-white/10 bg-black/40 text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1 text-[10px]">
                  <span
                    className={`font-black px-1.5 py-0.2 rounded ${
                      idx < 2 ? 'bg-amber-500 text-black' : 'bg-white/20 text-white'
                    }`}
                  >
                    #{team.seedRank || idx + 1}
                  </span>
                  {isChampion && <Crown size={12} className="text-amber-400 animate-pulse" />}
                  {isRunnerUp && <Medal size={12} className="text-slate-300" />}
                </div>

                <p className="font-bold truncate text-xs">{team.name}</p>
                <p className="text-[9px] text-white/50 truncate font-mono mt-0.5">
                  {isChampion
                    ? '🏆 CHAMPION'
                    : isRunnerUp
                      ? '🥈 RUNNER-UP'
                      : isThird
                        ? '🥉 3RD PLACE'
                        : idx < 2
                          ? 'Double Chance'
                          : 'Eliminator Seed'}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      {/* QUICK MATCH RESULT MODAL */}
      {activeEditingMatch && matches[activeEditingMatch] && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md border border-white/15 bg-[#111114] p-5 shadow-2xl text-white space-y-4">
            <div className="flex items-start justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-amber-400">
                  {matches[activeEditingMatch].stageName} • {matches[activeEditingMatch].shortLabel}
                </span>
                <h3 className="font-display text-lg font-black uppercase text-white">
                  Enter Match Score &amp; Winner
                </h3>
              </div>
              <button
                onClick={() => setActiveEditingMatch(null)}
                className="text-white/40 hover:text-white transition p-1"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-white/60">{matches[activeEditingMatch].ruleExplanation}</p>

            <div className="space-y-3 border border-white/10 bg-black/50 p-3.5">
              {/* Team A */}
              <div
                onClick={() => matches[activeEditingMatch].teamA && setSelectedWinnerId(matches[activeEditingMatch].teamA!.id)}
                className={`p-2.5 border cursor-pointer transition flex items-center justify-between gap-3 ${
                  selectedWinnerId === matches[activeEditingMatch].teamA?.id
                    ? 'border-amber-400 bg-amber-950/30 text-amber-200'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedWinnerId === matches[activeEditingMatch].teamA?.id
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedWinnerId === matches[activeEditingMatch].teamA?.id && <Check size={11} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold truncate block">
                      {matches[activeEditingMatch].teamA?.name}
                    </span>
                    <span className="text-[9px] text-white/40 block truncate">
                      {matches[activeEditingMatch].teamA?.sourceDescription}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <label className="text-[9px] text-white/40 font-mono">SCORE:</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreA}
                    onChange={(e) => handleScoreChange('A', e.target.value)}
                    placeholder="0"
                    className="w-14 border border-white/20 bg-black px-2 py-1 text-center text-xs font-mono font-bold text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="text-center font-display text-[10px] font-black text-white/30">VS</div>

              {/* Team B */}
              <div
                onClick={() => matches[activeEditingMatch].teamB && setSelectedWinnerId(matches[activeEditingMatch].teamB!.id)}
                className={`p-2.5 border cursor-pointer transition flex items-center justify-between gap-3 ${
                  selectedWinnerId === matches[activeEditingMatch].teamB?.id
                    ? 'border-amber-400 bg-amber-950/30 text-amber-200'
                    : 'border-white/10 bg-white/5 hover:border-white/30'
                }`}
              >
                <div className="min-w-0 flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                      selectedWinnerId === matches[activeEditingMatch].teamB?.id
                        ? 'border-amber-400 bg-amber-400 text-black'
                        : 'border-white/30'
                    }`}
                  >
                    {selectedWinnerId === matches[activeEditingMatch].teamB?.id && <Check size={11} />}
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold truncate block">
                      {matches[activeEditingMatch].teamB?.name}
                    </span>
                    <span className="text-[9px] text-white/40 block truncate">
                      {matches[activeEditingMatch].teamB?.sourceDescription}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <label className="text-[9px] text-white/40 font-mono">SCORE:</label>
                  <input
                    type="number"
                    min="0"
                    value={scoreB}
                    onChange={(e) => handleScoreChange('B', e.target.value)}
                    placeholder="0"
                    className="w-14 border border-white/20 bg-black px-2 py-1 text-center text-xs font-mono font-bold text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <p className="text-[10px] text-white/40 italic">
              Click on the row of the team that won, or enter scores above. Saving will automatically advance
              the winner and route the loser per IPL rules.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setActiveEditingMatch(null)}
                className="px-3 py-1.5 border border-white/15 bg-white/5 text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveResult}
                disabled={saving || !selectedWinnerId}
                className="inline-flex items-center gap-1.5 border border-amber-500 bg-amber-500 hover:bg-amber-400 px-4 py-1.5 text-xs font-black uppercase tracking-wider text-black transition disabled:opacity-40"
              >
                <Save size={13} /> {saving ? 'Saving…' : 'Save Match Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Individual Match Card in the IPL Playoff Tree
 */
function MatchCard({
  match,
  accentColor = 'amber',
  isGrandFinale = false,
  isEditable = false,
  isReadOnly = false,
  onEdit,
  onReset,
}: {
  match: PlayoffMatchState
  accentColor?: 'amber' | 'blue' | 'indigo' | 'purple' | 'gold'
  isGrandFinale?: boolean
  isEditable?: boolean
  isReadOnly?: boolean
  onEdit: () => void
  onReset: () => void
}) {
  const isCompleted = match.status === 'completed'
  const isReady = Boolean(match.teamA && match.teamB)

  const borderStyles = isGrandFinale
    ? isCompleted
      ? 'border-2 border-amber-400 bg-gradient-to-b from-[#201402] to-black shadow-lg shadow-amber-500/20'
      : 'border-2 border-amber-500/50 bg-[#140e04]'
    : isCompleted
      ? 'border-emerald-600/40 bg-[#0d140e]'
      : isReady
        ? 'border-white/20 bg-white/[0.03]'
        : 'border-white/5 bg-black/40 opacity-70'

  return (
    <div className={`relative border p-3 rounded text-xs transition duration-200 ${borderStyles}`}>
      {/* Header Badge */}
      <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-white/10 text-[9px]">
        <span
          className={`font-black uppercase tracking-wider ${
            isGrandFinale
              ? 'text-amber-400 font-display'
              : accentColor === 'purple'
                ? 'text-purple-400'
                : accentColor === 'blue'
                  ? 'text-blue-400'
                  : 'text-amber-400'
          }`}
        >
          {match.stageName} • {match.shortLabel}
        </span>

        <span
          className={`px-1.5 py-0.2 rounded font-black uppercase text-[8px] ${
            isCompleted
              ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
              : isReady
                ? 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse'
                : 'bg-white/5 text-white/30 border border-white/10'
          }`}
        >
          {isCompleted ? 'COMPLETED' : isReady ? 'READY TO PLAY' : 'AWAITING TEAMS'}
        </span>
      </div>

      {/* Contenders */}
      <div className="space-y-1.5">
        <TeamSlot
          participant={match.teamA}
          score={match.scoreA}
          isWinner={match.winnerId === match.teamA?.id}
          isLoser={match.loserId === match.teamA?.id}
          isCompleted={isCompleted}
          defaultSlotLabel="Team 1 Slot"
        />

        <div className="text-center font-display text-[9px] font-black text-white/20 tracking-wider">VS</div>

        <TeamSlot
          participant={match.teamB}
          score={match.scoreB}
          isWinner={match.winnerId === match.teamB?.id}
          isLoser={match.loserId === match.teamB?.id}
          isCompleted={isCompleted}
          defaultSlotLabel="Team 2 Slot"
        />
      </div>

      {/* Admin Action Bar */}
      {!isReadOnly && (
        <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center justify-between gap-1">
          {isReady ? (
            <button
              onClick={onEdit}
              className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-1 text-[9px] font-black uppercase tracking-wider rounded transition ${
                isCompleted
                  ? 'border border-white/15 bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                  : isGrandFinale
                    ? 'border border-amber-500 bg-amber-500 hover:bg-amber-400 text-black shadow-md'
                    : 'border border-red-600 bg-red-600 hover:bg-red-500 text-white shadow-md'
              }`}
            >
              <Edit2 size={10} />
              {isCompleted ? 'Edit Score' : 'Record Result'}
            </button>
          ) : (
            <span className="text-[9px] text-white/30 italic text-center w-full">Waiting for previous matches…</span>
          )}

          {isCompleted && (
            <button
              onClick={onReset}
              title="Reset this match result"
              className="p-1 border border-red-900/40 text-red-400 hover:bg-red-950/40 rounded transition"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function TeamSlot({
  participant,
  score,
  isWinner,
  isLoser,
  isCompleted,
  defaultSlotLabel,
}: {
  participant: PlayoffParticipant | null
  score?: number | null
  isWinner: boolean
  isLoser: boolean
  isCompleted: boolean
  defaultSlotLabel: string
}) {
  if (!participant) {
    return (
      <div className="flex items-center justify-between p-1.5 border border-dashed border-white/10 bg-white/[0.01] rounded text-white/30 text-[10px]">
        <span className="italic">{defaultSlotLabel}</span>
        <span className="font-mono text-white/20">—</span>
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-between p-1.5 border rounded text-[11px] transition ${
        isWinner
          ? 'border-amber-400/80 bg-amber-950/40 text-amber-200'
          : isLoser
            ? 'border-white/5 bg-black/40 text-white/40 line-through decoration-red-500/50'
            : 'border-white/10 bg-white/5 text-white'
      }`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {participant.seedRank ? (
          <span
            className={`font-display text-[9px] font-black px-1 py-0.2 rounded shrink-0 ${
              isWinner ? 'bg-amber-400 text-black' : 'bg-white/15 text-white/60'
            }`}
          >
            #{participant.seedRank}
          </span>
        ) : null}
        <span className="font-bold truncate max-w-[130px]" title={participant.name}>
          {participant.name}
        </span>
        {isWinner && <Crown size={12} className="text-amber-400 shrink-0" />}
      </div>

      <div className="flex items-center gap-1.5 shrink-0 font-mono font-bold">
        {isCompleted && score !== null && score !== undefined && (
          <span className={`px-1.5 py-0.2 rounded text-[10px] ${isWinner ? 'bg-amber-500/20 text-amber-300' : 'text-white/40'}`}>
            {score}
          </span>
        )}
      </div>
    </div>
  )
}
