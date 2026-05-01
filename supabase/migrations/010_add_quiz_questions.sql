-- Add quiz_questions column to lessons table
ALTER TABLE public.lessons
  ADD COLUMN quiz_questions jsonb DEFAULT '[]'::jsonb;
