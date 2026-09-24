const express = require('express');
const {
  getOverview,
  getCategoryBreakdown,
  getSlaCompliance,
  getModelAgreementRate,
  getHeatmapData
} = require('../controllers/analyticsController');
const { protect, restrictTo } = require('../middleware/auth');

const router = express.Router();

router.use(protect);
router.use(restrictTo('admin'));

router.get('/overview', getOverview);
router.get('/categories', getCategoryBreakdown);
router.get('/sla', getSlaCompliance);
router.get('/model-agreement', getModelAgreementRate);
router.get('/heatmap', getHeatmapData);

module.exports = router;
