# security.md

Security rules for every development session. The AI agent follows these automatically; the human reviews them before every commit. If a rule here conflicts with a task, stop and ask — never silently skip a rule to finish faster.

---

## Never Print or Log

Never write any of the following to the console, terminal, logs, error messages, stack traces, analytics events, or developer tools output:

- Passwords, in any form — plaintext, hashed, partially masked, or base64-encoded.
- API keys, API secrets, or API tokens (Anthropic, Supabase, YouTube, Vercel, GitHub, or any third party).
- Supabase service role keys or JWT tokens. The anon key is public and may be logged only when debugging auth flow; the service role key is never logged under any circumstance.
- Session tokens, refresh tokens, CSRF tokens, or any bearer token.
- A user's email address, full name, IP address, or any other personally identifying info beyond a database user ID.
- The full body of a user's intake answers or generated course content when logging errors — log the course ID only.
- Raw database responses that include auth fields, tokens, or secrets. Strip those fields before any `console.log`.
- Raw HTTP response bodies from the Anthropic, Supabase, or YouTube APIs without first removing the `Authorization` header and any API key from the request URL.
- Stack traces in production builds. Stack traces are allowed in dev mode only.

If debugging requires logging one of these values, log a redacted version (e.g. `sk-ant-***` or `user_****_1234`) and remove the log line before committing.

---

## How to Handle Secrets

All secrets live in `.env.local`. No exceptions.

- Every secret is loaded from `.env.local` via `import.meta.env.VITE_*` (Vite) or `process.env.*` (server).
- `.env.local` is in `.gitignore` and must never be committed. Verify before every commit.
- `.env.example` is committed — but contains only the **variable names**, never real values. Example: `VITE_SUPABASE_URL=`, not `VITE_SUPABASE_URL=https://abc123.supabase.co`.
- The Anthropic API key and YouTube API key must **never** appear in `VITE_*` variables. `VITE_*` vars are exposed to the browser bundle and readable by anyone who inspects the site. Those two keys are server-only and must be called from a Vercel serverless function or Supabase edge function, not from client code.
- Only the Supabase **anon key** and Supabase project URL are safe to expose to the browser via `VITE_*`. These are public by design. The Supabase **service role key** is server-only and never shipped to the browser under any circumstance.
- Never paste a secret into a chat message, a GitHub issue, a commit message, or a Vercel project name.
- When rotating a key, update `.env.local`, redeploy, then revoke the old key. Do not leave old keys active "just in case."
- When a secret is accidentally exposed (committed, logged, or shared), rotate it immediately — do not try to edit the git history as the primary fix.

---

## Never Put In Code

The following never appears in any file under `/src`, `/pages`, `/api`, `/supabase/migrations`, or any other tracked path:

- Hardcoded API keys, passwords, database connection strings, or auth tokens — even temporarily, even for testing, even with a `// TODO remove` comment.
- Test credentials belonging to a real Supabase project, Anthropic account, or YouTube developer account. Use a dedicated dev project with throwaway keys if testing against real services.
- Commented-out code that contains a credential, key, or token. Delete the line entirely; do not comment it out.
- Debug endpoints that expose internal state — e.g. routes that return the full database, dump all users, or show environment variables. If a debug route exists during development, it is protected by an auth check **and** is removed before merging to main.
- Console logs that print full request/response objects from authenticated API calls.
- Admin backdoors, master passwords, bypass flags (`if (user === 'geoff') skipAuth()`), or developer-only overrides that short-circuit security checks.
- Query strings or URL parameters containing secrets, tokens, or personally identifying info.
- Placeholder secrets like `sk-ant-abc123` or `password123` in example code — even in comments, they train the eye to ignore real secrets.

---

## App Security Checklist

Every feature must satisfy these before it's considered done:

- **Authentication on protected pages.** Every route that reads or writes user data checks the Supabase session first. Unauthenticated requests redirect to `/signin`. The check runs server-side (via Supabase RLS or middleware), not only in the React component.
- **Row-level security (RLS) enabled on every Supabase table.** `users` can only read/write their own rows in `courses`, `lessons`, and `progress`. No table is ever left with RLS disabled. Verify policies are active before pushing a migration.
- **All user input is validated and sanitized before saving.** Intake answers, email addresses, course titles — every field has a length limit, a type check, and a rejection path for malformed input. Reject on the server; client validation is UX only, not security.
- **Rendered user content is escaped.** When rendering markdown lesson bodies, use a library that escapes HTML by default (`react-markdown` with `remarkGfm`, no `rehypeRaw`). Never use `dangerouslySetInnerHTML` on any user-supplied or LLM-generated string.
- **Database queries never built by string concatenation.** Use Supabase's query builder or parameterized queries. No template literals with user input in SQL. No dynamic table names from user input.
- **Error messages shown to users are generic.** "Something went wrong generating your course. Try again or contact support." No stack traces, no database error text, no API error bodies surfaced to the UI. Specific errors are logged server-side with the user ID for debugging.
- **Rate limits enforced server-side.** The "1 course per user per 24 hours" rule is checked in the generation endpoint, not just hidden in the UI. Client-side limits are trivially bypassed.
- **API calls to Anthropic and YouTube run server-side only.** Never from the browser. The browser calls a Vercel function, which calls the third-party API with the secret key.
- **No secrets in URLs.** Course IDs in URLs are fine. Auth tokens, API keys, or session IDs in URLs are not.
- **CORS configured narrowly.** Vercel functions only accept requests from the production domain and localhost. No `Access-Control-Allow-Origin: *`.
- **Content safety on topic intake.** Reject intake topics that match a basic block list (weapons manufacturing, self-harm methods, CSAM, etc.) before spending API credits on generation.

---

## Before Every Commit

Run through this list before `git commit`. Takes 60 seconds.

- **Verify `.gitignore` is working.** Run `git status` and confirm `.env.local` is not listed as a tracked or staged file. If it is, stop — do not commit. Fix `.gitignore` and remove from staging.
- **Scan staged changes for secrets.** Run `git diff --cached` and scan for patterns: `sk-`, `Bearer `, `api_key`, `secret`, `password`, `token`, long random-looking strings (20+ characters of letters/numbers). If found, stop and move the value to `.env.local`.
- **Remove debug logs that print sensitive data.** Search staged files for `console.log`, `console.error`, and `console.debug`. Any log that prints user data, API responses, auth state, or full objects must be removed or redacted.
- **Check for commented-out credentials.** Search staged files for `//` and `/*` lines containing `key`, `secret`, `password`, or `token`. Delete them entirely.
- **Confirm no `.env.local`, `.env`, `.env.production`, or any other `.env*` variant is staged.** Only `.env.example` is ever committed.
- **Confirm no files from the Supabase dashboard export, API key downloads, or service account JSON files are staged.** These often land in the project folder by default and have innocuous names like `credentials.json` or `service-account.json`.
- **If a secret was committed by accident,** rotate the key immediately (Anthropic, Supabase, YouTube — whichever leaked). Do not rely on git history rewrites as the primary fix. A committed secret is a leaked secret the moment the commit exists, even locally.
- **Commit message contains no secrets, user data, or internal URLs.** Keep messages short and factual.

If any item fails, fix before committing. Not "fix in the next commit" — fix now.
