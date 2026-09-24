-- Migration 014: Add player_name and player_uid columns to achievements table

ALTER TABLE public.achievements 
ADD COLUMN IF NOT EXISTS player_name TEXT,
ADD COLUMN IF NOT EXISTS player_uid TEXT;
