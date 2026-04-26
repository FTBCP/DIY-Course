-- Add token usage tracking to courses table
-- Lets us show estimated API cost per course and monitor spend

ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0;
