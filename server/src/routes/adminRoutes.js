const express = require('express');
const { assignClusterManually, getPriorityQueue } = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin', 'officer'));

router.get('/priority-queue', getPriorityQueue);
router.patch('/clusters/:id/assign', assignClusterManually);

module.exports = router;
