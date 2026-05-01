-- Add quiz_results column to progress table
-- Stores { correct: number, total: number, completed_at: string }
ALTER TABLE public.progress
  ADD COLUMN quiz_results jsonb;
