# api-reference.md

All internal API routes served by Vercel serverless functions under `/api/*`. Read this before any task that adds, modifies, or calls one of these endpoints.

Every endpoint follows the same response envelope:

```json
// Success
{ "ok": true, "data": { /* route-specific */ } }

// Failure
{ "ok": false, "error": { "code": "string", "message": "string" } }
```

Never return bare strings, HTML, or uncaught exceptions. Never leak stack traces or API error bodies through `error.message` — keep it user-safe.

---

## Auth model

All protected endpoints expect a Supabase session. The session cookie is sent automatically by the browser when using the Supabase JS client. On the server, the endpoint:

1. Reads the session from the request cookies.
2. Verifies it with `supabase.auth.getUser()`.
3. If no user, returns `401 { ok: false, error: { code: "unauthenticated", message: "Sign in required." } }`.

The column "Auth" in each endpoint below indicates whether login is required.

---

## Endpoints

### `POST /api/courses/create`

Creates a new course and kicks off generation.

- **Auth:** required.
- **Rate limit:** 1 per user per 24 hours (enforced via `rate_limits` table).
- **Request body:**

  ```json
  {
    "topic": "Compound interest",
    "depth": "intermediate",
    "time": "weekend"
  }
  ```

- **Validation:**
  - `topic`: non-empty string, max 200 chars.
  - `depth`: one of `overview`, `intermediate`, `deep`.
  - `time`: one of `afternoon`, `weekend`, `week`, `month`.
  - `topic` passes the content safety block list (no weapons, self-harm, CSAM, etc.).

- **Response (success):**

  ```json
  {
    "ok": true,
    "data": { "course_id": "uuid", "status": "generating" }
  }
  ```

- **Response (failure):**
  - `code: "rate_limited"` — user has generated in the last 24 hours.
  - `code: "invalid_input"` — validation failed. Include which field.
  - `code: "topic_rejected"` — content safety block list matched.
  - `code: "generation_failed"` — Claude API error.

- **Behavior:**
  - Creates a `courses` row with `status = 'generating'`.
  - Updates `rate_limits` for the user.
  - Fires the generation pipeline (async, does not block the response).
  - Returns immediately with the course ID so the browser can navigate to the loading screen.

---

### `GET /api/courses/:id/status`

Polled by the loading screen to show generation progress.

- **Auth:** required. User must own the course.
- **Request:** no body.
- **Response (success):**

  ```json
  {
    "ok": true,
    "data": {
      "status": "generating",
      "lessons_total": 9,
      "lessons_with_body": 4,
      "lessons_with_video": 2,
      "stage": "generating_content"
    }
  }
  ```

  `stage` is one of: `framing`, `generating_content`, `finding_videos`, `complete`, `failed`. The loading screen uses this to advance the visual checklist.

- **Response (failure):**
  - `code: "not_found"` — no course with that ID, or user does not own it.
  - `code: "unauthenticated"` — no session.

- **Behavior:**
  - Reads the `courses` row, counts `lessons` rows with non-null `body` and `video_url`, returns a summary.
  - No writes. Pure read.

---

### `GET /api/courses/:id`

Fetch a single course and its lessons for the course-player view.

- **Auth:** required. User must own the course.
- **Request:** no body.
- **Response (success):**

  ```json
  {
    "ok": true,
    "data": {
      "course": {
        "id": "uuid",
        "title": "Compound Interest, Explained",
        "topic": "Compound interest",
        "status": "complete",
        "created_at": "2026-04-23T12:00:00Z"
      },
      "lessons": [
        {
          "id": "uuid",
          "order": 1,
          "module": "Foundations",
          "title": "What makes compound interest different",
          "body": "...markdown...",
          "citations": [{ "title": "...", "url": "...", "quote": "..." }],
          "video_url": "https://youtube.com/watch?v=...",
          "video_metadata": { "channel": "Khan Academy", "views": 2400000 }
        }
      ]
    }
  }
  ```

- **Response (failure):**
  - `code: "not_found"` — course doesn't exist or isn't owned by the user.
  - `code: "unauthenticated"` — no session.

