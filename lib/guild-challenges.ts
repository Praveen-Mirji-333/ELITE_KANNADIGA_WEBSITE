import type { GuildChallenge, GuildMember } from './types'

export const MIN_CHALLENGE_GLORY = 1000

export const GUILD_RANK_TIERS = [
  { rank: 1, label: 'Leader', fullRole: '👑 Leader' },
  { rank: 2, label: 'Co-Leader', fullRole: '🎖️ Co-Leader' },
  { rank: 3, label: 'Commander', fullRole: '⭐⭐⭐ Commander' },
  { rank: 4, label: 'Senior Officer', fullRole: '⭐⭐ Senior Officer' },
  { rank: 5, label: 'Officer', fullRole: '⭐ Officer' },
  { rank: 6, label: 'Junior Officer', fullRole: '🔰 Junior Officer' },
  { rank: 7, label: 'Elder', fullRole: '🛡️ Elder' },
  { rank: 8, label: 'Member', fullRole: '👤 Member' },
] as const

/**
 * Returns numeric hierarchy tier 1 (highest: Leader) to 8 (lowest: Member).
 * Checks specific substrings before general ones (e.g. Co-Leader before Leader,
 * Senior/Junior Officer before Officer).
 */
export function getGuildRoleRank(role?: string | null): number {
  const r = (role || '').toLowerCase().trim()
  if (!r) return 8
  if (r.includes('co-leader') || r.includes('co leader')) return 2
  if (r.includes('leader')) return 1
  if (r.includes('commander')) return 3
  if (r.includes('senior officer')) return 4
  if (r.includes('junior officer')) return 6
  if (r.includes('officer')) return 5
  if (r.includes('elder')) return 7
  return 8
}

export function getRankLabelByTier(tier: number): string {
  return GUILD_RANK_TIERS.find((t) => t.rank === tier)?.label || 'Member'
}

export function getGuildRoleLabel(role?: string | null): string {
  return getRankLabelByTier(getGuildRoleRank(role))
}

/**
 * Returns the single highest-glory Member (tier 8) eligible to challenge Elder.
 * Tie-breakers: higher kills, then better (lower) roster ranking number.
 */
export function getHighestGloryMember(members: GuildMember[]): GuildMember | null {
  const onlyMembers = (members || []).filter((m) => getGuildRoleRank(m.guild_role) === 8)
  if (onlyMembers.length === 0) return null

  const sorted = [...onlyMembers].sort((a, b) => {
    const gloryDiff = (b.glory_contributed ?? 0) - (a.glory_contributed ?? 0)
    if (gloryDiff !== 0) return gloryDiff
    const killsDiff = (b.kills ?? 0) - (a.kills ?? 0)
    if (killsDiff !== 0) return killsDiff
    return (a.ranking ?? 9999) - (b.ranking ?? 9999)
  })

  return sorted[0] || null
}

export function canMemberChallengeTarget(params: {
  challenger: GuildMember
  target: GuildMember
  allMembers: GuildMember[]
  existingChallenges?: GuildChallenge[]
}): { allowed: boolean; reason?: string } {
  const { challenger, target, allMembers, existingChallenges = [] } = params

  if (!challenger || !target) {
    return { allowed: false, reason: 'Invalid guild member details.' }
  }

  if (
    challenger.id === target.id ||
    (challenger.user_id && target.user_id && challenger.user_id === target.user_id)
  ) {
    return { allowed: false, reason: 'You cannot challenge yourself.' }
  }

  const challengerGlory = challenger.glory_contributed ?? 0
  if (challengerGlory < MIN_CHALLENGE_GLORY) {
    return {
      allowed: false,
      reason: `Minimum ${MIN_CHALLENGE_GLORY.toLocaleString()} Glory Points required to challenge (you have ${challengerGlory.toLocaleString()} GP).`,
    }
  }

  const challengerTier = getGuildRoleRank(challenger.guild_role)
  const targetTier = getGuildRoleRank(target.guild_role)

  if (challengerTier === 1) {
    return { allowed: false, reason: 'Leader is already at the highest guild rank.' }
  }

  if (targetTier !== challengerTier - 1) {
    const expectedLabel = getRankLabelByTier(challengerTier - 1)
    if (challengerTier === 2) {
      return {
        allowed: false,
        reason: 'A Co-Leader can only challenge the Leader.',
      }
    }
    return {
      allowed: false,
      reason: `${getRankLabelByTier(challengerTier)} can only challenge 1 rank above (${expectedLabel}).`,
    }
  }

  // Member (tier 8) -> Elder (tier 7): strictly the highest-glory Member only
  if (challengerTier === 8 && targetTier === 7) {
    const topMember = getHighestGloryMember(allMembers)
    if (!topMember || topMember.id !== challenger.id) {
      const topName = topMember?.player_name || topMember?.profiles?.ign || 'the top-glory Member'
      const topGlory = (topMember?.glory_contributed ?? 0).toLocaleString()
      return {
        allowed: false,
        reason: `Only the highest-glory Member (${topName} · ${topGlory} GP) can challenge an Elder.`,
      }
    }
  }

  const hasActive = existingChallenges.some(
    (c) =>
      (c.status === 'pending' || c.status === 'accepted') &&
      c.challenger_member_id === challenger.id &&
      c.defender_member_id === target.id
  )
  if (hasActive) {
    return {
      allowed: false,
      reason: 'You already have an active challenge against this player.',
    }
  }

  return { allowed: true }
}

export function getMemberChallengeSummary(params: {
  member: GuildMember
  allMembers: GuildMember[]
  existingChallenges?: GuildChallenge[]
}) {
  const { member, allMembers } = params
  const myTier = getGuildRoleRank(member.guild_role)
  const myRoleLabel = getRankLabelByTier(myTier)
  const myGlory = member.glory_contributed ?? 0
  const hasEnoughGlory = myGlory >= MIN_CHALLENGE_GLORY
  const targetTier = myTier > 1 ? myTier - 1 : null
  const targetRoleLabel = targetTier ? getRankLabelByTier(targetTier) : null
  const highestGloryMember = getHighestGloryMember(allMembers)
  const isHighestGloryMember =
    myTier === 8 && !!highestGloryMember && highestGloryMember.id === member.id

  const eligibleTargets = targetTier
    ? allMembers.filter((m) => getGuildRoleRank(m.guild_role) === targetTier)
    : []

  let canIssueChallenge = hasEnoughGlory && targetTier !== null
  let blockReason = ''

  if (myTier === 1) {
    canIssueChallenge = false
    blockReason = 'You hold the top Leader rank — only a Co-Leader with 1,000+ GP can challenge you.'
  } else if (!hasEnoughGlory) {
    canIssueChallenge = false
    blockReason = `Complete ${(MIN_CHALLENGE_GLORY - myGlory).toLocaleString()} more GP to reach ${MIN_CHALLENGE_GLORY.toLocaleString()} GP and unlock challenges.`
  } else if (myTier === 8 && !isHighestGloryMember) {
    canIssueChallenge = false
    const topName =
      highestGloryMember?.player_name || highestGloryMember?.profiles?.ign || 'another Member'
    const topGp = (highestGloryMember?.glory_contributed ?? 0).toLocaleString()
    blockReason = `Only the highest-glory Member (${topName} · ${topGp} GP) can challenge an Elder.`
  }

  return {
    myTier,
    myRoleLabel,
    myGlory,
    hasEnoughGlory,
    targetTier,
    targetRoleLabel,
    highestGloryMember,
    isHighestGloryMember,
    eligibleTargets,
    canIssueChallenge,
    blockReason,
  }
}

