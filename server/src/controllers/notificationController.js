const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientId: req.user._id })
      .sort({ createdAt: -1 });

    res.status(200).json({ status: 'success', data: { notifications } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or unauthorized' });
    }

    res.status(200).json({ status: 'success', data: { notification } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ status: 'success', message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead
};
