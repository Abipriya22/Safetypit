// src/config/db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:             process.env.DB_HOST     || 'localhost',
  port:             process.env.DB_PORT     || 3306,
  user:             process.env.DB_USER     || 'root',
  password:         process.env.DB_PASSWORD || '',
  database:         process.env.DB_NAME     || 'safepit_db',
  waitForConnections: true,
  connectionLimit:  10,
  enableKeepAlive:  true,
});

async function testConnection() {
  try {
    const conn = await pool.getConnection();
    console.log(`✅ MySQL connected → ${process.env.DB_HOST}/${process.env.DB_NAME}`);
    conn.release();
  } catch (err) {
    console.error('❌ MySQL connection failed:', err.message);
    process.exit(1);
  }
}

module.exports = { pool, testConnection };
