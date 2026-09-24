// TypeScript Interfaces for ELITE ಕನ್ನಡಿಗ Gaming Platform

export interface Profile {
  id: string
  player_id: string
  username: string
  ign: string
  free_fire_uid?: string
  avatar_url?: string
  banner_url?: string
  bio?: string
  guild_id?: string
  total_xp: number
  level: number
  login_streak: number
  longest_login_streak: number
  last_login_date?: string
  is_public: boolean
  created_at: string
  updated_at?: string
  role?: 'user' | 'moderator' | 'admin'
}

export interface HomeCard {
  id: string
  section: 'HERO_STATS' | 'ARENA_HIGHLIGHTS' | 'COMMUNITY_FEATURES' | 'COMMUNITY_STATS'
  title: string
  subtitle?: string
  stat_number?: string
  stat_label?: string
  image_url?: string
  link_url?: string
  display_order: number
  is_active: boolean
  created_at?: string
}

export interface LeaderboardSection {
  id: string
  name: string
  slug: string
  icon_name: string
  description?: string
  display_order: number
  is_active: boolean
}

export interface TopTeamDetail {
  rank: 1 | 2 | 3
  team_name: string
  captain_name: string
  captain_uid?: string
  kills: number
  points?: number
  prize?: string
  player_names?: string[]
  player_uids?: string[]
}

export interface Tournament {
  id: string
  title: string
  slug: string
  description?: string
  banner_url?: string
  game_mode: string
  map: string
  tournament_type: string
  entry_type: 'SOLO' | 'SQUAD' | 'GUILD'
  prize_pool: string
  max_slots: number
  slots_filled?: number
  registration_start: string
  registration_end?: string
  tournament_start: string
  status: 'draft' | 'upcoming' | 'registration_open' | 'full' | 'live' | 'completed' | 'cancelled'
  rules?: string
  created_by?: string
  created_at: string
  top_3_teams?: TopTeamDetail[]
}

export interface TournamentRegistration {
  id: string
  tournament_id: string
  user_id: string
  team_name?: string
  captain_name?: string
  captain_free_fire_uid?: string
  phone_number?: string
  teammate_uids?: string[]
  teammate_names?: string[]
  registration_status: 'confirmed' | 'waitlist' | 'cancelled'
  registered_at: string
  checked_in_at?: string
  placement?: number
  kills?: number
  result_verified: boolean
  tournaments?: Tournament
}

export interface Guild {
  id: string
  name: string
  slug: string
  description?: string
  logo_url?: string
  banner_url?: string
  leader_id?: string
  glory_points: number
  member_count?: number
  created_at: string
}

export interface GuildMember {
  id: string
  guild_id: string
  user_id: string
  guild_role: 'leader' | 'officer' | 'member'
  glory_contributed: number
  joined_at: string
  status: 'pending' | 'active' | 'declined'
  profile?: Profile
  player_name?: string
}

export interface XPTransaction {
  id: string
  user_id: string
  amount: number
  source_type: 'daily_login' | 'qna_quiz' | 'tournament_participation' | 'tournament_win' | 'achievement_unlock' | 'clip_approved' | 'guild_event' | 'admin_adjustment'
  source_id?: string
  description: string
  created_at: string
}

export interface Achievement {
  id: string
  name: string
  slug: string
  description: string
  icon_url?: string
  achievement_type: string
  requirement_config?: Record<string, any>
  xp_reward: number
  rarity: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  is_active: boolean
  player_name?: string
  player_uid?: string
  avatar_url?: string
  unlocked?: boolean
}

export interface QnAQuestion {
  id: string
  question: string
  category: string
  options: string[]
  explanation?: string
  xp_reward: number
  is_active: boolean
}

export interface QnAAttempt {
  id: string
  user_id: string
  question_id: string
  selected_answer: number
  is_correct: boolean
  xp_earned: number
  attempted_at: string
}

export interface Giveaway {
  id: string
  title: string
  description: string
  prize_description: string
  banner_url?: string
  start_at: string
  end_at: string
  status: 'draft' | 'active' | 'ended' | 'drawn' | 'cancelled'
}

export interface CommunityClip {
  id: string
  user_id: string
  title: string
  video_url: string
  thumbnail_url?: string
  category: string
  moderation_status: 'pending' | 'approved' | 'rejected'
  created_at: string
  player_name?: string
}

export interface Announcement {
  id: string
  title: string
  slug: string
  content: string
  category: string
  thumbnail_url?: string
  published: boolean
  published_at: string
}

export interface NotificationItem {
  id: string
  user_id: string
  title: string
  message: string
  notification_type: string
  link?: string
  read_at?: string
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id?: string
  action: string
  entity_type: string
  entity_id?: string
  metadata?: Record<string, any>
  created_at: string
}
