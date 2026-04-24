# roadmap.md

Phase 1 build plan for DIY Courses. Each unchecked task is sized to fit in a single AI prompt. Work top-to-bottom. Check boxes as you go. If a task balloons past one prompt, split it.

---

## Phase 0 — Foundation (do before any features)

Setup work that unblocks everything else. None of this produces visible progress, but skipping it costs you later.

- [ ] Create Anthropic API account, generate API key, note billing limit.
- [ ] Create Supabase project. Copy project URL and anon key into a note.
- [ ] Create Google Cloud project, enable YouTube Data API v3, generate API key.
- [ ] Initialize Vite + React project in the repo (`npm create vite@latest . -- --template react`).
- [ ] Install and configure Tailwind CSS per the official Vite guide.
- [ ] Install `@supabase/supabase-js` and create `src/lib/supabase.js` that exports a configured client.
- [ ] Create `.env.local` with the three API keys and `.env.example` with empty placeholders. Confirm `.env.local` is in `.gitignore`.
- [ ] Confirm `npm run dev` starts the app and the default Vite page renders at localhost.
- [ ] Push the initial commit to GitHub and connect the repo to Vercel. Confirm auto-deploy works.

---

## Phase 1 — Feature 1: Topic Intake

User answers three questions (topic, depth, time commitment) and submits. No generation yet — this feature ends with the answers being captured and ready to send to the generator.

**Database**

- [ ] Write Supabase migration: create `users` table (id, email, created_at). Use Supabase's built-in auth tables if possible.
- [ ] Write Supabase migration: create `courses` table (id, user_id fk, title, topic, intake_answers jsonb, created_at).
- [ ] Apply both migrations to the Supabase project.

**Auth**

- [ ] Build sign-up and sign-in pages using Supabase email/password auth. Two routes: `/signup`, `/signin`.
- [ ] Add a simple auth wrapper component that redirects unauthenticated users to `/signin`.
- [ ] Add a sign-out button somewhere visible (top right header).

**Intake UI**

- [ ] Build the intake page as a static component — three questions, styled to match `docs/mockups.jsx`. No submit behavior yet.
- [ ] Add form state management with React hooks. Validate: topic is required, depth is one of three values, time is one of four values.
- [ ] Wire the Generate button to create a new row in the `courses` table with `intake_answers` populated, then navigate to a placeholder `/courses/:id` route.
- [ ] Test: sign up, sign in, submit the intake, confirm the row appears in Supabase with the right data.

---

## Phase 1 — Feature 2: Grounded Course Generation

AI generates the outline and lesson content using web search with citations. YouTube video added per lesson when one meets the quality filter.

**Database**

- [ ] Write Supabase migration: create `lessons` table (id, course_id fk, order int, title, body text, citations jsonb, video_url text nullable, video_metadata jsonb nullable).
- [ ] Apply the migration.

**Prompt engineering**

- [ ] Write the outline prompt in `src/prompts/outline.js`. Input: intake answers. Output: JSON array of 5–15 lesson titles with brief descriptions, matched to depth and time.
- [ ] Write the lesson prompt in `src/prompts/lesson.js`. Input: course topic, lesson title, lesson description. Output: lesson body (markdown) + citations array of `{title, url, quote}`.
- [ ] Write the video filter logic in `src/lib/youtube.js`: search YouTube for the lesson topic, filter results (min 10k views, published within 5 years, channel age >1yr), return best match or null.

**Generation pipeline**

- [ ] Build `src/lib/claude.js` — a Claude API client with the web search tool enabled. Exports a `generate(systemPrompt, userMessage)` function.
- [ ] Build the outline generation flow: read the course's intake answers, call the outline prompt, store lesson titles as placeholder rows in `lessons` table (body empty, order set).
- [ ] Build the lesson generation flow: loop through each lesson row, call the lesson prompt, save body + citations to the row.
- [ ] Build the video enrichment flow: for each lesson, call the YouTube filter, save video_url + video_metadata if a match is found.
- [ ] Add a server-side rate limit: one course generation per user per 24 hours. Store the timestamp on the user or a separate `rate_limits` table.
- [ ] Handle errors: if Claude returns no citations, retry once. If it fails again, mark the lesson as failed in the database and surface a plain-English error to the user.

**Loading state**

