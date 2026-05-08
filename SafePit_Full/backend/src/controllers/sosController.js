// src/controllers/sosController.js
const { pool } = require('../config/db');

// POST /api/sos  — Worker triggers SOS → notifies supervisor via socket
const triggerSOS = async (req, res) => {
  const workerId = req.user.id;
  const { location } = req.body;

  try {
    // Prevent duplicate active SOS
    const [existing] = await pool.execute(
      `SELECT sos_id FROM sos_alert WHERE user_id = ? AND status = 'ACTIVE'`, [workerId]
    );
    if (existing.length)
      return res.status(400).json({ success: false, message: 'Active SOS already running.' });

    // Create SOS record
    const [result] = await pool.execute(
      `INSERT INTO sos_alert (user_id, location, status) VALUES (?, ?, 'ACTIVE')`,
      [workerId, location || 'Unknown']
    );

    // Get worker info for notification
    const [workerRows] = await pool.execute(
      `SELECT u.name, u.supervisor_id, s.name AS sup_name
       FROM user u LEFT JOIN user s ON u.supervisor_id = s.user_id
       WHERE u.user_id = ?`, [workerId]
    );
    const worker = workerRows[0];

    // Create notification for supervisor
    if (worker?.supervisor_id) {
      await pool.execute(
        `INSERT INTO notification (user_id, message) VALUES (?, ?)`,
        [worker.supervisor_id, `🚨 SOS ALERT from ${worker.name} at ${location || 'Unknown location'}`]
      );
    }

    // Emit real-time socket event to supervisor
    const io = req.app.get('io');
    if (io) {
      io.to('supervisor').emit('sos_alert', {
        sos_id:      result.insertId,
        worker_id:   workerId,
        worker_name: worker?.name,
        location:    location || 'Unknown',
        time:        new Date(),
      });
    }

    return res.status(201).json({
      success: true,
      message: 'SOS sent! Your supervisor has been alerted.',
      sos_id: result.insertId,
    });
  } catch (err) {
    console.error('triggerSOS:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/sos  — Supervisor/Admin gets all alerts
const getAlerts = async (req, res) => {
  const { status } = req.query;
  try {
    const params = [];
    let where = '';
    if (status) { where = 'WHERE sa.status = ?'; params.push(status); }

    const [alerts] = await pool.execute(
      `SELECT sa.*, u.name AS worker_name,
              a.name AS acknowledged_by_name
       FROM sos_alert sa
       JOIN user u ON sa.user_id = u.user_id
       LEFT JOIN user a ON sa.acknowledged_by = a.user_id
       ${where}
       ORDER BY sa.alert_time DESC`,
      params
    );
    return res.json({ success: true, alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/sos/:id/acknowledge
const acknowledge = async (req, res) => {
  try {
    await pool.execute(
      `UPDATE sos_alert SET status='ACKNOWLEDGED', acknowledged_by=? WHERE sos_id=? AND status='ACTIVE'`,
      [req.user.id, req.params.id]
    );
    const io = req.app.get('io');
    if (io) io.emit('sos_acknowledged', { sos_id: req.params.id });
    return res.json({ success: true, message: 'SOS acknowledged.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PATCH /api/sos/:id/resolve
const resolve = async (req, res) => {
  try {
    await pool.execute(
      `UPDATE sos_alert SET status='RESOLVED', resolved_at=NOW() WHERE sos_id=?`,
      [req.params.id]
    );
    return res.json({ success: true, message: 'SOS resolved.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { triggerSOS, getAlerts, acknowledge, resolve };