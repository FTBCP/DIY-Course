# testing.md

The testing approach for DIY Courses Phase 1. Read this before writing or being asked to write tests. Read it again if you find yourself wanting to add test infrastructure the project doesn't need yet.

---

## Philosophy for Phase 1

**Manual verification is the default.** Per AGENTS.md, we are not writing automated tests in Phase 1 unless explicitly asked. The owner is a non-technical founder shipping a product alone — time spent writing tests is time not spent iterating on content quality, which is the actual product risk.

This doc exists so that **when tests are worth writing, they're written the right way.** It's the reference for that moment, not a mandate to test everything now.

**Two kinds of code that justify a test in Phase 1:**

1. Code that handles money, generation cost, or rate limits. Bugs here cost real dollars. A test is cheap insurance.
2. Code that has caused a bug twice. Once is a one-off. Twice means it's slippery and needs a safety net.

Everything else gets manually verified and shipped. Don't retrofit tests just because something feels untested.

---

## Testing tool

**Vitest.** Ships natively with Vite, zero config needed. Use it for unit and integration tests.

For component testing (if needed later), add React Testing Library on top of Vitest. Don't add it until there's a real component test to write.

**Not using:** Jest (redundant with Vitest), Cypress or Playwright (overkill for Phase 1), Storybook (not a testing tool, different concern).

---

## What must be tested (when tests are written)

In priority order. A task that touches any of these should come with a test.

1. **Rate limit logic.** The "1 course per user per 24 hours" rule. If this breaks, users can drain your Anthropic budget. Test: given a user who generated 23 hours ago, the endpoint rejects. Given 25 hours ago, it allows. Given never, it allows.

2. **Content safety block list.** Intake rejection of prohibited topics. Test: given a topic string containing a block-listed pattern, `POST /api/courses/create` returns `code: "topic_rejected"` and no `courses` row is created.

3. **Claude response validation.** The check that ensures every lesson response has a non-empty body and at least one citation. Test: given a mock Claude response with empty citations, the handler retries once, then fails the lesson gracefully.

4. **RLS enforcement.** A user cannot read another user's course. Test: sign in as user A, create a course. Sign in as user B, attempt to fetch user A's course by ID. Expect empty result or a clean error. This is a high-value test because RLS bugs are silent data leaks.

5. **Progress upsert idempotency.** `POST /api/lessons/:id/progress` called twice with `event: "viewed"` should result in one row, not two. Test: call twice, assert exactly one `progress` row exists.

6. **Video embed validation.** The `oembed` check correctly identifies unavailable videos. Test: given a known-good YouTube URL, returns `embeddable: true`. Given a deleted video URL, returns `embeddable: false`. This can use recorded fixtures — no live YouTube calls in tests.

**What does not need a test in Phase 1:**

- UI rendering and layout. Manual verification in the browser is fine.
- Supabase client calls that are thin wrappers. If the entire function is `supabase.from('courses').select()`, don't test it — you'd be testing Supabase.
- Prompt strings themselves. These are iterated on manually based on output quality; automated tests of prompt text give false confidence.
- Styling, Tailwind classes, responsive behavior.
- Auth flow UX (redirect on unauthenticated, etc.) — manual verification.

---

## How to run tests

**Run all tests:**

```
npm run test
```

**Run tests in watch mode (re-run on save):**

```
npm run test -- --watch
```

**Run a single test file:**

```
npm run test -- path/to/file.test.js
```

**Run only tests matching a pattern:**

```
npm run test -- -t "rate limit"
```

If `npm run test` is not defined in `package.json`, add it:

```json
{
  "scripts": {
    "test": "vitest run"
  }
}
```

---

## File layout

Tests live next to the code they test, not in a separate `/tests` folder.

```
/src/lib/rate-limit.js
/src/lib/rate-limit.test.js
/api/courses/create.js
/api/courses/create.test.js
```

**Why co-located:** moving a file should move its test automatically. When a file is deleted, its test is deleted with it.

