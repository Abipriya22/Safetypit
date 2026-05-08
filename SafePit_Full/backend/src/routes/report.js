// src/routes/report.js
const router = require('express').Router();
const { create, getAll, updateStatus } = require('../controllers/reportController');
const { authenticate, authorize } = require('../middleware/auth');

router.post('/',            authenticate, create);
router.get('/',             authenticate, getAll);
router.patch('/:id/status', authenticate, authorize('supervisor', 'admin'), updateStatus);

module.exports = router;