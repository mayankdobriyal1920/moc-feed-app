const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
});

async function waitForDb(maxAttempts = 30) {
  for (let i = 1; i <= maxAttempts; i += 1) {
    try {
      const conn = await pool.getConnection();
      await conn.ping();
      conn.release();
      return;
    } catch (error) {
      if (i === maxAttempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}

module.exports = { pool, waitForDb };