- [ ] Build the loading-state UI (Screen 2 from `docs/mockups.jsx`) — topic callout, progress bar, 5-step checklist, footer copy. Shown while generation runs.
- [ ] Wire the loading state to poll the database every 2 seconds and advance the checklist as lessons complete. When all lessons are done, navigate to the course player.

---

## Phase 1 — Feature 3: Course Player

Clean reading interface. Sidebar of lessons, content area with markdown + inline citations + embedded video + source list, prev/next navigation, mark-complete, resume on return.

**Database**

- [ ] Write Supabase migration: create `progress` table (id, user_id fk, lesson_id fk, completed_at, last_viewed_at).
- [ ] Apply the migration.

**Player shell**

- [ ] Build the two-column layout (dark sidebar + light main area) matching `docs/mockups.jsx`. Route: `/courses/:id`.
- [ ] Build the sidebar: course title, overall progress bar, grouped lesson list with three states (complete, current, upcoming).
- [ ] Make each sidebar lesson clickable — clicking changes the current lesson shown in the main area.

**Content rendering**

- [ ] Build the main content area: breadcrumb, title, meta row (read time estimate, video presence, source count), markdown body with inline citation superscripts.
- [ ] Render markdown body safely (use `react-markdown` or equivalent). Inline citations link to the source list below.
- [ ] Render the video card: YouTube embed iframe if `video_url` exists, hidden cleanly if null. Include channel name and view count.
- [ ] Render the sources block at the bottom: numbered list of citations with title + "View" link that opens the source URL in a new tab.

**Progress + navigation**

- [ ] Build prev/next lesson buttons at the bottom. Show the names of adjacent lessons, not just "Next."
- [ ] Wire "Mark complete & continue": insert a row in `progress` with `completed_at` set, then navigate to the next lesson.
- [ ] Update `last_viewed_at` whenever a lesson loads.
- [ ] On course entry (`/courses/:id` with no lesson specified), redirect to the user's last viewed lesson, or lesson 1 if no progress exists.

**Video fallback**

- [ ] Add a background check: if a video URL returns an "unavailable" response from YouTube's oEmbed API, set `video_url` to null in the database so the card hides cleanly. Run this check when a lesson loads.

---

## Phase 1 — Done when

- [ ] Sign in with email/password works end-to-end.
- [ ] Submitting the intake creates a course and kicks off generation.
- [ ] A 5–15 lesson course generates in under 2 minutes with citations on every lesson.
- [ ] Every lesson either has a working video embed or cleanly hides the video slot.
- [ ] Closing the tab and returning lands the user on their last viewed lesson.
- [ ] Generating a second course on a different topic works without confusing the first.
- [ ] Deployed to Vercel on a public URL that you (Geoff) can load from your phone.

If all seven pass, ship it and start Phase 2 planning.

---

## NOT building yet — Phase 2 or later

Each of these was considered and deliberately deferred. Do not let scope creep pull them forward.

- [ ] **Teach-back checkpoints.** Highest-priority Phase 2 add — this is the retention mechanic that makes the app sticky.
- [ ] **Editing or regenerating individual lessons.** Courses stay read-only in Phase 1. User regenerates a whole course if unhappy.
- [ ] **Course versioning or revision history.**
- [ ] **Sharing, public courses, marketplace, social features.**
- [ ] **Quizzes, flashcards, spaced repetition.**
- [ ] **Ratings, comments, reviews.**
- [ ] **Transcript-based video quality scoring.** Metadata filters only in Phase 1.
- [ ] **Monetization, paywall, subscription billing.** Phase 1 ships free or invite-only.
- [ ] **Native mobile app.** Web-responsive only in Phase 1.
- [ ] **Offline access, downloads, PDF/EPUB exports.**
- [ ] **Multi-language support.** English only in Phase 1.
- [ ] **Affiliate link injection into lessons.**
- [ ] **Admin dashboard, analytics beyond basic counts.**
- [ ] **Email notifications, drip scheduling, course reminders.**
- [ ] **OAuth providers (Google, GitHub).** Email/password only in Phase 1.
- [ ] **Mobile-first redesign or separate mobile layouts.**

If you find yourself wanting to build one of these during Phase 1, stop and ask: "Will shipping Phase 1 fail without this?" If no, add it to Phase 2 and keep going.
