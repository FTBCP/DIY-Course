-- Add outcomes column to courses table
-- Stores an array of outcome bullet points generated during course creation
ALTER TABLE courses ADD COLUMN IF NOT EXISTS outcomes jsonb DEFAULT '[]'::jsonb;
