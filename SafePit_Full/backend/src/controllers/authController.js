// backend/src/controllers/authController.js
const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { pool } = require('../config/db');
require('dotenv').config();

// POST /api/auth/login
const login = async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ success: false, message: 'Email, password and role are required.' });

  try {
    // ✅ FIX 5 STEP 1: Check if email exists at all (any role)
    const [emailRows] = await pool.execute(
      'SELECT * FROM user WHERE email = ? AND is_active = TRUE',
      [email.trim().toLowerCase()]
    );

    // Email not found at all → unregistered_person
    if (!emailRows.length) {
      return res.status(401).json({ success: false, message: 'unregistered_person' });
    }

    // ✅ FIX 5 STEP 2: Email exists but wrong role selected
    const userWithRole = emailRows.find(u => u.role === role);
    if (!userWithRole) {
      return res.status(401).json({ success: false, message: 'unregistered_person' });
    }

    // ✅ FIX 5 STEP 3: Email + role correct, now check password
    const passwordMatch = await bcrypt.compare(password, userWithRole.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'invalid_password' });
    }

    const token = jwt.sign(
      {
        id:   userWithRole.user_id,
        email: userWithRole.email,
        name:  userWithRole.name,
        role:  userWithRole.role,
        lang:  userWithRole.preferred_lang,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const { password: _, ...safeUser } = userWithRole;
    return res.json({ success: true, token, user: safeUser });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const [rows] = await pool.execute(
      `SELECT u.user_id, u.name, u.email, u.role, u.phone_no, u.preferred_lang, u.job_role,
              s.name AS supervisor_name, s.phone_no AS supervisor_phone
       FROM user u
       LEFT JOIN user s ON u.supervisor_id = s.user_id
       WHERE u.user_id = ?`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'User not found.' });
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

// PUT /api/auth/language
const updateLanguage = async (req, res) => {
  const valid = ['English', 'Hindi', 'Tamil', 'Telugu', 'Odia'];
  const { language } = req.body;
  if (!valid.includes(language))
    return res.status(400).json({ success: false, message: 'Invalid language.' });
  try {
    await pool.execute('UPDATE user SET preferred_lang = ? WHERE user_id = ?', [language, req.user.id]);
    return res.json({ success: true, message: 'Language updated.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { login, getMe, updateLanguage };