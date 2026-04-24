-- DIY Courses: Initial schema
-- Run this in the Supabase SQL Editor

-- ============================================
-- COURSES
-- ============================================
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text,
  topic text not null,
  intake_answers jsonb not null,
  status text default 'generating' not null,
  created_at timestamptz default now() not null
);

-- ============================================
-- LESSONS
-- ============================================
create table public.lessons (
  id uuid default gen_random_uuid() primary key,
  course_id uuid references public.courses(id) on delete cascade not null,
  "order" int not null,
  title text not null,
  body text,
  citations jsonb,
  video_url text,
  video_metadata jsonb,
  created_at timestamptz default now() not null
);

-- ============================================
-- PROGRESS
-- ============================================
create table public.progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  lesson_id uuid references public.lessons(id) on delete cascade not null,
  completed_at timestamptz,
  last_viewed_at timestamptz default now() not null,
  unique(user_id, lesson_id)
);

-- ============================================
-- ROW LEVEL SECURITY
-- Users can only access their own data
-- ============================================

alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.progress enable row level security;

-- Courses: users see and create only their own
create policy "Users can view own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "Users can create own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

-- Lessons: users see lessons belonging to their courses
create policy "Users can view lessons for own courses"
  on public.lessons for select
  using (
    course_id in (select id from public.courses where user_id = auth.uid())
  );

-- Progress: users see, create, and update their own progress
create policy "Users can view own progress"
  on public.progress for select
  using (auth.uid() = user_id);

create policy "Users can create own progress"
  on public.progress for insert
  with check (auth.uid() = user_id);

create policy "Users can update own progress"
  on public.progress for update
  using (auth.uid() = user_id);
