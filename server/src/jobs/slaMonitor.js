const cron = require('node-cron');
const { Complaint } = require('../models/Complaint');
const { createAndEmitNotification } = require('../services/notificationService');

const startSlaMonitor = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const breachedComplaints = await Complaint.find({
        slaBreached: false,
        status: { $nin: ['RESOLVED', 'CLOSED'] },
        dueAt: { $lt: now }
      }).populate('clusterId');

      for (const complaint of breachedComplaints) {
        complaint.slaBreached = true;
        await complaint.save();

        const officerId = complaint.clusterId?.assignedOfficer;
        if (officerId) {
          await createAndEmitNotification({
            recipientId: officerId,
            type: 'SLA_BREACH',
            message: `Complaint ${complaint._id} breached SLA deadline.`,
            relatedComplaintId: complaint._id
          });
        }
      }
    } catch (error) {
      console.error('Error in SLA Monitor:', error);
    }
  });
};

module.exports = { startSlaMonitor };
