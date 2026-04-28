-- Migration: Add body_side column to training_sets table
-- Run this in the Supabase SQL editor if you already have data in your cloud sync database
-- This adds support for tracking which side of the body was used for exercises (left, right, or both)

-- Add body_side column if it doesn't exist
ALTER TABLE IF EXISTS public.training_sets
ADD COLUMN IF NOT EXISTS body_side text;

-- Add constraint to ensure valid values
ALTER TABLE IF EXISTS public.training_sets
DROP CONSTRAINT IF EXISTS training_sets_body_side_check;

ALTER TABLE IF EXISTS public.training_sets
ADD CONSTRAINT training_sets_body_side_check
CHECK (body_side in ('left', 'right', 'both') or body_side is null);

-- Set default value to NULL for existing records (they'll get null, which represents "both" or unspecified)
-- No update needed since column was just added and defaults to NULL

-- Create index on body_side for faster queries
CREATE INDEX IF NOT EXISTS idx_training_sets_body_side ON public.training_sets(user_id, body_side);

-- Verify the column exists and is working
-- SELECT column_name FROM information_schema.columns WHERE table_name='training_sets' AND column_name='body_side';
