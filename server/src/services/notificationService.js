const Notification = require('../models/Notification');
const { getIo } = require('../utils/socket');

const createAndEmitNotification = async ({ recipientId, type, message, relatedComplaintId }) => {
  try {
    const notification = new Notification({
      recipientId,
      type,
      message,
      relatedComplaintId,
    });

    await notification.save();

    try {
      const io = getIo();
      io.to(`user:${recipientId}`).emit('NEW_NOTIFICATION', notification);
    } catch (socketError) {
      console.error('Socket emission failed for notification:', socketError);
    }

    return notification;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

module.exports = {
  createAndEmitNotification
};
