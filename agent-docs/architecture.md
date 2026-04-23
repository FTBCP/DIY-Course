# architecture.md

How DIY Courses is built and why. Read this before any task that touches multiple files or crosses a layer boundary (UI ↔ database, client ↔ server, generation pipeline, etc.).

---

## System overview

DIY Courses is a single-page React app backed by Supabase (Postgres + auth) and a small set of serverless functions. Three external APIs are called: Anthropic Claude (with web search) for course generation, YouTube Data API v3 for video enrichment, and Supabase itself for persistence and auth.

There is no separate backend server in the traditional sense. All "backend" work runs in Vercel serverless functions under `/api`. This keeps the stack small and the deployment story trivial — one `git push` deploys everything.

```
Browser (React + Tailwind)
    │
    ├──▶ Supabase client (auth, reads, writes)        ← anon key, safe in browser
    │
    └──▶ Vercel serverless functions (/api/*)         ← secret keys live here
             │
             ├──▶ Anthropic Claude API (web search)
             ├──▶ YouTube Data API v3
             └──▶ Supabase service role (server writes only when needed)
```

**Why this shape:** it separates work that's safe in the browser (reads, auth flows, routine writes under RLS) from work that requires secret keys (generation, rate limiting, content safety checks). The browser never sees the Anthropic or YouTube keys.

---

## Layer boundaries

There are four layers. Code in each layer only talks to the layer directly below it.

1. **UI components** (`/src/components`, `/src/pages`) — React. Render data, capture input, call hooks. No direct API calls, no `fetch`.
2. **Hooks and state** (`/src/hooks`) — custom hooks wrap data operations. `useCourse(id)`, `useLessons(courseId)`, `useAuth()`. Components call hooks, not APIs.
3. **Client libraries** (`/src/lib`) — `supabase.js`, `api.js`. These know how to talk to Supabase (direct) and Vercel functions (via `fetch`). Hooks call libraries.
4. **Serverless functions** (`/api`) — the only place that handles secrets. Calls Claude, YouTube, and Supabase service role. Returns structured responses.

**Why layered:** when something breaks (and it will), you know where to look. A rendering bug is in layer 1. A data-shape bug is in layer 3. A generation bug is in layer 4. If layers mix, every bug could be anywhere.

---

## Data flow: the three critical paths

**1. User signs in and lands on the dashboard.**

Browser → Supabase auth (email/password) → session cookie stored → React reads session via `useAuth` → protected routes check session server-side via Supabase RLS before returning any data. RLS is the real security boundary. The UI redirect is UX, not protection.

**2. User submits intake and generation starts.**

Browser captures form state → `POST /api/courses/create` with intake answers → serverless function checks rate limit (1/24hr per user) → inserts `courses` row → kicks off async generation (see below) → returns course ID to browser → browser navigates to `/courses/:id` and shows loading state.

The loading screen **does not block** on generation. It polls `GET /api/courses/:id/status` every 2 seconds to read progress. This is critical — a 90-second synchronous request would time out on Vercel's default function limits.

**3. Generation pipeline runs.**

Triggered by `/api/courses/create`. Runs in a single serverless function (not queued) because Vercel's free tier keeps this simple. Sequence:

- Call Claude with the outline prompt. Get back 5–15 lesson titles as JSON.
- Insert empty `lessons` rows with titles and order. Loading screen now shows "outline ready."
- Loop through lessons: call Claude with the lesson prompt for each, save body + citations to the row. Loading screen advances as each completes.
- Loop through lessons again: call YouTube filter for each, save `video_url` + `video_metadata` if a match is found.
- Mark course as `status = 'complete'` in the database.

**Why two loops (content, then videos):** content is the expensive and essential step — if YouTube is down or slow, we don't want it blocking lesson generation. Videos are enrichment, not core.

**4. User reads a lesson.**

Browser → Supabase direct read of `lessons` (RLS enforces user owns the course) → render markdown body with `react-markdown` → embed YouTube iframe if `video_url` exists → update `progress.last_viewed_at` on load → on "Mark complete," insert/update `progress` row with `completed_at`.

---

## Patterns to follow

**Use Supabase RLS as the security boundary.** Every table has RLS policies that restrict rows to the authenticated user's own data. Do not add `WHERE user_id = $1` filters in application code as the only protection — RLS catches bugs that application code misses.

**Make serverless functions idempotent where possible.** If generation fails partway through, running it again should produce a sensible result (either resume from where it stopped or regenerate the missing lessons). Treat every function as if it might be retried.

**Keep prompts in `/src/prompts` as exportable strings, not inline in API handlers.** Prompts will change often. Isolating them makes A/B testing and iteration fast.

**Return structured JSON from serverless functions, always.** Every response is either `{ ok: true, data: ... }` or `{ ok: false, error: { code, message } }`. Never return bare strings, HTML, or uncaught exceptions.

**Client-side caching via React hooks.** Use a simple in-memory cache in hooks for read-heavy data (course titles, lesson lists). Invalidate on writes. Don't reach for React Query in Phase 1 — overkill for the data volume.

**Fail loud in dev, fail gentle in production.** Errors in dev mode surface full stack traces to the browser console. Errors in production show the user a generic message and log the real error server-side with the user ID and course ID.

---

## Anti-patterns to avoid

**Calling Anthropic or YouTube APIs from browser code.** Their keys would be exposed. Always route through a serverless function.

**Using `dangerouslySetInnerHTML`.** Lesson bodies are LLM-generated and can contain arbitrary strings. Render through `react-markdown` with HTML disabled.

**Building SQL with string concatenation or template literals.** Use Supabase's query builder. The moment you write `` `SELECT * FROM courses WHERE id = '${id}'` `` you have a vulnerability.

**Trusting client-side rate limits.** The "1 course per 24 hours" rule lives in the serverless function. The client-side check is for UX feedback only.

**Long-running synchronous API requests.** Anything over 10 seconds must be async with a polling pattern. Vercel's default function timeout is 10 seconds on hobby plan.

**Logging full request/response objects.** See security.md. Strip auth headers and secrets before logging, and log just the fields you need.

**Storing LLM output without validation.** Every Claude response is parsed and checked for required fields (body present, citations non-empty) before inserting into the database. A malformed response fails loudly, doesn't silently corrupt the course.

**Adding a new top-level folder.** Everything fits in the existing structure: `/src`, `/api`, `/docs`, `/agent-docs`, `/supabase`, `/public`. New folder = likely a sign the feature doesn't belong in Phase 1.

**Premature abstraction.** Do not build a "provider interface" that could swap Claude for GPT for Gemini. It adds complexity for a migration that probably won't happen. If it does, refactor then.

---

## What's deliberately not in the architecture

- **No Redis, no queue, no worker.** Generation runs in a single serverless function and writes progress to the database. Good enough for Phase 1 scale.
- **No CDN layer, no image optimization.** There are no uploaded images in Phase 1. Video thumbnails come from YouTube's CDN.
- **No WebSockets, no SSE.** The loading screen polls. Simpler, more robust, fine at this scale.
- **No separate admin app.** Admin tasks (viewing users, inspecting courses) are done via the Supabase dashboard directly.
- **No microservices.** Everything is either "browser code" or "serverless function." That's the whole topology.
