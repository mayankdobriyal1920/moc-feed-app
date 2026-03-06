# AI Usage Summary

## 1. Prompts used with AI

- Asked for clean, simple approaches to implement per-user rate limiting for `POST /posts` in Node.js/Express (`5` requests per `60` seconds, `429` on exceed).
- Asked for a middleware-focused implementation with minimal dependencies.
- Asked for comparison of in-memory vs Redis/package-based options.
- Asked for a review of the middleware (logic, edge cases, naming, race-condition considerations).

## 2. AI response summary

- AI suggested a custom middleware approach using an in-memory structure keyed by authenticated user ID.
- AI also suggested package-based options (`express-rate-limit`) and Redis-backed options for distributed/production environments.
- AI explained tradeoffs: in-memory is simplest but single-instance; Redis is better for multi-instance consistency and scale.
- Based on assignment scope and simplicity goals, in-memory rate limiting was selected.

## 3. What I modified or improved

- Implemented per-user rate limiting for `POST /posts` with a limit of `5` requests per `60` seconds.
- Used authenticated user identity as the rate-limit key.
- Ensured the limiter returns `HTTP 429` with `{ "error": "Rate limit exceeded" }` when the limit is exceeded.
- Kept auth and rate limiting responsibilities separate: since auth runs before limiter, the limiter does not return its own `401`.

## 4. One AI suggestion I rejected

- Rejected returning `401 Unauthorized` from the rate limiter when user info is missing.
- Reason: authentication is handled by existing auth middleware, which should remain the single source of `401` responses.
