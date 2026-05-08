// backend/src/controllers/contentController.js
const { pool } = require('../config/db');

// ── Safe translate helper (never throws) ────────────────────────
// Falls back to original text if translation fails
const safeTranslate = async (text, targetLang) => {
  if (targetLang === 'English') return text;
  try {
    const { translate } = require('@vitalets/google-translate-api');
    const LANG_CODES = { Hindi: 'hi', Tamil: 'ta', Telugu: 'te', Odia: 'or' };
    const res = await translate(text, { to: LANG_CODES[targetLang] });
    return res.text || text;
  } catch (err) {
    // Translation failed (rate limit / network) → use English text
    console.warn(`Translate fallback (${targetLang}):`, err.message);
    return text;
  }
};

// ── GET /api/content?type=safety_tip&lang=Tamil ──────────────────
const getContent = async (req, res) => {
  const { type, lang } = req.query;
  try {
    const params = [];
    let where = 'WHERE is_active = TRUE';

    if (type) { where += ' AND type = ?'; params.push(type); }

    // Try requested language first
    if (lang && lang !== 'English') {
      const [preferred] = await pool.execute(
        `SELECT * FROM reports ${where} AND lang = ? ORDER BY created_at DESC`,
        [...params, lang]
      );
      if (preferred.length > 0) {
        return res.json({ success: true, content: preferred });
      }
    }

    // Fallback to English
    const [content] = await pool.execute(
      `SELECT * FROM reports ${where} AND lang = 'English' ORDER BY created_at DESC`,
      params
    );
    return res.json({ success: true, content });
  } catch (err) {
    console.error('getContent:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── POST /api/content — Admin uploads content ────────────────────
// Saves English immediately, then translates to other 4 languages
// If translation fails for any lang → saves English text as fallback
const createContent = async (req, res) => {
  const { type, title, content } = req.body;
  const VALID_TYPES = ['safety_tip', 'positive_statement', 'dgms_guideline'];
  const ALL_LANGS   = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];

  if (!type || !content?.trim()) {
    return res.status(400).json({ success: false, message: 'Content cannot be empty.' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ success: false, message: 'Invalid content type.' });
  }

  const adminId      = req.user.id;
  const englishText  = content.trim();
  const englishTitle = title?.trim() || '';

  try {
    // Insert English immediately (no translation needed)
    await pool.execute(
      `INSERT INTO reports (user_id, type, title, content, lang) VALUES (?, ?, ?, ?, 'English')`,
      [adminId, type, englishTitle, englishText]
    );

    // Translate & insert other 4 languages in background (don't block response)
    const otherLangs = ['Hindi', 'Tamil', 'Telugu', 'Odia'];

    // Respond success right away — English is saved
    res.status(201).json({
      success: true,
      message: 'Content saved. Translating to other languages...',
    });

    // Background translations (errors won't affect the response)
    for (const lang of otherLangs) {
      try {
        const translatedContent = await safeTranslate(englishText, lang);
        const translatedTitle   = englishTitle
          ? await safeTranslate(englishTitle, lang)
          : '';
        await pool.execute(
          `INSERT INTO reports (user_id, type, title, content, lang) VALUES (?, ?, ?, ?, ?)`,
          [adminId, type, translatedTitle, translatedContent, lang]
        );
      } catch (langErr) {
        // If insert fails for one lang, save English as fallback for that lang
        console.warn(`Insert fallback for ${lang}:`, langErr.message);
        try {
          await pool.execute(
            `INSERT INTO reports (user_id, type, title, content, lang) VALUES (?, ?, ?, ?, ?)`,
            [adminId, type, englishTitle, englishText, lang]
          );
        } catch (_) {
          // ignore duplicate
        }
      }
    }
  } catch (err) {
    console.error('createContent:', err);
    // Only send error if we haven't responded yet
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: 'Failed to save content: ' + err.message });
    }
  }
};

// ── DELETE /api/content/:id ──────────────────────────────────────
const deleteContent = async (req, res) => {
  try {
    await pool.execute(
      'UPDATE reports SET is_active = FALSE WHERE report_id = ?',
      [req.params.id]
    );
    return res.json({ success: true, message: 'Content removed.' });
  } catch (err) {
    console.error('deleteContent:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/content/stats ───────────────────────────────────────
const getStats = async (req, res) => {
  try {
    const [[workers]]   = await pool.execute(
      `SELECT COUNT(*) AS n FROM user WHERE role = 'worker' AND is_active = TRUE`
    );
    const [[openRep]]   = await pool.execute(
      `SELECT COUNT(*) AS n FROM incident_report WHERE status = 'OPEN'`
    );
    const [[activeSOS]] = await pool.execute(
      `SELECT COUNT(*) AS n FROM sos_alert WHERE status = 'ACTIVE'`
    );
    const [[totalInc]]  = await pool.execute(
      `SELECT COUNT(*) AS n FROM incident_report`
    );

    return res.json({
      success: true,
      stats: {
        active_workers:  workers.n,
        open_reports:    openRep.n,
        active_sos:      activeSOS.n,
        total_incidents: totalInc.n,
      },
    });
  } catch (err) {
    console.error('getStats:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// ── GET /api/content/notifications ──────────────────────────────
const getNotifications = async (req, res) => {
  try {
    const [notifs] = await pool.execute(
      `SELECT * FROM notification
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 20`,
      [req.user.id]
    );

    await pool.execute(
      'UPDATE notification SET is_read = TRUE WHERE user_id = ?',
      [req.user.id]
    );

    return res.json({ success: true, notifications: notifs });
  } catch (err) {
    console.error('getNotifications:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = {
  getContent,
  createContent,
  deleteContent,
  getStats,
  getNotifications,
};