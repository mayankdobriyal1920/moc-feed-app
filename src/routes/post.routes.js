const crypto = require('crypto');
const express = require('express');
const { pool } = require('../config/db');
const { authRequired } = require('../middleware/auth');
const { rateLimitPerUser } = require('../middleware/rateLimitPerUser');
const { validate, textSchema, feedQuerySchema } = require('../validation');
const { encodeCursor, decodeCursor } = require('../utils');

const router = express.Router();

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 23).replace('T', ' ');
}

router.post('/posts', authRequired, rateLimitPerUser, async (req, res, next) => {
  try {
    const body = validate(textSchema, req.body);
    const id = `p_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const createdAt = new Date();

    await pool.execute(
      'INSERT INTO posts (id, text, author_id, created_at) VALUES (?, ?, ?, ?)',
      [id, body.text, req.user.userId, createdAt]
    );

    return res.status(201).json({
      id,
      text: body.text,
      authorId: req.user.userId,
      createdAt: createdAt.toISOString(),
      upvoteCount: 0,
      replyCount: 0,
    });
  } catch (error) {
    return next(error);
  }
});

router.get('/feed', async (req, res, next) => {
  try {
    const query = validate(feedQuerySchema, req.query);

    let where = '';
    const params = [];

    if (query.cursor) {
      const decoded = decodeCursor(query.cursor);
      if (!decoded) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }

      const cursorDate = new Date(decoded.createdAt);
      if (Number.isNaN(cursorDate.getTime())) {
        return res.status(400).json({ message: 'Invalid cursor' });
      }

      where = 'WHERE (p.created_at < ? OR (p.created_at = ? AND p.id < ?))';
      const cursorDateSql = toMysqlDatetime(cursorDate);
      params.push(cursorDateSql, cursorDateSql, decoded.id);
    }

    const fetchLimit = query.limit + 1;
    const sql = `
      SELECT
        p.id,
        p.text,
        p.author_id,
        p.created_at,
        COALESCE(u.upvote_count, 0) AS upvote_count,
        COALESCE(r.reply_count, 0) AS reply_count
      FROM posts p
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS upvote_count
        FROM post_upvotes
        GROUP BY post_id
      ) u ON u.post_id = p.id
      LEFT JOIN (
        SELECT post_id, COUNT(*) AS reply_count
        FROM replies
        GROUP BY post_id
      ) r ON r.post_id = p.id
      ${where}
      ORDER BY p.created_at DESC, p.id DESC
      LIMIT ${fetchLimit}
    `;
    const [rows] = await pool.execute(sql, params);

    const hasNext = rows.length > query.limit;
    const visibleRows = hasNext ? rows.slice(0, query.limit) : rows;

    const items = visibleRows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: new Date(row.created_at).toISOString(),
      upvoteCount: Number(row.upvote_count || 0),
      replyCount: Number(row.reply_count || 0),
    }));

    let nextCursor = null;
    if (hasNext) {
      const last = visibleRows[visibleRows.length - 1];
      nextCursor = encodeCursor(new Date(last.created_at).toISOString(), last.id);
    }

    return res.json({ items, nextCursor });
  } catch (error) {
    return next(error);
  }
});

router.post('/posts/:id/replies', authRequired, async (req, res, next) => {
  try {
    const body = validate(textSchema, req.body);
    const postId = req.params.id;

    const [postRows] = await pool.execute('SELECT id FROM posts WHERE id = ? LIMIT 1', [postId]);
    if (postRows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const id = `r_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const createdAt = new Date();

    await pool.execute(
      'INSERT INTO replies (id, post_id, author_id, text, created_at) VALUES (?, ?, ?, ?, ?)',
      [id, postId, req.user.userId, body.text, createdAt]
    );

    return res.status(201).json({
      id,
      postId,
      authorId: req.user.userId,
      text: body.text,
      createdAt: createdAt.toISOString(),
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/posts/:id/upvote', authRequired, async (req, res, next) => {
  const postId = req.params.id;
  const userId = req.user.userId;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [postRows] = await conn.execute('SELECT id FROM posts WHERE id = ? FOR UPDATE', [postId]);
    if (postRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ message: 'Post not found' });
    }

    const [existing] = await conn.execute(
      'SELECT post_id FROM post_upvotes WHERE post_id = ? AND user_id = ? FOR UPDATE',
      [postId, userId]
    );

    let hasUpvoted;
    if (existing.length > 0) {
      await conn.execute('DELETE FROM post_upvotes WHERE post_id = ? AND user_id = ?', [postId, userId]);
      hasUpvoted = false;
    } else {
      await conn.execute(
        'INSERT INTO post_upvotes (post_id, user_id, created_at) VALUES (?, ?, ?)',
        [postId, userId, new Date()]
      );
      hasUpvoted = true;
    }

    const [countRows] = await conn.execute('SELECT COUNT(*) AS count FROM post_upvotes WHERE post_id = ?', [postId]);
    const upvoteCount = Number(countRows[0].count || 0);

    await conn.commit();
    return res.json({ postId, upvoteCount, hasUpvoted });
  } catch (error) {
    await conn.rollback();
    return next(error);
  } finally {
    conn.release();
  }
});

module.exports = router;
