ALTER TABLE courses
ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS share_token uuid DEFAULT gen_random_uuid();

-- Allow anyone (signed in or not) to read public courses
CREATE POLICY "Public courses viewable by anyone"
  ON courses FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

-- Allow anyone to read lessons of public courses
CREATE POLICY "Lessons of public courses viewable by anyone"
  ON lessons FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM courses
      WHERE courses.id = lessons.course_id
      AND courses.is_public = true
    )
  );
