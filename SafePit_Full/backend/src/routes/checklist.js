const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getMyChecklist, toggleTask, createTask,
  deleteTask, getAllTasks, getWorkersProgress,
} = require('../controllers/checklistController');

// ✅ Specific paths BEFORE /:id
router.get('/all',              authenticate, authorize('admin','supervisor'), getAllTasks);
router.get('/workers-progress', authenticate, authorize('admin','supervisor'), getWorkersProgress);
router.get('/',                 authenticate, getMyChecklist);
router.post('/',                authenticate, authorize('admin'), createTask);
router.post('/:id/complete',    authenticate, toggleTask);
router.delete('/:id',           authenticate, authorize('admin'), deleteTask);

module.exports = router;