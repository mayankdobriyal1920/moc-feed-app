-- Reset existing data so you always get a clean 1000-row dataset
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE post_upvotes;
TRUNCATE TABLE replies;
TRUNCATE TABLE posts;
SET FOREIGN_KEY_CHECKS = 1;

-- 1000 posts
INSERT INTO posts (id, text, author_id, created_at)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 1000
)
SELECT
  CONCAT('p_', LPAD(n, 4, '0')) AS id,
  CONCAT('Mock post #', n, ' generated for feed testing') AS text,
  CONCAT('u', ((n - 1) % 25) + 1) AS author_id,
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL n MINUTE) AS created_at
FROM seq;

-- Replies: around 400 rows (every 5th post gets 2 replies)
INSERT INTO replies (id, post_id, author_id, text, created_at)
WITH RECURSIVE seq AS (
  SELECT 1 AS n
  UNION ALL
  SELECT n + 1 FROM seq WHERE n < 1000
),
reply_idx AS (
  SELECT 1 AS r
  UNION ALL
  SELECT 2
)
SELECT
  CONCAT('r_', LPAD(((n - 1) * 2 + r), 6, '0')) AS id,
  CONCAT('p_', LPAD(n, 4, '0')) AS post_id,
  CONCAT('u', ((n + r) % 25) + 1) AS author_id,
  CONCAT('Reply ', r, ' on post #', n) AS text,
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL (n - r) MINUTE) AS created_at
FROM seq
JOIN reply_idx ON 1 = 1
WHERE MOD(n, 5) = 0;

-- Upvotes: deterministic pattern, one upvote per user per post (PK enforces uniqueness)
INSERT INTO post_upvotes (post_id, user_id, created_at)
WITH RECURSIVE post_seq AS (
  SELECT 1 AS p
  UNION ALL
  SELECT p + 1 FROM post_seq WHERE p < 1000
),
user_seq AS (
  SELECT 1 AS u
  UNION ALL
  SELECT u + 1 FROM user_seq WHERE u < 30
)
SELECT
  CONCAT('p_', LPAD(p, 4, '0')) AS post_id,
  CONCAT('u', u) AS user_id,
  DATE_SUB(UTC_TIMESTAMP(3), INTERVAL (p + u) SECOND) AS created_at
FROM post_seq
JOIN user_seq ON 1 = 1
WHERE MOD(p + u, 7) = 0;