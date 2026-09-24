-- 009_add_slots_filled.sql
-- Add slots_filled column to tournaments table to avoid schema cache error

ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS slots_filled INTEGER DEFAULT 0 NOT NULL;
