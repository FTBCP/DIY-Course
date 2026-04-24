# DIY Courses — One-Page Spec

**Working title:** DIY Courses
**Status:** Phase 1 spec, pre-build
**Owner:** Geoff

---

## 1. What it is

DIY Courses is an app that turns "I want to learn X" into a personalized, well-structured mini-course. The user answers a few short questions about their topic, the app generates a sequenced course grounded in real web sources and curated YouTube videos, and the user works through it in a clean course-player interface.

Phase 1 is about **content quality and delivery** — not retention mechanics, social features, or monetization. Build something that feels like a polished Teachable course, but generated on demand.

---

## 2. User stories (Phase 1)

- **Topic intake.** As a curious adult learner, I want to answer a few short questions about what I want to learn so the app can generate a course matched to my topic, depth, and time commitment.
- **Grounded course generation.** As a curious adult learner, I want each lesson to be written from real cited web sources and include a relevant curated video so I can trust the content and verify anything that looks off.
- **Course player.** As a curious adult learner, I want a clean reading interface with sidebar navigation, mark-as-complete, and resume-where-I-left-off so I can work through a course across multiple sessions without losing my place.

---

## 3. Data model

Four tables, minimal relationships, read-only once generated.

**users**
- `id`, `email`, `created_at`

**courses**
- `id`, `user_id` (fk → users), `title`, `topic`, `intake_answers` (json: depth, time commitment, any other intake fields), `created_at`

**lessons**
- `id`, `course_id` (fk → courses), `order` (int, position within course), `title`, `body` (markdown), `citations` (json: array of `{source_title, url, quote}`), `video_url` (nullable), `video_metadata` (json: channel, views, published_at)

**progress**
- `id`, `user_id` (fk → users), `lesson_id` (fk → lessons), `completed_at`, `last_viewed_at`

**Relationships:** one user has many courses; one course has many lessons; one user has many progress records. No course sharing, no multi-user courses, no versioning. If a user doesn't like a generated course, they generate a new one — old one stays as-is.

---

## 4. Out of scope (explicitly not in Phase 1)

- Teach-back / comprehension checkpoints (Phase 2 — highest-priority add)
- Quizzes, flashcards, spaced repetition
- Editing or regenerating individual lessons
- Course versioning or revision history
- Sharing, public courses, marketplace, social features
- Ratings, comments, reviews
- Transcript-based video quality scoring (Phase 1 uses metadata filters only)
- Monetization, paywall, subscription billing
- Mobile app (web-responsive only in Phase 1)
- Offline access, downloads, exports (PDF/EPUB)
- Multi-language support (English only)
- Affiliate link injection
- Admin dashboard, analytics beyond basic counts
- Notifications, email, drip scheduling

---

## 5. Top 3 risks to know before building

**1. Content quality is the entire product — and it's the hardest thing to get right.** Your differentiation is "better than ChatGPT can produce in one prompt." That bar is higher than it sounds. Grounded generation with citations gets you most of the way, but you'll need to actually read generated courses and iterate on prompts until they stop feeling like AI slop. Budget real time for this. A working MVP with mediocre content is worse than no MVP because it burns your gut on the idea. Plan to generate 10+ courses on topics you know well before showing it to anyone.

**2. Per-course cost adds up fast.** Grounded generation means multiple web searches + a big content-generation call per lesson, plus YouTube API calls. A 10-lesson course could easily cost $0.50–$2.00 in API spend. Fine for you testing. Not fine if you open a free tier and someone generates 100 courses overnight. Build in a per-user rate limit from day one (e.g., 1 course per day on free tier) — it's much easier to add at build time than retrofit after a surprise bill.

**3. YouTube embeds are fragile.** Videos get deleted, go private, get age-restricted, or lose embed permission with no warning. If your course-player shows "Video unavailable" half the time, the whole app feels broken even if the text is great. Build a graceful fallback (hide the video slot cleanly when it's dead) and consider a background job that revalidates video URLs periodically. Don't learn this after launch.

---

## 6. Recommended tech stack (beginner-friendly, Antigravity-compatible)

Matches your HomeBase setup so you're not learning new tools. Plain-English explanations for each piece:

- **React** — the frontend framework that builds the pages the user sees. Same as HomeBase. You already know the shape of it.
- **Tailwind CSS** — styling library that lets you design clean interfaces without writing separate CSS files. Good match for the "clean course-player" goal.
- **Vercel** — hosts the app on the public internet. Free tier is enough for Phase 1. One-click deploy from GitHub.
- **Supabase** — the database + user authentication + file storage, all in one. Handles the four tables above. Built-in email/password login so you don't have to build auth yourself.
- **Anthropic Claude API** — generates the course outline and lesson content. Use Claude with web search turned on (built-in tool) so lessons are grounded in real sources with citations — this is the single most important quality decision. Alternative: OpenAI with their web search tool. Either works; pick whichever API you're more comfortable with.
- **YouTube Data API v3** — free tier (10,000 units/day, plenty for Phase 1). Used to search for videos and pull metadata (views, channel, publish date) so you can filter for quality.
- **GitHub** — source control. Same account you use for HomeBase. Antigravity pushes here.
- **Antigravity IDE** — your build environment. Same workflow as HomeBase: documentation-first, one step at a time, Windows Command Prompt terminal commands.

**What you're deliberately not using in Phase 1:** no Redis, no queue/worker system, no separate backend server, no payment processor, no analytics platform, no email service. Supabase + Vercel + Claude API + YouTube API is the entire stack. Keep it boring.

---

## 7. Definition of done for Phase 1

You ship Phase 1 when you (Geoff) can:

1. Sign in with email/password
2. Answer the intake questions for any topic
3. Get back a course of roughly 5–15 lessons, generated in under 2 minutes
4. Read through every lesson with working citations and a working video embed (or a clean fallback)
5. Close the tab, come back tomorrow, and resume exactly where you left off
6. Generate a second course on a different topic without the first one getting confused

If any of those six don't work end-to-end, you're not done. If all six work and the content actually teaches you something, ship it and start Phase 2 planning.
