CREATE TABLE IF NOT EXISTS posts (
  id VARCHAR(64) PRIMARY KEY,
  text VARCHAR(1000) NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  INDEX idx_posts_created_id (created_at DESC, id DESC)
);

CREATE TABLE IF NOT EXISTS replies (
  id VARCHAR(64) PRIMARY KEY,
  post_id VARCHAR(64) NOT NULL,
  author_id VARCHAR(64) NOT NULL,
  text VARCHAR(1000) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  CONSTRAINT fk_replies_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_replies_post (post_id)
);

CREATE TABLE IF NOT EXISTS post_upvotes (
  post_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL,
  PRIMARY KEY (post_id, user_id),
  CONSTRAINT fk_upvotes_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  INDEX idx_upvotes_post (post_id)
);