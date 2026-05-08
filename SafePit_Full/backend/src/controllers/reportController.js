// src/controllers/reportController.js
const { pool } = require('../config/db');

// POST /api/reports — Worker submits hazard report
const create = async (req, res) => {
  const { description, location, severity } = req.body;
  if (!description || !severity)
    return res.status(400).json({ success: false, message: 'Description and severity required.' });

  try {
    const [result] = await pool.execute(
      `INSERT INTO incident_report (user_id, description, location, severity)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, description, location || '', severity]
    );

    const [workerRows] = await pool.execute(
      `SELECT u.name, u.supervisor_id FROM user u WHERE u.user_id = ?`, [req.user.id]
    );
    const worker = workerRows[0];
    if (worker?.supervisor_id) {
      await pool.execute(
        `INSERT INTO notification (user_id, report_id, message) VALUES (?, ?, ?)`,
        [
          worker.supervisor_id,
          result.insertId,
          `⚠️ Hazard reported by ${worker.name}: ${description.slice(0, 60)}...`
        ]
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Incident report submitted.',
      report_id: result.insertId,
    });
  } catch (err) {
    console.error('createReport:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/reports — filtered by role
const getAll = async (req, res) => {
  try {
    let query, params = [];

    if (req.user.role === 'worker') {
      // Worker sees only their own reports
      query = `
        SELECT
          ir.report_id,
          ir.user_id,
          ir.description,
          ir.location,
          ir.severity,
          ir.status,
          ir.created_at,
          u.name  AS reporter_name,
          u.role  AS reporter_role
        FROM incident_report ir
        LEFT JOIN user u ON ir.user_id = u.user_id
        WHERE ir.user_id = ?
        ORDER BY ir.created_at DESC
        LIMIT 50`;
      params = [req.user.id];
    } else {
      // Supervisor / Admin sees all reports
      query = `
        SELECT
          ir.report_id,
          ir.user_id,
          ir.description,
          ir.location,
          ir.severity,
          ir.status,
          ir.created_at,
          u.name  AS reporter_name,
          u.role  AS reporter_role
        FROM incident_report ir
        LEFT JOIN user u ON ir.user_id = u.user_id
        ORDER BY ir.created_at DESC
        LIMIT 50`;
    }

    const [reports] = await pool.execute(query, params);

    // Debug log — remove after confirming fix
    if (reports.length > 0) {
      console.log('getAll reports[0]:', JSON.stringify(reports[0]));
    }

    return res.json({ success: true, reports });
  } catch (err) {
    console.error('getAll:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/reports/:id/status — Supervisor updates status
const updateStatus = async (req, res) => {
  const { status } = req.body;
  const valid = ['OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
  if (!valid.includes(status))
    return res.status(400).json({ success: false, message: 'Invalid status.' });

  try {
    await pool.execute(
      'UPDATE incident_report SET status = ? WHERE report_id = ?',
      [status, req.params.id]
    );
    return res.json({ success: true, message: 'Status updated.' });
  } catch (err) {
    console.error('updateStatus:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { create, getAll, updateStatus };