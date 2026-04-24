# memory.md

Scan this at the start of every work session. Update it at the end of every session.

## Project Status

**Phase:** Phase 1 (Content Quality & Delivery) — Core engine built.
**Progress:** ~85% of Phase 1 features built. Course generation, persistent storage, and progress tracking are live.
**Repo contents:** Full React app with Auth, Course Player, Dashboard, and Supabase Edge Functions.

## Last Session

Successfully finalized the end-to-end course generation and consumption flow.
- **Progress Tracking:** Implemented DB-persisted progress. Courses now resume at the last viewed lesson. "Mark complete" updates the DB and reflects in the sidebar.
- **Markdown Rendering:** Integrated `marked` and custom CSS prose styles to render Claude's Markdown output beautifully.
- **Dashboard:** Added a historical "Your Courses" view to the Dashboard for easy access to past learning.
- **Stability:** Hard-capped generation to 1 lesson (synchronous) to bypass 150s infrastructure timeouts. Added a 90s client-side timeout/circuit-breaker in the Loading Screen.
- **Fixes:** Fixed several React Hook violations and unused variable lint errors.

## Decisions Made

- **Sync vs Async:** Stuck with synchronous generation for now to simplify state management, but limited to 1 lesson to guarantee completion under 150s.
- **Markdown Parsing:** Chose `marked` for its simplicity and performance in rendering course content.
- **Navigation:** Backwards navigation is restricted on the first lesson; "Mark Complete" replaces "Next" for uncompleted lessons.
- **Rate Limits:** Temporarily disabled during testing, but marked for re-enabling in production.

## Known Problems

- **Course Length:** Currently hard-coded to 1 lesson for stability. Need "lazy" generation for longer courses.
- **Video Fallbacks:** If YouTube returns no results, the player currently shows an empty space; needs a graceful empty state.

## Next Action

1. **Lazy Lesson Generation:** Refactor the Edge Function to generate the outline first, then generate lessons individually when the user clicks "Next" or navigates to them. This will allow for 5–15 lesson courses without timeout risks.
2. **Video Fallback UI:** Add a "Video unavailable" placeholder or hide the video card if `video_url` is null.
3. **Production Hardening:** Re-enable daily rate limits and update `.env.example`.

## Gotchas

- **Problem:** Supabase Edge Functions have a strict 150s execution limit (and often hit 100s timeouts in practice).
  **Fix:** Optimized generation prompt and capped lesson count. Added a client-side `Promise.race` timeout to prevent the UI from hanging forever.
  **Lesson:** Always have a client-side timeout that is slightly shorter than the server-side one.

- **Problem:** React Hook rules were violated by an early return in `LoadingScreen.jsx`.
  **Fix:** Moved all hook calls above the conditional return and destructured `location.state` with a fallback.
  **Lesson:** Hooks first, logic second, returns last.

- **Problem:** Sidebar navigation was using a hardcoded `gi * 3` index which broke with dynamic lesson counts.
  **Fix:** Changed to a flat index counter that increments as it maps through the grouped modules.
  **Lesson:** Avoid math based on fixed assumptions (like "3 lessons per module") in dynamic UI components.
