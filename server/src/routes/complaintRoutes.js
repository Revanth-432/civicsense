const express = require('express');
const {
  createComplaint,
  getComplaints,
  getComplaint,
  updateComplaintStatus
} = require('../controllers/complaintController');
const { protect, restrictTo } = require('../middleware/auth');
const upload = require('../middleware/upload');

const router = express.Router();

router.use(protect); // All complaint routes require auth

router.route('/')
  .post(restrictTo('citizen'), upload.single('image'), createComplaint)
  .get(getComplaints);

router.route('/:id')
  .get(getComplaint);

router.route('/:id/status')
  .patch(restrictTo('officer', 'admin'), updateComplaintStatus);

module.exports = router;