- **Note:** in Phase 1, this endpoint is optional. The browser can query Supabase directly with RLS, which is simpler. Use this endpoint only if we need server-side shaping of the response (e.g. stripping fields, merging progress). Default to direct Supabase reads from the client.

---

### `GET /api/courses`

List the authenticated user's courses, newest first.

- **Auth:** required.
- **Response (success):**

  ```json
  {
    "ok": true,
    "data": {
      "courses": [
        {
          "id": "uuid",
          "title": "Compound Interest, Explained",
          "topic": "Compound interest",
          "status": "complete",
          "lessons_total": 9,
          "lessons_complete": 3,
          "created_at": "2026-04-23T12:00:00Z"
        }
      ]
    }
  }
  ```

- **Note:** same "prefer direct Supabase" guidance as the single-course endpoint. Build this serverless version only if joining `courses` + `lessons` + `progress` client-side becomes awkward.

---

### `POST /api/lessons/:id/progress`

Mark a lesson as viewed or completed.

- **Auth:** required. User must own the lesson's parent course.
- **Request body:**

  ```json
  {
    "event": "viewed" // or "completed"
  }
  ```

- **Validation:** `event` must be exactly `viewed` or `completed`.
- **Response (success):**

  ```json
  {
    "ok": true,
    "data": {
      "lesson_id": "uuid",
      "last_viewed_at": "2026-04-23T12:00:00Z",
      "completed_at": "2026-04-23T12:05:00Z"
    }
  }
  ```

- **Behavior:**
  - `viewed`: upserts a `progress` row for `(user_id, lesson_id)`, setting `last_viewed_at = now()`. Does not change `completed_at`.
  - `completed`: upserts a `progress` row, setting both `last_viewed_at` and `completed_at` to `now()`.

- **Note:** same "prefer direct Supabase" guidance applies — this can be done client-side with RLS. Only add the serverless wrapper if we need server-side logic (e.g. triggering a notification).

---

### `GET /api/videos/check`

Validate that a YouTube video is still embeddable. Used as a background check on video URLs to avoid "video unavailable" states in the player.

- **Auth:** required.
- **Request:**

  ```
  GET /api/videos/check?url=https://youtube.com/watch?v=abc123
  ```

- **Response (success):**

  ```json
  {
    "ok": true,
    "data": { "embeddable": true }
  }
  ```

  Or `{ "embeddable": false }` if the video is private, deleted, or region-locked.

- **Behavior:**
  - Calls YouTube's oEmbed endpoint (`https://www.youtube.com/oembed?url=...`).
  - Returns `true` on 200, `false` on 401/404.
  - Caller (typically the course player) updates the `lessons` row to set `video_url = null` if not embeddable.

---

## Endpoints that are deliberately NOT built in Phase 1

Listed here so they don't get suggested by the AI during build:

- No `POST /api/courses/:id/regenerate` — courses are read-only once created.
- No `PATCH /api/lessons/:id` — lessons are not user-editable.
- No `POST /api/courses/:id/share` — no sharing in Phase 1.
- No `GET /api/users/me` — user info comes directly from Supabase's `auth.getUser()` on the client.
- No admin endpoints — Supabase dashboard handles admin needs.
- No webhook endpoints — no integrations in Phase 1.
- No payment or billing endpoints — Phase 1 ships free.

---

## Calling conventions

**From the browser:** always use the `src/lib/api.js` helper, never raw `fetch`.

```js
import { api } from "@/lib/api";

const result = await api.post("/api/courses/create", { topic, depth, time });
if (!result.ok) {
  // show user-safe error message based on result.error.code
  return;
}
// use result.data
```

**From serverless functions:** always parse and validate input before touching the database. Never trust the request body shape.

**Timeouts:** Vercel hobby plan has a 10-second default function timeout. Generation is not allowed to block on Claude for 10 seconds — it must be kicked off async and polled via `/status`. If you find yourself writing an endpoint that might take longer than 5 seconds synchronously, restructure it.

**Idempotency:** `POST /api/courses/create` should be safe to retry — if a client retries and the rate limit was just updated, return the existing in-progress course ID rather than creating a duplicate.
