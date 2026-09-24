-- 001_initial_schema.sql
-- ELITE ಕನ್ನಡಿಗ Gaming Community Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles Table (Linked to Auth.Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id TEXT UNIQUE NOT NULL,
  username TEXT NOT NULL,
  ign TEXT NOT NULL,
  free_fire_uid TEXT,
  avatar_url TEXT DEFAULT 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Elite%20logo%20Circle-8ATZ20pDTP52UaX28xoJ7gyV9DOkQV.png',
  banner_url TEXT,
  bio TEXT DEFAULT 'ELITE Kannada Gaming Community Member',
  guild_id UUID,
  total_xp INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  login_streak INTEGER DEFAULT 0 NOT NULL,
  longest_login_streak INTEGER DEFAULT 0 NOT NULL,
  last_login_date DATE,
  is_public BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. User Roles Table (RBAC)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'moderator', 'admin')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, role)
);

-- 3. Tournaments Table
CREATE TABLE IF NOT EXISTS public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  banner_url TEXT,
  game_mode TEXT DEFAULT 'SQUAD BATTLE' NOT NULL,
  map TEXT DEFAULT 'BERMUDA' NOT NULL,
  tournament_type TEXT DEFAULT 'FREE' NOT NULL,
  entry_type TEXT DEFAULT 'SOLO' NOT NULL CHECK (entry_type IN ('SOLO', 'SQUAD', 'GUILD')),
  prize_pool TEXT DEFAULT '₹10,000' NOT NULL,
  max_slots INTEGER DEFAULT 100 NOT NULL,
  registration_start TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  registration_end TIMESTAMPTZ,
  tournament_start TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'registration_open' NOT NULL CHECK (status IN ('draft', 'upcoming', 'registration_open', 'full', 'live', 'completed', 'cancelled')),
  rules TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tournament Registrations Table
CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_name TEXT,
  registration_status TEXT DEFAULT 'confirmed' NOT NULL CHECK (registration_status IN ('confirmed', 'waitlist', 'cancelled')),
  registered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  checked_in_at TIMESTAMPTZ,
  placement INTEGER,
  kills INTEGER DEFAULT 0,
  result_verified BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(tournament_id, user_id)
);

-- 5. Tournament Matches Table
CREATE TABLE IF NOT EXISTS public.tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round_name TEXT DEFAULT 'Round 1' NOT NULL,
  match_number INTEGER DEFAULT 1 NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'scheduled' NOT NULL CHECK (status IN ('scheduled', 'live', 'completed', 'cancelled')),
  results JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Guilds Table
CREATE TABLE IF NOT EXISTS public.guilds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  banner_url TEXT,
  leader_id UUID REFERENCES public.profiles(id),
  glory_points INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Foreign key link back from profiles to guilds
ALTER TABLE public.profiles ADD CONSTRAINT fk_profiles_guild FOREIGN KEY (guild_id) REFERENCES public.guilds(id) ON DELETE SET NULL;

-- 7. Guild Members Table
CREATE TABLE IF NOT EXISTS public.guild_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id UUID NOT NULL REFERENCES public.guilds(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  guild_role TEXT DEFAULT 'member' NOT NULL CHECK (guild_role IN ('leader', 'officer', 'member')),
  glory_contributed INTEGER DEFAULT 0 NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('pending', 'active', 'declined')),
  UNIQUE(guild_id, user_id)
);

-- 8. XP Transactions Table (Auditable XP Ledger)
CREATE TABLE IF NOT EXISTS public.xp_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('daily_login', 'qna_quiz', 'tournament_participation', 'tournament_win', 'achievement_unlock', 'clip_approved', 'guild_event', 'admin_adjustment')),
  source_id TEXT,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  achievement_type TEXT NOT NULL,
  requirement_config JSONB DEFAULT '{}'::jsonb,
  xp_reward INTEGER DEFAULT 100 NOT NULL,
  rarity TEXT DEFAULT 'COMMON' NOT NULL CHECK (rarity IN ('COMMON', 'RARE', 'EPIC', 'LEGENDARY')),
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 10. User Achievements Table
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  progress INTEGER DEFAULT 100 NOT NULL,
  is_completed BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(user_id, achievement_id)
);

-- 11. Daily Activity Table
CREATE TABLE IF NOT EXISTS public.daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('daily_login', 'qna_answered', 'tournament_played', 'stream_watched')),
  activity_value INTEGER DEFAULT 1 NOT NULL,
  xp_earned INTEGER DEFAULT 0 NOT NULL,
  source_reference TEXT,
  verified BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, activity_date, activity_type)
);

-- 12. Giveaways Table
CREATE TABLE IF NOT EXISTS public.giveaways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  prize_description TEXT NOT NULL,
  banner_url TEXT,
  start_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('draft', 'active', 'ended', 'drawn', 'cancelled')),
  eligibility_rules JSONB DEFAULT '{}'::jsonb,
  winner_selection_method TEXT DEFAULT 'random_draw' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 13. Giveaway Entries Table
CREATE TABLE IF NOT EXISTS public.giveaway_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_status TEXT DEFAULT 'valid' NOT NULL CHECK (entry_status IN ('valid', 'disqualified')),
  entered_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(giveaway_id, user_id)
);

-- 14. Giveaway Winners Table
CREATE TABLE IF NOT EXISTS public.giveaway_winners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  giveaway_id UUID NOT NULL REFERENCES public.giveaways(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prize_description TEXT NOT NULL,
  announced_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  verification_status TEXT DEFAULT 'verified' NOT NULL CHECK (verification_status IN ('pending', 'verified', 'claimed')),
  UNIQUE(giveaway_id, user_id)
);

-- 15. QnA Questions Table
CREATE TABLE IF NOT EXISTS public.qna_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  category TEXT DEFAULT 'Free Fire Intel' NOT NULL,
  options JSONB NOT NULL, -- e.g. ["Option A", "Option B", "Option C", "Option D"]
  correct_answer INTEGER NOT NULL, -- Private index (0-3), protected by RLS
  explanation TEXT,
  xp_reward INTEGER DEFAULT 10 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 16. QnA Attempts Table
CREATE TABLE IF NOT EXISTS public.qna_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.qna_questions(id) ON DELETE CASCADE,
  selected_answer INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  xp_earned INTEGER DEFAULT 0 NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, question_id)
);

-- 17. Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'ANNOUNCEMENT' NOT NULL,
  thumbnail_url TEXT,
  published BOOLEAN DEFAULT true NOT NULL,
  published_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 18. Community Clips Table
CREATE TABLE IF NOT EXISTS public.community_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  category TEXT DEFAULT 'CLUTCH' NOT NULL,
  moderation_status TEXT DEFAULT 'pending' NOT NULL CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 19. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT DEFAULT 'info' NOT NULL,
  link TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 20. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for Speed & Performance
CREATE INDEX IF NOT EXISTS idx_profiles_total_xp ON public.profiles(total_xp DESC);
CREATE INDEX IF NOT EXISTS idx_tournaments_status ON public.tournaments(status);
CREATE INDEX IF NOT EXISTS idx_tournament_registrations_user ON public.tournament_registrations(user_id);
CREATE INDEX IF NOT EXISTS idx_guild_members_guild ON public.guild_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_xp_transactions_user ON public.xp_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_clips_moderation ON public.community_clips(moderation_status);
CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON public.daily_activity(user_id, activity_date);
