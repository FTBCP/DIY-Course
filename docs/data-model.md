# Data Model

## Overview

Four logical entities. Supabase manages `users` through its built-in auth system (`auth.users`). The other three tables live in `public` schema.

## Tables

### auth.users (managed by Supabase)
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| email | text | User's email address |
| created_at | timestamptz | Auto-set on signup |

### courses
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| user_id | uuid | FK → auth.users(id), cascade delete |
| title | text | Set after outline generation (nullable initially) |
| topic | text | The raw topic from intake, required |
| intake_answers | jsonb | `{depth, time}` from intake form |
| status | text | `generating`, `complete`, or `failed` |
| created_at | timestamptz | Auto-set |

### lessons
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| course_id | uuid | FK → courses(id), cascade delete |
| order | int | Position within the course (1-indexed) |
| title | text | Lesson title, required |
| body | text | Markdown content (null until generated) |
| citations | jsonb | Array of `{source_title, url, quote}` |
| video_url | text | YouTube embed URL, nullable |
| video_metadata | jsonb | `{channel, views, published_at}`, nullable |
| created_at | timestamptz | Auto-set |

### progress
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key, auto-generated |
| user_id | uuid | FK → auth.users(id), cascade delete |
| lesson_id | uuid | FK → lessons(id), cascade delete |
| completed_at | timestamptz | Set when user marks lesson complete |
| last_viewed_at | timestamptz | Updated every time lesson loads |
| | | Unique constraint on (user_id, lesson_id) |

## Relationships

- One user → many courses
- One course → many lessons
- One user → many progress records
- One lesson → one progress record per user

## Row Level Security

All tables have RLS enabled. Users can only access rows tied to their own `user_id`. Edge Functions use the service role key and bypass RLS.
