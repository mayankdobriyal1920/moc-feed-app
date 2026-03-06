# AI Usage Summary

## 1. Prompts used with AI

- I need to implement per-user rate limiting for a Node.js Express API endpoint.  Requirement: POST /posts Each authenticated user can create a maximum of 5 posts per minute.  If exceeded, return: HTTP 429 { "error": "Rate limit exceeded" }  The limit should reset after 60 seconds.  What are the clean and simple approaches to implement this? Prefer solutions using middleware and minimal dependencies. Explain pros and cons of in-memory vs Redis.
- "Generate a simple Express middleware for per-user rate limiting (5 requests / 60 seconds), key by authenticated userId, in-memory store, return 429 `{ \"error\": \"Rate limit exceeded\" }`."
- "Review it like a senior backend engineer: logic issues, memory leaks, edge cases, naming, race conditions."
- "Authentication already runs before this middleware; rate limiter should not invent its own auth response."

## 2. AI response summary

- AI generated an Express middleware using an in-memory `Map` keyed by user ID with a rolling 60-second window.
- In review, AI identified stale key memory growth risk and suggested periodic cleanup.
- AI also suggested adding `Retry-After` on HTTP 429.

## 3. What I modified or improved

- Kept auth and rate-limit responsibilities separate: limiter now calls `next()` when user info is missing, so auth middleware handles unauthorized requests.
- Improved naming and moved rate-limit values to module-level constants.
- Added lightweight periodic cleanup of inactive users to reduce memory growth.
- Added `Retry-After` header when returning 429.

## 4. One AI suggestion I rejected

- Rejected returning `401 Unauthorized` directly from the rate limiter when `req.user` is missing.
  - Reason: in this app, authentication middleware runs before the limiter and should remain the single source of 401 behavior.
- Rejected Redis-based rate-limiting storage and kept an in-memory store.
  - Reason: assignment scope is small/simple, minimal dependencies were preferred, and single-instance behavior is acceptable for this implementation.
