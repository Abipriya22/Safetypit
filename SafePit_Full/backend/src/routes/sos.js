// src/routes/sos.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const { triggerSOS, getAlerts, acknowledge, resolve } = require('../controllers/sosController');

router.post('/',              authenticate, triggerSOS);
router.get('/',               authenticate, authorize('supervisor','admin'), getAlerts);
router.patch('/:id/acknowledge', authenticate, authorize('supervisor','admin'), acknowledge);
router.patch('/:id/resolve',     authenticate, authorize('supervisor','admin'), resolve);

module.exports = router;
