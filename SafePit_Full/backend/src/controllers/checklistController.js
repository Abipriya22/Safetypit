// src/controllers/checklistController.js
const { pool } = require('../config/db');
const { translate } = require('google-translate-api-x');

const LANG_CODES = {
  English: 'en',
  Hindi:   'hi',
  Tamil:   'ta',
  Telugu:  'te',
  Odia:    'or',
};

// Translate text to all 5 languages using the provided source language
const translateAll = async (text, sourceLang = 'English') => {
  const langs   = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];
  const results = { [sourceLang]: text };
  const targets = langs.filter(lang => lang !== sourceLang);

  for (const lang of targets) {
    try {
      const res    = await translate(text, { to: LANG_CODES[lang], client: 'gtx' });
      results[lang] = res.text;
    } catch (err) {
      console.error(`Translate error (${lang}):`, err.message);
      results[lang] = text;
    }
  }
  return results;
};

// GET /api/checklist — Worker gets role-based tasks in their language
const getMyChecklist = async (req, res) => {
  const { id, role } = req.user;
  const today = new Date().toISOString().split('T')[0];

  try {
    const [userRows] = await pool.execute(
      'SELECT job_role, preferred_lang FROM user WHERE user_id = ?', [id]
    );
    const jobRole  = userRows[0]?.job_role     || 'General';
    // Priority: query param lang > user preferred_lang > English
    const userLang = req.query.lang || userRows[0]?.preferred_lang || 'English';

    // Try fetching tasks in requested language
    let [tasks] = await pool.execute(
      `SELECT c.*,
              CASE WHEN c.completed_by = ? AND DATE(c.completion_date) = ? THEN TRUE ELSE FALSE END AS is_done
       FROM checklist c
       WHERE (c.role_target = 'all' OR c.role_target = ? OR c.role_target = ?)
         AND c.lang = ?
         AND (c.shift_target = 'All' OR c.shift_target IS NULL)
       ORDER BY c.task_group_id, c.checklist_id`,
      [id, today, role, jobRole, userLang]
    );

    // FIX: If no tasks found in requested language, fallback to English
    if (tasks.length === 0 && userLang !== 'English') {
      [tasks] = await pool.execute(
        `SELECT c.*,
                CASE WHEN c.completed_by = ? AND DATE(c.completion_date) = ? THEN TRUE ELSE FALSE END AS is_done
         FROM checklist c
         WHERE (c.role_target = 'all' OR c.role_target = ? OR c.role_target = ?)
           AND c.lang = 'English'
           AND (c.shift_target = 'All' OR c.shift_target IS NULL)
         ORDER BY c.task_group_id, c.checklist_id`,
        [id, today, role, jobRole]
      );
    }

    // FIX: Clean tasks - remove any null/undefined priority values to prevent "0" display
    const cleanedTasks = tasks.map(t => ({
      ...t,
      is_done:  Boolean(t.is_done),
      priority: t.priority && t.priority !== '0' ? t.priority : null,
      severity: t.severity && t.severity !== '0' ? t.severity : null,
    }));

    const total     = cleanedTasks.length;
    const completed = cleanedTasks.filter(t => t.is_done).length;

    return res.json({
      success: true,
      date:    today,
      lang:    userLang,
      progress: {
        completed,
        total,
        percentage: total ? Math.round((completed / total) * 100) : 0,
      },
      tasks: cleanedTasks,
    });
  } catch (err) {
    console.error('getMyChecklist:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/checklist/:id/complete
const toggleTask = async (req, res) => {
  const workerId = req.user.id;
  const taskId   = parseInt(req.params.id);
  const today    = new Date().toISOString().split('T')[0];

  try {
    const [rows] = await pool.execute(
      'SELECT * FROM checklist WHERE checklist_id = ?', [taskId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Task not found.' });

    const task = rows[0];

    // Check if already done today
    const completionDate = task.completion_date
      ? String(task.completion_date).split('T')[0]
      : null;
    const alreadyDone = task.completed_by === workerId && completionDate === today;

    if (alreadyDone) {
      // Unmark all language versions
      if (task.task_group_id) {
        await pool.execute(
          `UPDATE checklist SET task_status='PENDING', completed_by=NULL, completion_date=NULL
           WHERE task_group_id = ?`,
          [task.task_group_id]
        );
      } else {
        await pool.execute(
          `UPDATE checklist SET task_status='PENDING', completed_by=NULL, completion_date=NULL
           WHERE checklist_id = ?`,
          [taskId]
        );
      }
      return res.json({ success: true, is_done: false });
    } else {
      // Mark done all language versions
      if (task.task_group_id) {
        await pool.execute(
          `UPDATE checklist SET task_status='COMPLETED', completed_by=?, completion_date=?
           WHERE task_group_id = ?`,
          [workerId, today, task.task_group_id]
        );
      } else {
        await pool.execute(
          `UPDATE checklist SET task_status='COMPLETED', completed_by=?, completion_date=?
           WHERE checklist_id = ?`,
          [workerId, today, taskId]
        );
      }
      return res.json({ success: true, is_done: true });
    }
  } catch (err) {
    console.error('toggleTask:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// POST /api/checklist — Admin creates task (auto-translates to all 5 languages)
const createTask = async (req, res) => {
  const { task_description, role_target, shift_target, lang: sourceLang = 'English' } = req.body;
  const ALL_LANGS = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];

  if (!task_description?.trim())
    return res.status(400).json({ success: false, message: 'Task description required.' });
  if (!ALL_LANGS.includes(sourceLang))
    return res.status(400).json({ success: false, message: 'Invalid language.' });

  try {
    const translated    = await translateAll(task_description.trim(), sourceLang);
    const task_group_id = Date.now();
    const langs         = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];

    for (const lang of langs) {
      await pool.execute(
        `INSERT INTO checklist
           (task_description, task_status, role_target, shift_target, created_by, lang, task_group_id)
         VALUES (?, 'PENDING', ?, ?, ?, ?, ?)`,
        [
          translated[lang],
          role_target  || 'all',
          shift_target || 'All',
          req.user.id,
          lang,
          task_group_id,
        ]
      );
    }

    return res.status(201).json({ success: true, message: 'Task created in all languages.' });
  } catch (err) {
    console.error('createTask:', err);
    return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
  }
};

// DELETE /api/checklist/:id — Admin deletes all language versions
const deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;

    const [rows] = await pool.execute(
      'SELECT task_group_id FROM checklist WHERE checklist_id = ?', [taskId]
    );
    if (!rows.length)
      return res.status(404).json({ success: false, message: 'Task not found.' });

    const groupId = rows[0].task_group_id;

    if (groupId) {
      // Delete all 5 language versions together
      await pool.execute(
        'DELETE FROM checklist WHERE task_group_id = ?', [groupId]
      );
    } else {
      // Old data without group id - delete just this one
      await pool.execute(
        'DELETE FROM checklist WHERE checklist_id = ?', [taskId]
      );
    }

    return res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('deleteTask:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/checklist/all — Admin/Supervisor: show English only
const getAllTasks = async (req, res) => {
  try {
    const [tasks] = await pool.execute(
      `SELECT c.*, u.name AS created_by_name
       FROM checklist c
       JOIN user u ON c.created_by = u.user_id
       WHERE c.lang = 'English'
       ORDER BY c.task_group_id DESC, c.created_at DESC`
    );
    return res.json({ success: true, tasks });
  } catch (err) {
    console.error('getAllTasks:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/checklist/workers-progress — Supervisor dashboard
const getWorkersProgress = async (req, res) => {
  const today   = new Date().toISOString().split('T')[0];
  const useLang = req.query.lang || 'English';

  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.name, u.preferred_lang, u.job_role,
              COUNT(DISTINCT c.task_group_id) AS total,
              SUM(CASE WHEN c.completed_by = u.user_id
                        AND DATE(c.completion_date) = ?
                   THEN 1 ELSE 0 END)           AS completed
       FROM user u
       LEFT JOIN checklist c
         ON (c.role_target = 'all' OR c.role_target = u.job_role)
         AND c.lang = ?
       WHERE u.role = 'worker' AND u.is_active = TRUE
       GROUP BY u.user_id`,
      [today, useLang]
    );

    const result = rows.map(r => ({
      ...r,
      percentage: r.total ? Math.round((r.completed / r.total) * 100) : 0,
    }));

    return res.json({ success: true, workers: result });
  } catch (err) {
    console.error('getWorkersProgress:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getMyChecklist,
  toggleTask,
  createTask,
  deleteTask,
  getAllTasks,
  getWorkersProgress,
};