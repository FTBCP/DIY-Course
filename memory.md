# memory.md

Scan this at the start of every work session. Update it at the end of every session.

## Project Status

**Phase:** Planning complete, pre-build.
**Progress:** 0% of Phase 1 features built. No code written yet.
**Repo contents:** `AGENTS.md`, `docs/spec.md`, `docs/mockups.jsx` only.

## Last Session

Set up the project foundation. Wrote the one-page spec, generated three screen mockups (intake, loading, course player), and created AGENTS.md with the full ruleset. Files moved into the repo and verified. Antigravity read all three foundation files and confirmed understanding of scope and rules.

## Decisions Made

- **Name:** "DIY Courses" as a working title. May change later.
- **User:** Curious adult learners, topic-agnostic. Not picking a narrower ICP in Phase 1.
- **Phase 1 features:** Topic intake (3 questions), grounded course generation (web sources + cited text + curated YouTube video), course-player UI (sidebar, progress, resume).
- **Out of scope for Phase 1:** Teach-back, quizzes, sharing, marketplace, mobile app, monetization, multi-language, editing/regenerating lessons, course versioning.
- **Stack:** React (Vite) + Tailwind, Supabase (Postgres + email/password auth), Vercel hosting, Anthropic Claude API with web search tool, YouTube Data API v3. Plain JavaScript, not TypeScript.
- **Grounded generation is a hard requirement.** Every lesson must have real citations. No ungrounded LLM output.
- **Videos use metadata filters only in Phase 1** (views, channel age, recency). Transcript-based quality scoring deferred to Phase 2.
- **Courses are read-only once generated.** No edit/regenerate in Phase 1. If the user doesn't like a course, they make a new one.
- **Rate limit from day one:** 1 course per user per day. Cheaper to add now than retrofit after a surprise API bill.
- **Terminal is Windows Command Prompt.** Not bash, not PowerShell. `touch` doesn't work.

## Known Problems

None yet — nothing has been built.

## Next Action

Choose one of these to start the build session:

1. **Get API keys first** (Anthropic, Supabase, YouTube Data API v3). ~20 minutes. No blockers later.
2. **Initialize Vite + React + Tailwind** in this folder, then build the intake screen as a static page referencing `docs/mockups.jsx`. No backend yet. Visible win in one session.
3. **Set up Supabase project** (no tables yet — just the project, API keys, and `.env.local`).

Recommended order: 1, then 2.

## Gotchas (things that went wrong before and how they were fixed)

*This section is empty — fill it in as you hit real problems. Template below for when you do.*

- **Problem:** [What broke, in one sentence.]
  **Fix:** [What actually worked.]
  **Lesson:** [What to remember next time.]

**Pre-seeded gotchas from HomeBase and planning sessions:**

- **Problem:** `touch` command doesn't work on Windows Command Prompt.
  **Fix:** Use `echo. > filename` to create an empty file, or use the IDE's file creator.
  **Lesson:** Never suggest bash commands for file creation on this machine.

- **Problem:** Antigravity can stall on very large prompts.
  **Fix:** Break the request into smaller steps. Ask for one file or one component at a time.
  **Lesson:** Even when a task feels small, split it if the prompt gets long.

- **Problem:** AI tools default to TypeScript unprompted.
  **Fix:** Explicitly call out "plain JavaScript, not TypeScript" at the start of any build request.
  **Lesson:** The `NEVER` list in AGENTS.md handles this, but double-check imports don't use `.ts` or `.tsx` extensions.

- **Problem:** AI tools will install shadcn, Material UI, or other component libraries unprompted.
  **Fix:** Reject the change and point back to AGENTS.md (Tailwind only, no component libraries).
  **Lesson:** Watch `package.json` after every build step. If a new dependency appeared that wasn't approved, remove it.
