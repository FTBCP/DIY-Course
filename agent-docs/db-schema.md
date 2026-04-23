# db-schema.md

The complete Phase 1 database schema and how to change it safely. Read this before any task that touches Supabase tables, RLS policies, or migrations.

---

## Tables

### `users`

Supabase provides authenticated users via its built-in `auth.users` table. DIY Courses does not create a parallel `users` table in Phase 1 — we reference `auth.users.id` directly as a foreign key from other tables.

If profile data becomes needed later (display name, avatar, etc.), add a `profiles` table with a one-to-one relationship to `auth.users`. Not in Phase 1.

**Columns (managed by Supabase Auth, not manually migrated):**

| Column      | Type      | Notes                                     |
|-------------|-----------|-------------------------------------------|
| id          | uuid      | Primary key. Referenced by all other tables. |
| email       | text      | Unique. Used for login.                   |
| created_at  | timestamp | Auto-set on signup.                       |

---

### `courses`

One row per generated course. Owned by exactly one user.

| Column           | Type        | Nullable | Notes                                                                 |
|------------------|-------------|----------|-----------------------------------------------------------------------|
| id               | uuid        | no       | Primary key. Default: `gen_random_uuid()`.                            |
| user_id          | uuid        | no       | FK → `auth.users.id`. On delete: cascade.                             |
| title            | text        | no       | LLM-generated course title.                                           |
| topic            | text        | no       | The raw topic string the user entered on intake.                      |
| intake_answers   | jsonb       | no       | Full intake payload: `{ topic, depth, time }`.                        |
| status           | text        | no       | One of: `generating`, `complete`, `failed`. Default: `generating`.    |
| created_at       | timestamptz | no       | Default: `now()`.                                                     |

**Indexes:**
- `(user_id, created_at desc)` — for the user's course list, newest first.

