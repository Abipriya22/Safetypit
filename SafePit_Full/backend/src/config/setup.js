// src/config/setup.js  — Run once: node src/config/setup.js
const mysql  = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs     = require('fs');
const path   = require('path');
require('dotenv').config();

async function setup() {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true,
    });
    console.log('🔌 Connected to MySQL server...');

    const schema = fs.readFileSync(
      path.join(__dirname, '../../database/schema.sql'), 'utf8'
    );
    await conn.query(schema);
    console.log('📋 Schema applied...');

    // Hash real passwords
    const adminHash  = await bcrypt.hash('1234567',   10);
    const supHash    = await bcrypt.hash('dharshini', 10);
    const workerHash = await bcrypt.hash('abipriya',  10);

    await conn.query('USE safepit_db');
    await conn.query(`UPDATE user SET password=? WHERE email='xyz.admin@gmail.com'`,  [adminHash]);
    await conn.query(`UPDATE user SET password=? WHERE email='suresh@safepit.com'`,   [supHash]);
    await conn.query(`UPDATE user SET password=? WHERE email='rajesh@safepit.com'`,   [workerHash]);

    console.log('✅ Setup complete!\n');
    console.log('── Default Credentials ──────────────────────');
    console.log('  Worker     → rajesh@safepit.com   / abipriya');
    console.log('  Supervisor → suresh@safepit.com   / dharshini');
    console.log('  Admin      → xyz.admin@gmail.com  / 1234567');
    console.log('─────────────────────────────────────────────');
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
  } finally {
    if (conn) await conn.end();
  }
}

setup();
