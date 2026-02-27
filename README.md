# MOC Feed App (Backend Coding Test)

Simple backend using Node.js, Express, and MySQL with Docker.

## Tech Stack

- Node.js + Express
- MySQL 8
- Docker + Docker Compose
- Postman for API testing

## Run Project

1. Make sure Docker Desktop is running.
2. In project root, run:

```bash
docker compose up --build
```

3. API will run at:

- `http://localhost:3000`

4. Health check:

- `GET http://localhost:3000/health`

## API Endpoints

### 1) Mock Auth

`POST /auth/mock`

Body:

```json
{ "userId": "u1" }
```

Response:

```json
{ "token": "mock-u1" }
```

Use token as header:
`Authorization: Bearer mock-u1`

### 2) Create Post (Auth)

`POST /posts`

Body:

```json
{ "text": "Hello world" }
```

### 3) Feed (Cursor Pagination)

`GET /feed?cursor=...&limit=...`

### 4) Add Reply (Auth)

`POST /posts/:id/replies`

Body:

```json
{ "text": "Nice post" }
```

### 5) Upvote Toggle (Auth)

`POST /posts/:id/upvote`

## Cursor Pagination Logic

- Sorted by `created_at DESC, id DESC`
- Cursor is base64url JSON: `{ createdAt, id }`
- If cursor exists, next page fetches rows where:
  - `created_at < cursor.createdAt`
  - OR `created_at = cursor.createdAt AND id < cursor.id`
- This avoids duplicates across pages
- `limit` defaults to `10`, max `50`
- Query fetches `limit + 1` rows to know if `nextCursor` exists

## Upvote Uniqueness Logic

- Table `post_upvotes` has primary key `(post_id, user_id)`
- This guarantees one upvote per user per post at DB level
- Upvote toggle runs inside a transaction and uses row locks:
  - lock post (`FOR UPDATE`)
  - check user upvote (`FOR UPDATE`)
  - insert or delete
- Prevents duplicate upvotes even under concurrent requests

## Input Validation + Status Codes

- `400` for invalid body/query/cursor
- `401` for missing/invalid auth token
- `404` for missing post or route

## Database Choice for Production

For production, I would keep MySQL or move to PostgreSQL based on team preference.

Why relational DB here:

- strong consistency for upvote uniqueness
- efficient indexed pagination
- transactional safety for toggles

For scaling:

- read replicas for feed reads
- Redis cache for hot feed pages
- background jobs for denormalized counters (if needed)

## Files

- `database/init.sql`: schema creation
- `database/seed_1000.sql`: inserts 1000 mock posts (+ replies and upvotes)
- `docker-compose.yml`: app + mysql services
- `src/`: express code
- `postman_collection.json`: ready API collection
