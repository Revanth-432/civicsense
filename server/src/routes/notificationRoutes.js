const express = require('express');
const { protect } = require('../middleware/auth');
const { getNotifications, markAsRead, markAllAsRead } = require('../controllers/notificationController');

const router = express.Router();

router.post('/test-trigger', async (req, res) => {
  const { createAndEmitNotification } = require('../services/notificationService');
  // Using a hardcoded mock ObjectId
  const mockUserId = '507f1f77bcf86cd799439011'; 
  
  await createAndEmitNotification({
    recipientId: mockUserId,
    type: 'SLA_BREACH',
    message: 'Test real-time alert for SLA breach!'
  });
  
  res.json({ success: true, message: 'Notification fired' });
});

router.use(protect);

router.route('/')
  .get(getNotifications);

router.route('/read-all')
  .patch(markAllAsRead);

router.route('/:id/read')
  .patch(markAsRead);

module.exports = router;
