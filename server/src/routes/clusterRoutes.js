const express = require('express');
const {
  resolvePotentialDuplicate,
  mergeClusters,
  splitComplaint
} = require('../controllers/clusterController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(restrictTo('officer', 'admin'));

router.post('/resolve-duplicate', resolvePotentialDuplicate);
router.post('/merge', mergeClusters);
router.post('/split', splitComplaint);

module.exports = router;
