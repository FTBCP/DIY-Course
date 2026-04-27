ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS input_tokens integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS output_tokens integer DEFAULT 0;
