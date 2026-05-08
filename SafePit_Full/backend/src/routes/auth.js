// src/routes/auth.js
const router = require('express').Router();
const { login, getMe, updateLanguage } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

router.post('/login',    login);
router.get('/me',        authenticate, getMe);
router.put('/language',  authenticate, updateLanguage);

module.exports = router;
