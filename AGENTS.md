# AGENTS.md

Read this file at the start of every session before taking any action.

## Project

DIY Courses — a web app that generates personalized, grounded mini-courses on any topic. User answers 3 intake questions, app generates a sequenced course using web-grounded AI with cited sources and curated YouTube videos, user reads through it in a course-player interface. Phase 1 is focused on content quality and delivery. Not in Phase 1: teach-back, quizzes, sharing, marketplace, mobile app, monetization. Owner is a non-technical founder — explain reasoning in plain English, never assume technical shortcuts are understood.

## Stack

- React (Vite) + Tailwind CSS on the frontend
- Supabase for Postgres database + email/password auth
- Vercel for hosting (auto-deploy from main branch on GitHub)
- Anthropic Claude API (with web search tool enabled) for course generation
- YouTube Data API v3 for video search and metadata
- Plain JavaScript (not TypeScript) in Phase 1

## Folder Structure

```
/src
  /components      UI components (CoursePlayer, Intake, LoadingState, etc.)
  /pages           Route-level views
  /lib             API clients (supabase.js, claude.js, youtube.js)
  /prompts         System prompts for Claude (outline.js, lesson.js, video-filter.js)
  /hooks           React hooks
/docs              Markdown specs and reference docs
/public            Static assets
```

## Commands

Terminal is Windows Command Prompt (NOT bash, NOT PowerShell). Use `cmd.exe` syntax.

- Install dependencies: `npm install`
- Run dev server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint: `npm run lint`
- Create a new file: use the IDE's file creator (the `touch` command does not work on Windows)
- Deploy: `git push origin main` (Vercel auto-deploys)
- Supabase migrations: `npx supabase db push`

## Rules

- Make changes one step at a time. After each change, stop and confirm it works before starting the next.
- Explain every change in plain English before writing code. State what will change, which files, and why.
- When a task requires more than one file change, list the full plan first and wait for approval.
- All API keys live in `.env.local` and are referenced via `import.meta.env.VITE_*`. Never hardcode keys.
- All Claude API calls must use web search grounding and return citations. No ungrounded generation.
- All generated lesson content must include a `citations` array. If Claude returns no citations, treat the response as failed and retry.
- YouTube videos are optional per lesson. If no video meets the quality filter (min 10k views, channel age >1yr, published within 5 years), set `video_url` to null rather than forcing a bad match.
- Rate-limit course generation to 1 course per user per day from day one.
- When generation fails, surface the actual error to the user in plain English. Never show a generic "something went wrong."

## Permissions

- You can freely read and edit any file under `/src` and `/docs`.
- You can install new npm packages only after explaining why and getting approval.
- You can run `npm run dev`, `npm run build`, `npm run lint` without asking.
- You can create Supabase migration files in `/supabase/migrations` but do not run `db push` without approval.
- You can edit `.env.example` freely. You cannot read or write `.env.local`.

## NEVER

- Never use bash syntax (`touch`, `ls`, `&&` chains, `export VAR=`). Use Windows Command Prompt equivalents.
- Never run `git push --force`, `git reset --hard`, or `rm -rf` on any directory.
- Never commit `.env.local`, `.env`, or any file containing an API key.
- Never call the Claude API without the web search tool enabled.
- Never fabricate citations, source URLs, YouTube video IDs, or channel names. If real data isn't available, return null.
- Never use TypeScript syntax — Phase 1 is plain JavaScript only.
- Never add new top-level folders without approval (no `/utils`, `/helpers`, `/services` sprawl).
- Never install a UI component library (Material UI, Chakra, shadcn, etc.) — styling is Tailwind only.
- Never add authentication providers beyond Supabase email/password in Phase 1 (no Google OAuth, no magic links).
- Never write tests in Phase 1 unless explicitly asked. Manual verification only.
- Never modify the data model (users, courses, lessons, progress tables) without updating `/docs/data-model.md` in the same commit.
- Never generate or display content for a topic flagged as harmful (weapons, self-harm, illegal activity). Return a polite refusal in the intake flow.
- Never run large batch operations (generating multiple courses, backfilling data) without explicit approval.

## Key Files

- `/docs/spec.md` — the one-page Phase 1 spec. Source of truth for scope.
- `/docs/data-model.md` — the four tables and their relationships.
- `/docs/mockups.jsx` — visual reference for intake, loading, and course player screens.
- `/src/prompts/outline.js` — system prompt for generating a course outline from intake answers.
- `/src/prompts/lesson.js` — system prompt for generating a single lesson with citations.
- `/src/lib/supabase.js` — Supabase client and query helpers.
- `/src/lib/claude.js` — Claude API client with web search enabled.
- `/.env.example` — template for environment variables (no real values).

## Reference Docs

- Supabase JS client: https://supabase.com/docs/reference/javascript
- Claude API with web search: https://docs.claude.com/en/docs/agents-and-tools/tool-use/web-search-tool
- YouTube Data API v3 search: https://developers.google.com/youtube/v3/docs/search/list
- Vercel deployment: https://vercel.com/docs/deployments/overview
- Tailwind CSS utility reference: https://tailwindcss.com/docs