**RLS policies:**
- `select`: `auth.uid() = user_id`
- `insert`: `auth.uid() = user_id`
- `update`: `auth.uid() = user_id` (needed so the client can't change ownership)
- `delete`: `auth.uid() = user_id`

---

### `lessons`

One row per lesson within a course. Ordered by the `order` column.

| Column           | Type        | Nullable | Notes                                                                            |
|------------------|-------------|----------|----------------------------------------------------------------------------------|
| id               | uuid        | no       | Primary key. Default: `gen_random_uuid()`.                                       |
| course_id        | uuid        | no       | FK → `courses.id`. On delete: cascade.                                           |
| order            | integer     | no       | 1-based position within course.                                                  |
| module           | text        | yes      | Optional module label grouping multiple lessons. Null if course isn't grouped.   |
| title            | text        | no       | LLM-generated lesson title.                                                      |
| body             | text        | yes      | Markdown. Null while generation is in progress.                                  |
| citations        | jsonb       | yes      | Array of `{ title, url, quote }`. Null until lesson body is generated.           |
| video_url        | text        | yes      | YouTube URL. Null if no video passed the quality filter.                         |
| video_metadata   | jsonb       | yes      | `{ channel, channel_id, views, published_at, duration }`. Null if no video.      |
| created_at       | timestamptz | no       | Default: `now()`.                                                                |

**Indexes:**
- `(course_id, order)` — primary access pattern; unique.

**RLS policies:**
Access is granted through the parent course. Policies read `courses.user_id` via a join:

- `select` / `insert` / `update` / `delete`: `exists (select 1 from courses where courses.id = lessons.course_id and courses.user_id = auth.uid())`

---

### `progress`

Tracks which lessons a user has viewed and completed. One row per `(user_id, lesson_id)` pair.

| Column          | Type        | Nullable | Notes                                                          |
|-----------------|-------------|----------|----------------------------------------------------------------|
| id              | uuid        | no       | Primary key. Default: `gen_random_uuid()`.                     |
| user_id         | uuid        | no       | FK → `auth.users.id`. On delete: cascade.                      |
| lesson_id       | uuid        | no       | FK → `lessons.id`. On delete: cascade.                         |
| last_viewed_at  | timestamptz | no       | Default: `now()`. Updated every time the lesson is loaded.     |
| completed_at    | timestamptz | yes      | Set when user marks complete. Null until then.                 |

**Indexes:**
- Unique `(user_id, lesson_id)` — there can only be one progress row per user-lesson pair.
- `(user_id, last_viewed_at desc)` — for "resume where you left off."

**RLS policies:**
- `select` / `insert` / `update` / `delete`: `auth.uid() = user_id`

---

### `rate_limits`

Tracks per-user generation counts to enforce the "1 course per 24 hours" rule server-side.

| Column           | Type        | Nullable | Notes                                                    |
|------------------|-------------|----------|----------------------------------------------------------|
| user_id          | uuid        | no       | Primary key. FK → `auth.users.id`. On delete: cascade.  |
| last_generated_at| timestamptz | no       | Timestamp of the most recent successful course create.   |
| count_24h        | integer     | no       | Generations in the last 24 hours. Resets automatically.  |

**RLS policies:**
- No client-side access. This table is read and written only by serverless functions using the Supabase service role key. RLS is `false` for all client roles.

---

## Relationships

```
auth.users (Supabase-managed)
    │
    ├──▶ courses (user_id)
    │       │
    │       └──▶ lessons (course_id)
    │
    ├──▶ progress (user_id) ──▶ lessons (lesson_id)
    │
    └──▶ rate_limits (user_id)
```

- One user has many courses.
- One course has many lessons.
- One user has many progress rows; each progress row points to one lesson.
- One user has exactly one rate_limits row.
- All deletes cascade — deleting a user removes everything they own.

---

## Safely changing the database

Every schema change goes through a migration file. Never click "edit" in the Supabase dashboard UI to change a live table — it won't be tracked and won't replay on the next deploy.

**Workflow:**

1. **Write the migration locally.** Create a new file in `/supabase/migrations/` named `YYYYMMDDHHMMSS_description.sql`. Write the `CREATE`, `ALTER`, or `DROP` statements.
2. **Test the migration locally first** if possible using `supabase start` and `supabase db reset`. If running Supabase locally isn't set up, review the SQL line by line before applying.
3. **Apply to the remote Supabase project** with `npx supabase db push`. This requires approval per AGENTS.md — do not run without asking.
4. **Commit the migration file** so it's reproducible and reviewable.
5. **Update this doc.** If columns, tables, or relationships change, update `db-schema.md` in the same commit. A schema change without a doc update is a half-done change.

**Rules for migrations:**

- **Never drop a column that has data** without first verifying the data is no longer needed anywhere (UI, serverless functions, analytics). Search the codebase for column name references before dropping.
- **Additive changes are safe.** Adding a nullable column, adding an index, adding a new table — these never break existing code.
- **Renames are two-step.** Add the new column, backfill, update code, then drop the old column in a later migration. Never rename in place on a live database.
- **Always include RLS policies in the same migration as the table.** A new table without RLS is wide open to every authenticated user — this is the single most dangerous class of mistake.
- **Enable RLS explicitly** with `alter table <name> enable row level security;`. The create-table statement does not enable RLS by default.
- **Test RLS with a non-admin session.** It's easy to write a policy that looks correct but fails an edge case. After every RLS change, sign in as a test user and verify they can only see their own data.

**Example migration template:**

```sql
-- supabase/migrations/20260423120000_add_courses_table.sql

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  topic text not null,
  intake_answers jsonb not null,
  status text not null default 'generating',
  created_at timestamptz not null default now()
);

create index courses_user_created_idx on public.courses (user_id, created_at desc);

alter table public.courses enable row level security;

create policy "users can select own courses"
  on public.courses for select
  using (auth.uid() = user_id);

create policy "users can insert own courses"
  on public.courses for insert
  with check (auth.uid() = user_id);

create policy "users can update own courses"
  on public.courses for update
  using (auth.uid() = user_id);

create policy "users can delete own courses"
  on public.courses for delete
  using (auth.uid() = user_id);
```

---

## What's deliberately not in the schema

- **No `users.profile` table.** Auth metadata is enough for Phase 1.
- **No versioning of lessons or courses.** Regeneration creates a new course rather than a new version.
- **No shared or public courses.** No `is_public` flag, no sharing tokens, no multi-user ownership.
- **No tags, categories, or topic taxonomy.** Topics are free text for Phase 1.
- **No ratings, comments, or feedback tables.**
- **No audit log.** If needed later, Supabase has a built-in audit feature; don't roll your own.
- **No soft deletes.** Deleted means gone. Cascades handle cleanup.
