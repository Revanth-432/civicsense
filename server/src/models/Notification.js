const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      'STATUS_UPDATE',
      'ANALYSIS_COMPLETE',
      'DUPLICATE_FOUND',
      'ASSIGNED',
      'SLA_BREACH',
      'CRITICAL_ISSUE'
    ],
    required: true,
  },
  relatedComplaintId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
  },
  isRead: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
