# AI Usage Summary

## 1. Prompts used with AI

- I need to implement per-user rate limiting for a Node.js Express API endpoint.  Requirement: POST /posts Each authenticated user can create a maximum of 5 posts per minute.  If exceeded, return: HTTP 429 { "error": "Rate limit exceeded" }  The limit should reset after 60 seconds.  What are the clean and simple approaches to implement this? Prefer solutions using middleware and minimal dependencies. Explain pros and cons of in-memory vs Redis.
- "Generate a simple Express middleware for per-user rate limiting (5 requests / 60 seconds), key by authenticated userId, in-memory store, return 429 `{ \"error\": \"Rate limit exceeded\" }`."
- "Review it like a senior backend engineer: logic issues, memory leaks, edge cases, naming, race conditions."
- "Authentication already runs before this middleware; rate limiter should not invent its own auth response."
- "Add unit testing using Jest for POST /posts and cover edge cases (logic, memory growth, race-condition behavior)."

## 2. AI response summary

- AI proposed a simple package-based option using `express-rate-limit` with in-memory storage (`windowMs: 60000`, `max: 5`, `keyGenerator` based on user id, and custom `429` body).
- AI explained this reduces custom code but keeps single-instance in-memory limitations.
- AI suggested production/distributed options with Redis: `express-rate-limit` + `rate-limit-redis` or `rate-limiter-flexible` + Redis.
- AI summarized tradeoffs: in-memory is fine for one low-traffic process; Redis is better for multi-instance/autoscaled production with consistent limits across instances.
- AI also generated a custom in-memory middleware (`Map` + rolling 60-second window), then review feedback identified stale-key memory growth risk and suggested cleanup plus `Retry-After` on `429`.

## 3. What I modified or improved

- Kept auth and rate-limit responsibilities separate: limiter now calls `next()` when user info is missing, so auth middleware handles unauthorized requests.
- Improved naming and moved rate-limit values to module-level constants.
- Added lightweight periodic cleanup of inactive users to reduce memory growth.
- Added `Retry-After` header when returning 429.
- Added Jest tests for API and middleware behavior:
- Verified 5 allowed + 6th blocked with HTTP 429.
- Verified per-user isolation and reset after 60 seconds.
- Verified auth middleware still owns 401 behavior.
- Verified cleanup path prevents unbounded in-memory growth.
- Verified burst behavior is deterministic in a single Node process (5 pass, rest blocked).

## 4. One AI suggestion I rejected

- Rejected returning `401 Unauthorized` directly from the rate limiter when `req.user` is missing.
- Reason: in this app, authentication middleware runs before the limiter and should remain the single source of 401 behavior.
- Rejected Redis-based rate-limiting storage and kept an in-memory store.
- Reason: assignment scope is small/simple, minimal dependencies were preferred, and single-instance behavior is acceptable for this implementation.
