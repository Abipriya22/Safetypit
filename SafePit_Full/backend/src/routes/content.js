// src/routes/content.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getContent, createContent, deleteContent, getStats, getNotifications,
} = require('../controllers/contentController');

router.get('/stats',         authenticate, authorize('admin','supervisor'), getStats);
router.get('/notifications', authenticate, getNotifications);
router.get('/',              authenticate, getContent);
router.post('/',             authenticate, authorize('admin'), createContent);
router.delete('/:id',        authenticate, authorize('admin'), deleteContent);

module.exports = router;