Test filenames end in `.test.js`. Vitest picks these up automatically.

---

## Example patterns

### Unit test — pure function

```js
// src/lib/rate-limit.test.js
import { describe, it, expect } from "vitest";
import { isRateLimited } from "./rate-limit.js";

describe("isRateLimited", () => {
  it("allows when never generated", () => {
    const result = isRateLimited({ last_generated_at: null });
    expect(result).toBe(false);
  });

  it("blocks when generated 23 hours ago", () => {
    const recent = new Date(Date.now() - 23 * 60 * 60 * 1000).toISOString();
    const result = isRateLimited({ last_generated_at: recent });
    expect(result).toBe(true);
  });

  it("allows when generated 25 hours ago", () => {
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    const result = isRateLimited({ last_generated_at: old });
    expect(result).toBe(false);
  });
});
```

### Integration test — serverless function with mocked Supabase

```js
// api/courses/create.test.js
import { describe, it, expect, vi } from "vitest";
import { handler } from "./create.js";

describe("POST /api/courses/create", () => {
  it("rejects a prohibited topic", async () => {
    const req = mockRequest({ topic: "how to make a bomb", depth: "overview", time: "afternoon" });
    const res = mockResponse();

    await handler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body.ok).toBe(false);
    expect(res.body.error.code).toBe("topic_rejected");
  });

  it("rejects when user has generated in the last 24 hours", async () => {
    vi.mock("../../src/lib/supabase-admin.js", () => mockSupabaseWithRecentGeneration());
    const req = mockRequest({ topic: "compound interest", depth: "overview", time: "afternoon" });
    const res = mockResponse();

    await handler(req, res);

    expect(res.body.error.code).toBe("rate_limited");
  });
});

// Small helpers, not a full framework
function mockRequest(body) {
  return { method: "POST", body, cookies: { "sb-access-token": "test-token" } };
}

function mockResponse() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (obj) => { res.body = obj; return res; };
  return res;
}
```

### Mocking Claude and YouTube APIs

Never hit the real Claude or YouTube APIs from a test. They cost money, they're slow, and they're flaky. Always mock.

```js
import { vi } from "vitest";
import * as claude from "../../src/lib/claude.js";

vi.spyOn(claude, "generate").mockResolvedValue({
  body: "# Lesson content\n\nThis is a generated lesson.",
  citations: [{ title: "Source 1", url: "https://example.com", quote: "..." }]
});
```

Store mock responses as fixtures in `/test-fixtures/` if they're reused across multiple tests. One sample outline response, one sample lesson response, one sample YouTube search response covers most needs.

---

## Testing anti-patterns

**Don't test implementation details.** If a test breaks every time you refactor a working function, the test was asserting the wrong thing. Test inputs and outputs, not internals.

**Don't chase coverage numbers.** 80% coverage of trivial code is less valuable than 30% coverage of the high-risk code listed above. No coverage tool is configured for Phase 1 on purpose.

**Don't test third-party libraries.** `supabase.from('courses').select()` doesn't need a test. Supabase tests it for us.

**Don't mock things that don't need mocking.** If a function takes a config object and returns a string, pass a real config object. Mocks obscure what's happening.

**Don't write tests that call real external APIs.** No live Claude calls, no live YouTube calls, no live Supabase calls. Use a local Supabase instance or mocks.

**Don't write a test that only passes once.** Tests that rely on `Date.now()` without time mocking, random values, or network state are flaky and will erode trust. Inject time/random/network as dependencies.

**Don't skip a failing test by commenting it out.** Either fix it or delete it. A commented-out test is noise and will never be restored.

---

## When to propose adding more tests

If a single bug gets fixed twice in the same area, propose a test for that area in the next session. Note it in `memory.md` under Gotchas first, then write the test when the pattern becomes clear.

If a feature involves money, permissions, or content safety, write the test as part of the feature — not after shipping.

Otherwise, keep shipping. Tests are a tool, not a virtue.
