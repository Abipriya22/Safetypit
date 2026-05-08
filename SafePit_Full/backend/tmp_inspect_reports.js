const mysql = require('mysql2/promise');
require('dotenv').config();
(async () => {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'safepit_db',
    connectionLimit: 1,
  });

  try {
    const [rows] = await pool.execute(
      'SELECT report_id, description, location, severity, status, created_at FROM incident_report ORDER BY created_at DESC LIMIT 5'
    );
    console.log(JSON.stringify(rows, null, 2));
  } catch (err) {
    console.error('ERR', err.message);
  } finally {
    await pool.end();
  }
})();
